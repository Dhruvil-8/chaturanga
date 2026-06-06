import { create } from 'zustand';
import { Chess } from 'chess.js';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';
import { nip04 } from 'nostr-tools';
import { 
  ConnectionMode, 
  GameConfig, 
  GameTimer, 
  ChatMessage, 
  MoveData, 
  NetworkMessage
} from '../types';
import { compressBundle, decompressBundle } from '../utils/compression';

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://relay.snort.social'
];

interface InviteBundle {
  pubkey: string;
  config: GameConfig;
}

type ExtendedNetworkMessage = NetworkMessage | { type: 'join_accept' } | { type: 'host_ack' };

interface GameStore {
  // Connection states
  mode: ConnectionMode;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed';
  
  // Nostr specific state
  privateKey: Uint8Array | null;
  publicKey: string | null;
  opponentPublicKey: string | null;
  pool: SimplePool | null;
  relays: string[];
  subscription: any | null; 
  handshakeInterval: any | null;
  syncInterval: any | null;
  heartbeatInterval: any | null;
  lastOpponentHeartbeat: number;
  seenEventIds: Set<string>;

  // Game bundles
  inviteCode: string;
  decodedOfferConfig: GameConfig | null;

  // Player identity
  role: 'host' | 'joiner' | null;
  myColor: 'w' | 'b' | null;

  // Chess engine state
  chess: Chess;
  fen: string;
  turn: 'w' | 'b';
  history: MoveData[];
  captured: { white: string[]; black: string[] };

  // Game status
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason: string | null;
  gameOverReason: 'checkmate' | 'stalemate' | 'draw' | 'resign' | 'timeout' | 'disconnect' | null;
  winner: 'w' | 'b' | 'draw' | null;

  // Clocks
  timeControl: number; // in minutes
  clocks: GameTimer;
  timerActive: boolean;

  // Rematch / Tie states
  drawOfferedByMe: boolean;
  drawOfferedByOpponent: boolean;
  rematchOfferedByMe: boolean;
  rematchOfferedByOpponent: boolean;

  // Interactive logs / chat
  messages: ChatMessage[];

