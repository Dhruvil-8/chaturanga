import { useState, useEffect, useRef, FormEvent } from 'react';
import { Chessboard } from 'react-chessboard';
import { useGameStore } from '../store/gameStore';
import { 
  Send, 
  Flag, 
  RefreshCcw, 
  Compass, 
  Clock, 
  Home, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';
import { 
  playMoveSound, 
  playCaptureSound, 
  playCheckSound, 
  playGameOverSound 
} from '../utils/audio';

export default function ChessGame() {
  const {
    chess,
    fen,
    turn,
    myColor,
    history,
    captured,
    isCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    drawReason,
    gameOverReason,
    winner,
    timeControl,
    clocks,
    timerActive,
    drawOfferedByMe,
    drawOfferedByOpponent,
    rematchOfferedByMe,
    rematchOfferedByOpponent,
    messages,
    makeMove,
    sendChatMessage,
    resignGame,
    proposeDraw,
    acceptDraw,
    declineDraw,
    proposeRematch,
    acceptRematch,
    resetStore,
    decrementTimer,
    mode
  } = useGameStore();

  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(480);

  // States for interactive gameplay highlights and promotion
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Trigger audio feedback on moves and game status changes
  const prevHistoryLength = useRef(history.length);
  const prevGameOver = useRef(!!gameOverReason || isDraw);

  useEffect(() => {
    if (history.length > prevHistoryLength.current) {
      const lastMove = history[history.length - 1];
      if (isCheck) {
        playCheckSound();
      } else {
        const isCapture = lastMove.san.includes('x');
        if (isCapture) {
          playCaptureSound();
        } else {
          playMoveSound();
        }
      }
    }
    prevHistoryLength.current = history.length;
  }, [history.length, isCheck]);

  useEffect(() => {
    const isOver = !!gameOverReason || isDraw;
    if (isOver && !prevGameOver.current) {
      const amIWinner = winner === myColor;
      const isTie = winner === 'draw' || isDraw;
      playGameOverSound(amIWinner || isTie);
    }
    prevGameOver.current = isOver;
  }, [gameOverReason, isDraw, winner, myColor]);

  // Dynamic board width calculation for absolute responsiveness across screens
  useEffect(() => {
    const handleResize = () => {
      const parentWidth = window.innerWidth;
      let calculated = 520;

      if (parentWidth < 480) {
        calculated = parentWidth - 32;
      } else if (parentWidth < 768) {
        calculated = 420;
      } else if (parentWidth < 1024) {
        calculated = 480;
      } else {
        calculated = 520;
      }
      setBoardWidth(calculated);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync clocks via local counts
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (timerActive && !gameOverReason && !isDraw) {
      intervalId = setInterval(() => {
        decrementTimer();
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timerActive, gameOverReason, isDraw, decrementTimer]);

  // Prevent accidental page refreshes during active gameplay
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!gameOverReason && !isDraw && mode === 'connected') {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your active P2P chess match will be lost.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameOverReason, isDraw, mode]);

  // Scroll chat block to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Chessboard move drop handler
  const handlePieceDrop = (sourceSquare: string, targetSquare: string) => {
    const isPawn = chess.get(sourceSquare as any)?.type === 'p';
    const isCorrectRank = 
      (myColor === 'w' && sourceSquare[1] === '7' && targetSquare[1] === '8') ||
      (myColor === 'b' && sourceSquare[1] === '2' && targetSquare[1] === '1');
    
    // Check if the move is in the list of legal moves
    const moves = chess.moves({ square: sourceSquare as any, verbose: true }) as any[];
    const isLegal = moves.some(m => m.to === targetSquare);

    const isPromotion = isPawn && isCorrectRank && isLegal;

    if (isPromotion) {
      setPromotionPending({ from: sourceSquare, to: targetSquare });
      return true;
    }

    const success = makeMove(sourceSquare, targetSquare);
    return success;
  };

  const handleSquareClick = ({ square }: { square: string }) => {
    if (turn !== myColor || gameOverReason || isDraw) return;
    
    // If clicking already selected square, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }
    
    // If we have a selected square, check if clicking a target is a legal move
    if (selectedSquare) {
      const moves = chess.moves({ square: selectedSquare as any, verbose: true }) as any[];
      const isLegal = moves.some(m => m.to === square);
      
      if (isLegal) {
        handlePieceDrop(selectedSquare, square);
        setSelectedSquare(null);
        return;
      }
    }
    
    // Select square if it has our piece
    const piece = chess.get(square as any);
    if (piece && piece.color === myColor) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePieceDragBegin = (piece: string, sourceSquare: string) => {
    if (turn === myColor && !gameOverReason && !isDraw) {
      setSelectedSquare(sourceSquare);
    }
  };

  const handlePieceDragEnd = () => {
    setSelectedSquare(null);
  };

  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const formatTimer = (seconds: number) => {
    if (timeControl === 0) return '∞';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Advantage calculation of captured pieces
  const pieceWeights: Record<string, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9,
    P: 1, N: 3, B: 3, R: 5, Q: 9
  };

  const totalWhiteCapturedVal = captured.white.reduce((acc, p) => acc + (pieceWeights[p] || 0), 0);
  const totalBlackCapturedVal = captured.black.reduce((acc, p) => acc + (pieceWeights[p] || 0), 0);
  
  const absoluteAdvantage = totalBlackCapturedVal - totalWhiteCapturedVal; // If positive, White is up.

  // Helper arrays for grouping move history pairs
  const movePairs: [number, string, string | null][] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push([
      Math.floor(i / 2) + 1,
      history[i].san,
      history[i + 1] ? history[i + 1].san : null
    ]);
  }

  // Build custom square styles dynamically for game assists (last move, check, legal moves)
  const lastMove = history.length > 0 ? history[history.length - 1] : null;
  const customSquareStyles: Record<string, any> = {};

  if (lastMove) {
    customSquareStyles[lastMove.from] = {
      backgroundColor: 'rgba(212, 175, 55, 0.25)',
    };
    customSquareStyles[lastMove.to] = {
      backgroundColor: 'rgba(212, 175, 55, 0.35)',
    };
  }

  if (isCheck && !gameOverReason && !isDraw) {
    let kingSquare = '';
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const file = String.fromCharCode(97 + c);
          const rank = 8 - r;
          kingSquare = `${file}${rank}`;
          break;
        }
      }
      if (kingSquare) break;
    }
    if (kingSquare) {
      customSquareStyles[kingSquare] = {
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, rgba(239, 68, 68, 0.1) 70%)',
        borderRadius: '50%'
      };
    }
  }

  if (selectedSquare) {
    const moves = chess.moves({ square: selectedSquare as any, verbose: true }) as any[];
    moves.forEach((move) => {
      customSquareStyles[move.to] = {
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.4) 20%, transparent 25%)',
        borderRadius: '50%'
      };
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* peer disconnected overlay state */}
      {mode === 'disconnected' && (
        <div className="fixed inset-0 bg-chatur-dark/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-chatur-pane border border-chatur-sandal/20 max-w-md w-full rounded-2xl p-6 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-2xl font-bold text-chatur-ivory">Connection Lost</h3>
              <p className="text-sm text-chatur-sandal/70 leading-relaxed">
                The direct peer-to-peer Nostr relays connection has timed out. The opponent may have closed the tab, lost internet connectivity, or disconnected.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={resetStore}
                className="flex items-center justify-center gap-2 py-3 bg-chatur-charcoal border border-chatur-sandal/20 rounded-xl text-xs font-semibold text-chatur-sandal hover:border-chatur-gold hover:text-chatur-ivory transition"
              >
                <Home className="w-4 h-4" />
                Return Home
              </button>
              <button
                onClick={() => {
                  useGameStore.getState().createGame('random', 10);
                }}
                className="flex items-center justify-center gap-2 py-3 bg-chatur-gold text-chatur-dark rounded-xl text-xs font-bold hover:bg-chatur-gold-light transition"
              >
                <RefreshCcw className="w-4 h-4" />
                New Match Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Game Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column: Board & Captures */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* Opponent Card Info */}
          <div className="w-full max-w-[520px] flex items-center justify-between py-2.5 px-4 bg-chatur-pane/60 border border-chatur-sandal/10 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full border border-chatur-sandal/20 flex items-center justify-center ${myColor === 'w' ? 'bg-chatur-charcoal' : 'bg-chatur-ivory'}`}>
                <span className={`w-3.5 h-3.5 rounded-sm ${myColor === 'w' ? 'bg-chatur-charcoal' : 'bg-chatur-ivory'}`} />
              </div>
              <div>
                <div className="font-serif text-xs font-bold text-chatur-ivory">
                  Opponent {myColor === 'w' ? '(Mahogany/Black)' : '(Ivory/White)'}
                </div>
                {/* Captured indicators by opponent */}
                <div className="flex items-center gap-1 mt-0.5 max-w-[200px] overflow-x-auto">
                  {myColor === 'w' ? (
                    // Opponent is Black, has captured White pieces (uppercase)
                    captured.white.map((p, idx) => (
                      <span key={idx} className="w-4 h-4 text-[9px] font-bold rounded-full bg-chatur-ivory text-chatur-dark border border-chatur-sandal/20 flex items-center justify-center shrink-0">
                        {p}
                      </span>
                    ))
                  ) : (
                    // Opponent is White, has captured Black pieces (lowercase)
                    captured.black.map((p, idx) => (
                      <span key={idx} className="w-4 h-4 text-[9px] font-bold rounded-full bg-chatur-charcoal text-chatur-ivory border border-chatur-sandal/20 flex items-center justify-center shrink-0">
                        {p.toUpperCase()}
                      </span>
                    ))
                  )}
                  {/* Advantage Score */}
                  {absoluteAdvantage !== 0 && (
                    <span className="text-[10px] text-chatur-sandal/40 font-mono font-bold pl-1 shrink-0">
                      {myColor === 'w' 
                        ? (absoluteAdvantage < 0 ? `+${Math.abs(absoluteAdvantage)}` : '') 
                        : (absoluteAdvantage > 0 ? `+${absoluteAdvantage}` : '')
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Timer Opponent */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono tracking-wider ${
              turn !== myColor 
                ? 'bg-chatur-gold/10 border-chatur-gold text-chatur-gold ring-1 ring-chatur-gold/30 animate-pulse'
                : 'bg-chatur-charcoal border-chatur-sandal/10 text-chatur-sandal/60'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="text-sm font-semibold">
                {myColor === 'w' ? formatTimer(clocks.b) : formatTimer(clocks.w)}
              </span>
            </div>
          </div>

          {/* Board Container */}
          <div className="relative w-full bg-chatur-charcoal p-1.5 border-x border-chatur-sandal/10" style={{ maxWidth: boardWidth }}>
            <Chessboard
              options={{
                position: fen,
                onPieceDrop: ({ sourceSquare, targetSquare }) => {
                  if (!targetSquare) return false;
                  return handlePieceDrop(sourceSquare, targetSquare);
                },
                onSquareClick: handleSquareClick,
                onPieceDragBegin: handlePieceDragBegin,
                onPieceDragEnd: handlePieceDragEnd,
                customSquareStyles,
                boardOrientation: myColor === 'w' ? 'white' : 'black',
                darkSquareStyle: { backgroundColor: '#5a3c25' },
                lightSquareStyle: { backgroundColor: '#fcfaf2' },
                boardStyle: {
                  borderRadius: '4px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                },
                allowDragging: turn === myColor && !gameOverReason && !isDraw
              }}
            />

            {/* Promotion Modal Overlay */}
            {promotionPending && (
              <div className="absolute inset-0 bg-chatur-dark/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <span className="text-xs font-mono tracking-widest text-chatur-gold uppercase font-bold mb-3">
                  Select Promotion Rank
                </span>
                <div className="grid grid-cols-4 gap-3 max-w-[280px]">
                  {[
                    { type: 'q', label: 'Queen' },
                    { type: 'r', label: 'Rook' },
                    { type: 'b', label: 'Bishop' },
                    { type: 'n', label: 'Knight' }
                  ].map((option) => (
                    <button
                      key={option.type}
                      onClick={() => {
                        makeMove(promotionPending.from, promotionPending.to, option.type);
                        setPromotionPending(null);
                      }}
                      className="flex flex-col items-center gap-1.5 p-3.5 bg-chatur-pane border border-chatur-sandal/20 hover:border-chatur-gold rounded-xl group transition duration-300"
                    >
                      <span className="text-3xl text-chatur-ivory group-hover:text-chatur-gold group-hover:scale-110 transition duration-300">
                        {myColor === 'w' 
                          ? (option.type === 'q' ? '♕' : option.type === 'r' ? '♖' : option.type === 'b' ? '♗' : '♘')
                          : (option.type === 'q' ? '♛' : option.type === 'r' ? '♜' : option.type === 'b' ? '♝' : '♞')
                        }
                      </span>
                      <span className="text-[9px] font-mono tracking-wider font-bold text-chatur-sandal/70 group-hover:text-chatur-ivory">
                        {option.label.toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPromotionPending(null)}
                  className="mt-6 px-4 py-1.5 border border-rose-500/20 text-rose-400 text-[10px] font-mono tracking-wider font-bold rounded-lg hover:bg-rose-500/10 transition"
                >
                  CANCEL MOVE
                </button>
              </div>
            )}

            {/* GameOver Overlay */}
            {(gameOverReason || isDraw) && (
              <div className="absolute inset-0 bg-chatur-dark/85 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <span className="text-xs font-mono tracking-widest text-chatur-gold uppercase font-bold mb-1">
                  Matritva Complete
                </span>
                <h3 className="font-serif text-3xl font-extrabold text-chatur-ivory mb-2">
                  {winner === 'draw' ? 'Draw Match' : `${winner === myColor ? 'Victory!' : 'Defeat'}`}
                </h3>
                <p className="text-xs text-chatur-sandal/70 mb-6 max-w-xs leading-relaxed">
                  {gameOverReason === 'checkmate' && `Resolved by full Checkmate on the field.`}
                  {gameOverReason === 'stalemate' && `Resolved by complete stalemated board.`}
                  {gameOverReason === 'draw' && `Resolved via: ${drawReason || 'Agreed tie'}.`}
                  {gameOverReason === 'resign' && `${winner === myColor ? 'Opponent submitted resignation.' : 'You yielded and resigned the field.'}`}
                  {gameOverReason === 'timeout' && `Resolved by critical clock expiration.`}
                </p>

                <div className="flex flex-col gap-2.5 w-full max-w-[240px]">
                  {/* Rematch trigger flow */}
                  {rematchOfferedByOpponent && !rematchOfferedByMe && (
                    <button
                      onClick={acceptRematch}
                      className="w-full py-2.5 bg-chatur-gold text-chatur-dark text-xs font-bold rounded-lg hover:bg-chatur-gold-light transition duration-300"
                    >
                      Accept Rematch Proposal
                    </button>
                  )}
                  
                  {!rematchOfferedByMe && !rematchOfferedByOpponent && (
                    <button
                      onClick={proposeRematch}
                      className="w-full py-2.5 bg-gradient-to-r from-chatur-gold to-[#bfa032] text-chatur-dark text-xs font-bold rounded-lg hover:shadow-lg hover:shadow-chatur-gold/20 transition duration-300"
                    >
                      Propose Rematch
                    </button>
                  )}

                  {rematchOfferedByMe && !rematchOfferedByOpponent && (
                    <div className="text-[10px] text-chatur-sandal/50 font-mono py-2 bg-chatur-charcoal/50 border border-chatur-sandal/10 rounded-lg">
                      SENT REMATCH REQUEST...
                    </div>
                  )}

                  <button
                    onClick={resetStore}
                    className="w-full py-2.5 border border-chatur-sandal/20 text-chatur-sandal text-xs font-semibold rounded-lg hover:bg-chatur-charcoal hover:text-chatur-ivory transition"
                  >
                    Lobby Room
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Self Player Card Info */}
          <div className="w-full max-w-[520px] flex items-center justify-between py-2.5 px-4 bg-chatur-pane border border-chatur-sandal/10 rounded-b-xl shadow-md">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full border border-chatur-sandal/20 flex items-center justify-center ${myColor === 'w' ? 'bg-chatur-ivory' : 'bg-chatur-charcoal'}`}>
                <span className={`w-3.5 h-3.5 rounded-sm ${myColor === 'w' ? 'bg-chatur-ivory' : 'bg-chatur-charcoal'}`} />
              </div>
              <div>
                <div className="font-serif text-xs font-bold text-chatur-ivory">
                  You {myColor === 'w' ? '(Ivory/White)' : '(Mahogany/Black)'}
                </div>
                {/* Captured indicators by player */}
                <div className="flex items-center gap-1 mt-0.5 max-w-[200px] overflow-x-auto">
                  {myColor === 'w' ? (
                    // I am White, have captured Black pieces (lowercase)
                    captured.black.map((p, idx) => (
                      <span key={idx} className="w-4 h-4 text-[9px] font-bold rounded-full bg-chatur-charcoal text-chatur-ivory border border-chatur-sandal/50 flex items-center justify-center shrink-0">
                        {p.toUpperCase()}
                      </span>
                    ))
                  ) : (
                    // I am Black, have captured White pieces (uppercase)
                    captured.white.map((p, idx) => (
                      <span key={idx} className="w-4 h-4 text-[9px] font-bold rounded-full bg-chatur-ivory text-chatur-dark border border-chatur-sandal/20 flex items-center justify-center shrink-0">
                        {p}
                      </span>
                    ))
                  )}
                  {/* Advantage Score */}
                  {absoluteAdvantage !== 0 && (
                    <span className="text-[10px] text-chatur-gold font-mono font-bold pl-1 shrink-0">
                      {myColor === 'w' 
                        ? (absoluteAdvantage > 0 ? `+${absoluteAdvantage}` : '') 
                        : (absoluteAdvantage < 0 ? `+${Math.abs(absoluteAdvantage)}` : '')
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Timer Player */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono tracking-wider ${
              turn === myColor 
                ? 'bg-chatur-gold/15 border-chatur-gold text-chatur-gold ring-1 ring-chatur-gold/30'
                : 'bg-chatur-charcoal border-chatur-sandal/10 text-chatur-sandal/60'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="text-sm font-semibold">
                {myColor === 'w' ? formatTimer(clocks.w) : formatTimer(clocks.b)}
              </span>
            </div>
          </div>
          
          {/* FEN metadata banner */}
          {isCheck && !gameOverReason && (
            <div className="w-full max-w-[520px] mt-4 px-4 py-2 bg-rose-950/40 border border-rose-500/20 text-rose-400 text-xs font-mono font-semibold rounded-lg text-center animate-bounce">
              ⚠️ KING UNDER ROYAL CHECK
            </div>
          )}
        </div>

        {/* Right column: Game Logs, controls & Chat */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Game Controls Panel */}
          <div className="bg-chatur-pane border border-chatur-sandal/10 rounded-2xl p-4 sm:p-5 shadow-lg">
            <h4 className="font-serif text-sm font-bold text-chatur-gold tracking-wide uppercase mb-3.5">
              Command Pavilion
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={proposeDraw}
                disabled={drawOfferedByMe || isDraw || !!gameOverReason}
                className="flex items-center justify-center gap-2 py-2.5 bg-chatur-charcoal border border-chatur-sandal/25 text-chatur-sandal font-semibold text-xs rounded-xl hover:border-chatur-gold hover:text-chatur-ivory transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCcw className="w-3.5 h-3.5 text-chatur-sandal" />
                {drawOfferedByMe ? 'Draw Offered' : 'Propose Draw'}
              </button>

              <button
                onClick={resignGame}
                disabled={isDraw || !!gameOverReason}
                className="flex items-center justify-center gap-2 py-2.5 bg-rose-950/20 border border-rose-500/20 text-rose-400 font-semibold text-xs rounded-xl hover:bg-rose-500/10 hover:border-rose-500/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Flag className="w-3.5 h-3.5" />
                Resign Battle
              </button>
            </div>

            {/* Tie / Draw Offer Decision overlays */}
            {drawOfferedByOpponent && (
              <div className="mt-4 p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2.5">
                <p className="text-xs text-amber-300 font-serif leading-normal text-center">
                  Opponent has proposed a Peaceful Draw. Will you accept standard terms?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={acceptDraw}
                    className="flex-1 py-1.5 bg-amber-500 text-chatur-dark font-bold text-xs rounded-lg hover:bg-amber-400 transition"
                  >
                    Accept
                  </button>
                  <button
                    onClick={declineDraw}
                    className="flex-1 py-1.5 border border-amber-500/30 text-amber-300 text-xs rounded-lg hover:bg-chatur-charcoal transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {/* Abandon Game Button */}
            <button
              onClick={resetStore}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2 bg-chatur-charcoal/40 border border-chatur-sandal/10 hover:border-rose-500/30 font-semibold text-chatur-sandal/60 hover:text-rose-400 text-xs rounded-xl transition"
            >
              <Home className="w-3.5 h-3.5" />
              Abandon Match & Lobby
            </button>
          </div>

          {/* Move History Panel list */}
          <div className="bg-chatur-pane border border-chatur-sandal/10 rounded-2xl p-4 sm:p-5 shadow-lg">
            <h4 className="font-serif text-sm font-bold text-chatur-gold tracking-wide uppercase mb-3 border-b border-chatur-sandal/10 pb-1.5">
              Battle Log (Moves)
            </h4>

            {movePairs.length === 0 ? (
              <div className="text-center py-6 text-xs text-chatur-sandal/30 font-mono italic">
                Awaiting first deployment...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-[140px] overflow-y-auto pr-1 text-xs font-mono">
                {movePairs.map(([no, wMove, bMove]) => (
                  <div key={no} className="flex justify-between items-center bg-chatur-charcoal/20 px-2.5 py-1 rounded border border-chatur-sandal/5">
                    <span className="text-chatur-sandal/40">{no}.</span>
                    <span className="font-bold text-chatur-ivory flex-1 pl-2 text-left">{wMove}</span>
                    {bMove ? (
                      <span className="font-bold text-chatur-sandal/80 flex-1 text-right">{bMove}</span>
                    ) : (
                      <span className="text-chatur-sandal/20 text-right">...</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Messenger Panel */}
          <div className="bg-chatur-pane border border-chatur-sandal/10 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col h-[300px]">
            <h4 className="font-serif text-sm font-bold text-chatur-gold tracking-wide uppercase mb-2">
              Messenger (Chat)
            </h4>

            {/* Messages box list */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10/12] text-chatur-sandal/30 italic font-mono text-center">
                  No scroll scrolls written. Send your peer a private greeting message.
                </div>
              ) : (
                messages.map((m) => {
                  if (m.sender === 'system') {
                    return (
                      <div key={m.id} className="text-center py-1 bg-chatur-charcoal/40 border-y border-chatur-sandal/5 text-[10px] text-chatur-sandal/60 font-mono tracking-wide">
                        [📜] {m.text}
                      </div>
                    );
                  }

                  const isMe = m.sender === 'me';
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-xl p-2 px-3 text-xs leading-normal ${
                        isMe
                          ? 'bg-chatur-gold text-chatur-dark font-semibold rounded-tr-none'
                          : 'bg-chatur-charcoal border border-chatur-sandal/15 text-chatur-ivory rounded-tl-none'
                      }`}>
                        <p>{m.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="flex gap-2 mt-auto">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send secure direct scroll..."
                className="flex-1 bg-chatur-charcoal border border-chatur-sandal/20 text-chatur-ivory text-xs rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-chatur-gold font-sans"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-chatur-gold hover:bg-chatur-gold-light text-chatur-dark px-3 rounded-lg flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