  // App functions
  resetStore: () => void;
  createGame: (hostColorPreference: 'w' | 'b' | 'random', timeControlMin: number) => Promise<void>;
  joinGame: (compressedOffer: string) => Promise<boolean>;
  sendNetworkMessage: (message: ExtendedNetworkMessage) => void;
  makeMove: (from: string, to: string, promotion?: string) => boolean;
  sendChatMessage: (text: string) => void;
  addSystemMessage: (text: string) => void;
  resignGame: () => void;
  proposeDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  proposeRematch: () => void;
  acceptRematch: () => void;
  handleDisconnect: () => void;
  decrementTimer: () => void;
  handleIncomingMessage: (message: ExtendedNetworkMessage, eventId: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  
  const getChessStatus = (chess: Chess) => {
    const isGameDone = chess.isGameOver();
    let winner: 'w' | 'b' | 'draw' | null = null;
    let gameOverReason: GameStore['gameOverReason'] = null;
    let drawReason: string | null = null;

    if (isGameDone) {
      if (chess.isCheckmate()) {
        winner = chess.turn() === 'w' ? 'b' : 'w';
        gameOverReason = 'checkmate';
      } else if (chess.isStalemate()) {
        winner = 'draw';
        gameOverReason = 'draw';
        drawReason = 'Stalemate';
      } else if (chess.isThreefoldRepetition()) {
        winner = 'draw';
        gameOverReason = 'draw';
        drawReason = 'Threefold Repetition';
      } else if (chess.isInsufficientMaterial()) {
        winner = 'draw';
        gameOverReason = 'draw';
        drawReason = 'Insufficient Material';
      } else if (chess.isDraw()) {
        winner = 'draw';
        gameOverReason = 'draw';
        drawReason = 'Fifty-move Rule or Claimed Draw';
      }
    }

    const initial = { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1, P: 8, R: 2, N: 2, B: 2, Q: 1, K: 1 };
    const current = { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0, P: 0, R: 0, N: 0, B: 0, Q: 0, K: 0 };

    chess.board().forEach((row) => {
      row.forEach((square) => {
        if (square) {
          const type = square.type;
          const color = square.color;
          const key = (color === 'w' ? type.toUpperCase() : type) as keyof typeof initial;
          current[key]++;
        }
      });
    });

    const capturedWhite: string[] = []; 
    const capturedBlack: string[] = []; 

    if (current.P < initial.P) capturedWhite.push(...Array(initial.P - current.P).fill('P'));
    if (current.N < initial.N) capturedWhite.push(...Array(initial.N - current.N).fill('N'));
    if (current.B < initial.B) capturedWhite.push(...Array(initial.B - current.B).fill('B'));
    if (current.R < initial.R) capturedWhite.push(...Array(initial.R - current.R).fill('R'));
    if (current.Q < initial.Q) capturedWhite.push(...Array(initial.Q - current.Q).fill('Q'));

    if (current.p < initial.p) capturedBlack.push(...Array(initial.p - current.p).fill('p'));
    if (current.n < initial.n) capturedBlack.push(...Array(initial.n - current.n).fill('n'));
    if (current.b < initial.b) capturedBlack.push(...Array(initial.b - current.b).fill('b'));
    if (current.r < initial.r) capturedBlack.push(...Array(initial.r - current.r).fill('r'));
    if (current.q < initial.q) capturedBlack.push(...Array(initial.q - current.q).fill('q'));

    return {
      fen: chess.fen(),
      turn: chess.turn(),
      isCheck: chess.inCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
      drawReason,
      winner,
      gameOverReason,
      captured: { white: capturedWhite, black: capturedBlack }
    };
  };

  const setupBackgroundSync = () => {
    const syncInterval = setInterval(async () => {
      const state = get();
      if (state.connectionStatus !== 'connected' || !state.pool || !state.privateKey || !state.opponentPublicKey) return;
      
      try {
        const events = await state.pool.querySync(state.relays, {
          kinds: [4],
          authors: [state.opponentPublicKey],
          '#p': [state.publicKey as string],
          since: Math.floor(Date.now() / 1000) - 300 // fetch last 5 minutes as a safety net
        });

        // Ensure chronological order
        events.sort((a, b) => a.created_at - b.created_at);

        for (const event of events) {
          if (!get().seenEventIds.has(event.id)) {
            const plaintext = nip04.decrypt(state.privateKey, event.pubkey, event.content);
            const message = JSON.parse(plaintext) as ExtendedNetworkMessage;
            get().handleIncomingMessage(message, event.id);
          }
        }
      } catch (e) {
        console.error('Background sync error:', e);
      }
    }, 5000);
    
    // Heartbeat check (ping every 10s, disconnect if no signal for 25s)
    set({ lastOpponentHeartbeat: Date.now() });
    
    const heartbeatInterval = setInterval(() => {
      const state = get();
      if (state.connectionStatus !== 'connected') {
        clearInterval(heartbeatInterval);
        return;
      }
      
      // Send ping to opponent
      state.sendNetworkMessage({ type: 'ping', timestamp: Date.now() });
      
      const silentTime = Date.now() - state.lastOpponentHeartbeat;
      if (silentTime > 25000) {
        console.warn(`[Nostr] Opponent heartbeat lost for ${silentTime}ms. Triggering disconnect.`);
        get().handleDisconnect();
        clearInterval(heartbeatInterval);
      }
    }, 10000);

    set({ syncInterval, heartbeatInterval });
  };

  // Wait for at least one relay to be connected before proceeding
  const warmupRelays = async (pool: SimplePool, relays: string[]): Promise<void> => {
    console.log('[Nostr] Warming up relay connections...');
    // Force connections by subscribing briefly to each relay
    const warmupSub = pool.subscribeMany(
      relays,
      { kinds: [0], limit: 1 }, // harmless metadata query
      {
        onevent() {},
        oneose() {
          console.log('[Nostr] Relay EOSE received (relay is live)');
        }
      }
    );
    // Give relays 1.5 seconds to establish WebSocket connections
    await new Promise(resolve => setTimeout(resolve, 1500));
    warmupSub.close();
    console.log('[Nostr] Relay warmup complete');
  };

  const setupSubscription = () => {
    const store = get();
    if (!store.pool || !store.publicKey) {
      console.error('[Nostr] Cannot setup subscription: pool or publicKey missing');
      return;
    }

    console.log('[Nostr] Setting up subscription for pubkey:', store.publicKey.substring(0, 12) + '...');

    const sub = store.pool.subscribeMany(
      store.relays,
      { kinds: [4], '#p': [store.publicKey] },
      {
        async onevent(event) {
          const currentState = get();
          if (!currentState.privateKey) return;
          
          if (currentState.seenEventIds.has(event.id)) return;

          console.log('[Nostr] Received event from:', event.pubkey.substring(0, 12) + '...');

          try {
            const plaintext = nip04.decrypt(currentState.privateKey, event.pubkey, event.content);
            const message = JSON.parse(plaintext) as ExtendedNetworkMessage;
            
            console.log('[Nostr] Decrypted message type:', message.type);

            // For host_ack and join_accept, we can process even if we don't have opponentPublicKey yet
            if (message.type === 'join_accept' || message.type === 'host_ack') {
              if (currentState.role === 'host' && !currentState.opponentPublicKey) {
                console.log('[Nostr] Host saving joiner pubkey:', event.pubkey.substring(0, 12) + '...');
                set({ opponentPublicKey: event.pubkey });
              }
              get().handleIncomingMessage(message, event.id);
              return;
            }

            // For gameplay messages, ensure it's from our actual opponent
            if (currentState.opponentPublicKey && event.pubkey === currentState.opponentPublicKey) {
              get().handleIncomingMessage(message, event.id);
            }
          } catch (e) {
            console.warn('[Nostr] Decrypt/process error (may be normal for foreign events):', e);
          }
        },
        oneose() {
          console.log('[Nostr] Subscription EOSE - live stream active');
        }
      }
    );

    set({ subscription: sub });
  };

  return {
    mode: 'lobby',
    connectionStatus: 'disconnected',
    privateKey: null,
    publicKey: null,
    opponentPublicKey: null,
    pool: null,
    relays: DEFAULT_RELAYS,
    subscription: null,
    handshakeInterval: null,
    syncInterval: null,
    heartbeatInterval: null,
    lastOpponentHeartbeat: 0,
    seenEventIds: new Set(),
    
    inviteCode: '',
    decodedOfferConfig: null,

    role: null,
    myColor: null,

    chess: new Chess(),
    fen: new Chess().fen(),
    turn: 'w',
    history: [],
    captured: { white: [], black: [] },

    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    drawReason: null,
    gameOverReason: null,
    winner: null,

    timeControl: 0,
    clocks: { w: 0, b: 0 },
    timerActive: false,

    drawOfferedByMe: false,
    drawOfferedByOpponent: false,
    rematchOfferedByMe: false,
    rematchOfferedByOpponent: false,

    messages: [],

    handleIncomingMessage: (message: ExtendedNetworkMessage, eventId: string) => {
      const store = get();
      
      // Prevent duplicate processing
      if (store.seenEventIds.has(eventId)) return;
      const newSeenSet = new Set(store.seenEventIds);
      newSeenSet.add(eventId);
      set({ 
        seenEventIds: newSeenSet,
        lastOpponentHeartbeat: Date.now() // Reset heartbeat timestamp on any valid opponent message
      });

      if (message.type === 'join_accept') {
        if (store.role === 'host') {
          if (store.connectionStatus !== 'connected') {
            console.log('[Nostr] Host: join_accept received, transitioning to connected');
            set({
              connectionStatus: 'connected',
              mode: 'connected',
              timerActive: store.timeControl > 0,
            });
            get().addSystemMessage(`Connection established! You are playing as ${store.myColor === 'w' ? 'White (Ivory)' : 'Black (Mahogany)'}.`);
            setupBackgroundSync();
          }
          // Always reply to join_accept with host_ack to ensure it gets through
          console.log('[Nostr] Host: sending host_ack reply...');
          get().sendNetworkMessage({ type: 'host_ack' });
        }
        return;
      }

      if (message.type === 'host_ack') {
        if (store.role === 'joiner' && store.connectionStatus !== 'connected') {
          console.log('[Nostr] Joiner: host_ack received, transitioning to connected');
          set({
            connectionStatus: 'connected',
            mode: 'connected',
            timerActive: store.timeControl > 0,
          });
          get().addSystemMessage(`Connection established! You are playing as ${store.myColor === 'w' ? 'White (Ivory)' : 'Black (Mahogany)'}.`);
          
          if (store.handshakeInterval) {
            clearInterval(store.handshakeInterval);
            set({ handshakeInterval: null });
          }
          setupBackgroundSync();
        }
        return;
      }

      switch (message.type) {
        case 'move': {
          const { from, to, promotion, clocks } = message as NetworkMessage & { type: 'move' };
          const chessCopy = new Chess(store.chess.fen());
          try {
            const moveResult = chessCopy.move({ from, to, promotion });
            if (moveResult) {
              const moveData: MoveData = {
                from, to, promotion, san: moveResult.san,
                fenBefore: store.chess.fen(), fenAfter: chessCopy.fen()
              };

              const engineStatus = getChessStatus(chessCopy);
              const updatedHistory = [...store.history, moveData];
              
              set({
                chess: chessCopy, history: updatedHistory, clocks: clocks, ...engineStatus
              });

              if (engineStatus.isCheckmate) {
                get().addSystemMessage(`Checkmate! ${engineStatus.winner === 'w' ? 'White' : 'Black'} wins.`);
              } else if (engineStatus.isStalemate) {
                get().addSystemMessage(`Draw by stalemate.`);
              } else if (engineStatus.isDraw) {
                get().addSystemMessage(`Draw: ${engineStatus.drawReason || 'Unknown cause'}.`);
              }
            }
          } catch (moveError) {
            console.error('Failed to validate synchronizing opponent move', moveError);
          }
          break;
        }
        case 'chat': {
          const msg = message as NetworkMessage & { type: 'chat' };
          set((s) => ({ 
            messages: [...s.messages, { id: Math.random().toString(36).substr(2, 9), sender: 'opponent', text: msg.text, timestamp: msg.timestamp }] 
          }));
          break;
        }
        case 'draw_offer': {
          set({ drawOfferedByOpponent: true });
          get().addSystemMessage('Opponent has offered a Draw.');
          break;
        }
        case 'draw_response': {
          const msg = message as NetworkMessage & { type: 'draw_response' };
          if (msg.accept) {
            set({ isDraw: true, winner: 'draw', gameOverReason: 'draw', drawReason: 'Agreed Draw', timerActive: false, drawOfferedByMe: false, drawOfferedByOpponent: false });
            get().addSystemMessage('Your draw offer was accepted. The match is drawn.');
          } else {
            set({ drawOfferedByMe: false });
            get().addSystemMessage('Your draw offer was declined.');
          }
          break;
        }
        case 'resign': {
          set({ gameOverReason: 'resign', winner: store.myColor, timerActive: false });
          get().addSystemMessage(`Opponent has resigned. ${store.myColor === 'w' ? 'White (You)' : 'Black (You)'} wins the game!`);
          break;
        }
        case 'rematch_offer': {
          set({ rematchOfferedByOpponent: true });
          get().addSystemMessage('Opponent proposed a rematch. Click Accept to play again!');
          break;
        }
        case 'rematch_accept': {
          const msg = message as NetworkMessage & { type: 'rematch_accept' };
          const newColor = msg.newHostColor === 'w' ? 'b' : 'w';
          const newChess = new Chess();
          
          set({
            chess: newChess, fen: newChess.fen(), turn: 'w', history: [], captured: { white: [], black: [] },
            isCheck: false, isCheckmate: false, isStalemate: false, isDraw: false, winner: null, drawReason: null,
            gameOverReason: null, myColor: newColor, clocks: { w: store.timeControl * 60, b: store.timeControl * 60 },
            timerActive: store.timeControl > 0, drawOfferedByMe: false, drawOfferedByOpponent: false, rematchOfferedByMe: false, rematchOfferedByOpponent: false,
          });
          get().addSystemMessage(`Rematch started! You are ${newColor === 'w' ? 'White' : 'Black'}.`);
          break;
        }
        case 'ping': {
          const msg = message as NetworkMessage & { type: 'ping' };
          store.sendNetworkMessage({ type: 'pong', timestamp: msg.timestamp });
          break;
        }
        default: break;
      }
    },

    resetStore: () => {
      const state = get();
      if (state.subscription) state.subscription.close();
      if (state.handshakeInterval) clearInterval(state.handshakeInterval);
      if (state.syncInterval) clearInterval(state.syncInterval);
      if (state.heartbeatInterval) clearInterval(state.heartbeatInterval);
      if (state.pool) state.pool.close(state.relays);

      set({
        mode: 'lobby', connectionStatus: 'disconnected', privateKey: null, publicKey: null,
        opponentPublicKey: null, pool: null, subscription: null, handshakeInterval: null,
        syncInterval: null, heartbeatInterval: null, lastOpponentHeartbeat: 0, seenEventIds: new Set(),
        inviteCode: '', decodedOfferConfig: null,
        role: null, myColor: null, chess: new Chess(), fen: new Chess().fen(), turn: 'w', history: [],
        captured: { white: [], black: [] }, isCheck: false, isCheckmate: false, isStalemate: false,
        isDraw: false, drawReason: null, gameOverReason: null, winner: null, timeControl: 0,
        clocks: { w: 0, b: 0 }, timerActive: false, drawOfferedByMe: false, drawOfferedByOpponent: false,
        rematchOfferedByMe: false, rematchOfferedByOpponent: false, messages: []
      });
    },

    createGame: async (hostColorPreference, timeControlMin) => {
      get().resetStore();
      
      let finalHostColor: 'w' | 'b' = hostColorPreference === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : hostColorPreference;

      const sk = generateSecretKey();
      const pk = getPublicKey(sk);
      const pool = new SimplePool();

      const config: GameConfig = { hostColor: finalHostColor, timeControl: timeControlMin };
      const inviteBundle: InviteBundle = { pubkey: pk, config: config };

      set({
        mode: 'host', role: 'host', myColor: finalHostColor, timeControl: timeControlMin,
        clocks: { w: timeControlMin * 60, b: timeControlMin * 60 }, privateKey: sk, publicKey: pk,
        pool: pool, connectionStatus: 'connecting', inviteCode: compressBundle(inviteBundle)
      });

      console.log('[Nostr] Host: warming up relays before subscribing...');
      await warmupRelays(pool, DEFAULT_RELAYS);
      setupSubscription();
      console.log('[Nostr] Host: ready and listening for joiner');
    },

    joinGame: async (compressedOffer) => {
      get().resetStore();

      const decoded = decompressBundle<InviteBundle>(compressedOffer);
      if (!decoded || !decoded.pubkey || !decoded.config) {
        get().addSystemMessage('Invalid copy-paste Code! Try decompressing again.');
        return false;
      }

      const { hostColor, timeControl } = decoded.config;
      const joinerColor: 'w' | 'b' = hostColor === 'w' ? 'b' : 'w';

      const sk = generateSecretKey();
      const pk = getPublicKey(sk);
      const pool = new SimplePool();

      set({
        mode: 'join', role: 'joiner', myColor: joinerColor, timeControl: timeControl,
        clocks: { w: timeControl * 60, b: timeControl * 60 }, privateKey: sk, publicKey: pk,
        opponentPublicKey: decoded.pubkey, pool: pool, decodedOfferConfig: decoded.config,
        connectionStatus: 'connecting'
      });

      console.log('[Nostr] Joiner: warming up relays before subscribing...');
      await warmupRelays(pool, DEFAULT_RELAYS);
      setupSubscription();
      console.log('[Nostr] Joiner: subscription active, starting handshake loop');

      // Start handshake loop: send join_accept every 2s until connected
      const sendHandshake = async () => {
        const state = get();
        if (state.connectionStatus === 'connected') return;
        console.log('[Nostr] Joiner: sending join_accept...');
        await get().sendNetworkMessage({ type: 'join_accept' });
      };

      // Fire the first one immediately
      await sendHandshake();

      const handshakeInterval = setInterval(() => {
        const state = get();
        if (state.connectionStatus === 'connected') {
          console.log('[Nostr] Joiner: connected! Stopping handshake loop.');
          clearInterval(handshakeInterval);
          set({ handshakeInterval: null });
        } else {
          sendHandshake();
        }
      }, 8000);
      
      set({ handshakeInterval });

      return true;
    },

    sendNetworkMessage: (message) => {
      const store = get();
      if (!store.pool || !store.privateKey || !store.opponentPublicKey || !store.publicKey) {
        console.warn('[Nostr] sendNetworkMessage blocked: missing', 
          !store.pool ? 'pool' : '', 
          !store.privateKey ? 'privateKey' : '',
          !store.opponentPublicKey ? 'opponentPublicKey' : '',
          !store.publicKey ? 'publicKey' : '');
        return;
      }

      try {
        const plaintext = JSON.stringify(message);
        const ciphertext = nip04.encrypt(store.privateKey, store.opponentPublicKey, plaintext);
        
        const eventTemplate = {
          kind: 4,
          created_at: Math.floor(Date.now() / 1000),
          tags: [['p', store.opponentPublicKey]],
          content: ciphertext,
        };

        const signedEvent = finalizeEvent(eventTemplate, store.privateKey);
        store.seenEventIds.add(signedEvent.id);
        
        console.log(`[Nostr] Publishing ${(message as any).type} event to ${store.relays.length} relays...`);
        
        // Fire-and-forget publish
        const promises = store.pool.publish(store.relays, signedEvent);
        promises.forEach((promise, index) => {
          promise.then(() => {
            console.log(`[Nostr] Relay ${store.relays[index]} accepted ${(message as any).type}`);
          }).catch((err) => {
            console.warn(`[Nostr] Relay ${store.relays[index]} rejected ${(message as any).type}:`, err.message || err);
          });
        });
      } catch (err) {
        console.error('[Nostr] Error sending message:', err);
      }
    },

    makeMove: (from, to, promotion) => {
      const store = get();
      if (store.winner || store.isDraw) return false;
      if (store.turn !== store.myColor) return false;

      const chessCopy = new Chess(store.chess.fen());
      try {
        const moveResult = chessCopy.move({ from, to, promotion });
        if (moveResult) {
          const moveData: MoveData = { from, to, promotion, san: moveResult.san, fenBefore: store.chess.fen(), fenAfter: chessCopy.fen() };
          const engineStatus = getChessStatus(chessCopy);
          const updatedHistory = [...store.history, moveData];
          const finalClocks = { ...store.clocks };

          set({ chess: chessCopy, history: updatedHistory, timerActive: store.timeControl > 0 && !chessCopy.isGameOver(), ...engineStatus });
          store.sendNetworkMessage({ type: 'move', from, to, promotion, clocks: finalClocks });

          if (engineStatus.isCheckmate) get().addSystemMessage(`Checkmate! You win.`);
          else if (engineStatus.isStalemate) get().addSystemMessage(`Draw by stalemate.`);
          else if (engineStatus.isDraw) get().addSystemMessage(`Draw: ${engineStatus.drawReason || 'Unknown cause'}.`);

          return true;
        }
      } catch (e) {
        console.warn('Illegal Move tried:', e);
      }
      return false;
    },

    sendChatMessage: (text) => {
      if (!text || text.trim() === '') return;
      set((s) => ({ messages: [...s.messages, { id: Math.random().toString(36).substr(2, 9), sender: 'me', text, timestamp: Date.now() }] }));
      get().sendNetworkMessage({ type: 'chat', text, timestamp: Date.now() });
    },

    addSystemMessage: (text) => {
      set((s) => ({ messages: [...s.messages, { id: Math.random().toString(36).substr(2, 9), sender: 'system', text, timestamp: Date.now() }] }));
    },

    resignGame: () => {
      const winnerColor = get().myColor === 'w' ? 'b' : 'w';
      set({ isDraw: false, gameOverReason: 'resign', winner: winnerColor, timerActive: false });
      get().addSystemMessage(`You resigned. Opponent wins.`);
      get().sendNetworkMessage({ type: 'resign' });
    },

    proposeDraw: () => {
      set({ drawOfferedByMe: true });
      get().addSystemMessage('You proposed a draw to your opponent.');
      get().sendNetworkMessage({ type: 'draw_offer' });
    },

    acceptDraw: () => {
      set({ isDraw: true, winner: 'draw', gameOverReason: 'draw', drawReason: 'Agreed Draw', timerActive: false, drawOfferedByMe: false, drawOfferedByOpponent: false });
      get().addSystemMessage('You accepted the draw offer. The match is drawn.');
      get().sendNetworkMessage({ type: 'draw_response', accept: true });
    },

    declineDraw: () => {
      set({ drawOfferedByOpponent: false });
      get().addSystemMessage('You declined the draw offer.');
      get().sendNetworkMessage({ type: 'draw_response', accept: false });
    },

    proposeRematch: () => {
      set({ rematchOfferedByMe: true });
      get().addSystemMessage('You proposed a rematch.');
      get().sendNetworkMessage({ type: 'rematch_offer' });
    },

    acceptRematch: () => {
      const store = get();
      const nextHostColor: 'w' | 'b' = Math.random() < 0.5 ? 'w' : 'b';
      const myNewColorState = nextHostColor === 'w' ? 'b' : 'w'; 
      const newChess = new Chess();
      set({
        chess: newChess, fen: newChess.fen(), turn: 'w', history: [], captured: { white: [], black: [] },
        isCheck: false, isCheckmate: false, isStalemate: false, isDraw: false, winner: null, drawReason: null,
        gameOverReason: null, myColor: myNewColorState, clocks: { w: store.timeControl * 60, b: store.timeControl * 60 },
        timerActive: store.timeControl > 0, drawOfferedByMe: false, drawOfferedByOpponent: false, rematchOfferedByMe: false, rematchOfferedByOpponent: false,
      });
      get().addSystemMessage(`Rematch started! You are ${myNewColorState === 'w' ? 'White' : 'Black'}.`);
      store.sendNetworkMessage({ type: 'rematch_accept', newHostColor: nextHostColor });
    },

    handleDisconnect: () => {
      const state = get();
      if (state.mode === 'connected' || state.connectionStatus === 'connected') {
        set({ mode: 'disconnected', connectionStatus: 'failed', timerActive: false });
        get().addSystemMessage('Peer disconnected. Match abandoned.');
      }
    },

    decrementTimer: () => {
      const store = get();
      if (!store.timerActive || store.gameOverReason || store.isDraw) return;
      const activeColor = store.turn;
      const currentClocks = { ...store.clocks };

      if (activeColor === 'w') currentClocks.w = Math.max(0, currentClocks.w - 1);
      else currentClocks.b = Math.max(0, currentClocks.b - 1);

      set({ clocks: currentClocks });

      if (currentClocks[activeColor] === 0) {
        const timeoutWinner = activeColor === 'w' ? 'b' : 'w';
        set({ gameOverReason: 'timeout', winner: timeoutWinner, timerActive: false });
        get().addSystemMessage(`${activeColor === 'w' ? 'White (Ivory)' : 'Black (Mahogany)'} ran out of time! ${timeoutWinner === 'w' ? 'White' : 'Black'} wins.`);
      }
    }
  };
});
