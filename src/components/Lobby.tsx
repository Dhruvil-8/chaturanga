import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Play, 
  UserPlus, 
  HelpCircle, 
  Copy, 
  Check, 
  QrCode, 
  ArrowRight, 
  RefreshCw, 
  Clock, 
  Compass
} from 'lucide-react';
import GameManual from './GameManual';

export default function Lobby() {
  const {
    mode,
    createGame,
    joinGame,
    inviteCode,
    connectionStatus,
    resetStore,
    decodedOfferConfig,
    myColor
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'how'>('create');
  
  const [selectedColor, setSelectedColor] = useState<'w' | 'b' | 'random'>('random');
  const [selectedTime, setSelectedTime] = useState<number>(10);

  const [copiedOffer, setCopiedOffer] = useState(false);
  const [joinInputCode, setJoinInputCode] = useState('');
  const [invalidCodeError, setInvalidCodeError] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const offerParam = searchParams.get('offer');
    if (offerParam) {
      console.log('Detected offer query parameter, initializing auto-join...');
      joinGame(offerParam).then((success) => {
        if (!success) {
          setInvalidCodeError(true);
        }
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [joinGame]);

  const handleCopyOffer = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?offer=${inviteCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedOffer(true);
    setTimeout(() => setCopiedOffer(false), 2000);
  };

  const handleCreateMatch = () => {
    createGame(selectedColor, selectedTime);
  };

  const handleJoinMatchSubmit = async () => {
    if (!joinInputCode.trim()) return;
    setInvalidCodeError(false);
    
    let cleanCode = joinInputCode.trim();
    if (cleanCode.includes('?offer=')) {
      try {
        const urlObj = new URL(cleanCode);
        const codeParam = urlObj.searchParams.get('offer');
        if (codeParam) cleanCode = codeParam;
      } catch (err) {
        console.warn('Failed to parse pasted code as URL, falling back to literal text', err);
      }
    }

    const success = await joinGame(cleanCode);
    if (!success) {
      setInvalidCodeError(true);
    }
  };

  const getShareableUrl = () => {
    return `${window.location.origin}${window.location.pathname}?offer=${inviteCode}`;
  };

  if (mode === 'host') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-chatur-pane border border-chatur-sandal/10 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-chatur-gold to-transparent opacity-60" />
          
          <h2 className="font-serif text-2xl font-bold text-chatur-ivory mb-2 flex items-center justify-between">
            <span>Match Established</span>
            <span className="text-xs font-mono font-normal tracking-wider px-2 py-0.5 rounded bg-chatur-charcoal border border-chatur-sandal/20 text-chatur-gold uppercase">
              Host
            </span>
          </h2>
          <p className="text-xs text-chatur-sandal/60 mb-6">
            Time limit: {selectedTime === 0 ? 'Infinite' : `${selectedTime} minutes`}. Play as: {myColor === 'w' ? 'Ivory (White)' : 'Mahogany (Black)'}.
          </p>

          <div className="space-y-6">
            <div className="bg-chatur-dark/50 border border-chatur-sandal/15 rounded-xl p-4 sm:p-5">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-chatur-gold flex items-center gap-1.5 mb-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-chatur-gold animate-bounce" />
                Awaiting Opponent...
              </span>
              <p className="text-xs text-chatur-sandal/80 leading-relaxed mb-4">
                Share this secure handshake code with your opponent. They can copy the link or scan the custom QR code below to connect instantly.
              </p>

              {!inviteCode ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 bg-chatur-charcoal/40 rounded-lg border border-chatur-sandal/10">
                  <RefreshCw className="w-6 h-6 text-chatur-gold animate-spin" />
                  <p className="text-xs text-chatur-sandal/80 font-serif">Generating Nostr credentials...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleCopyOffer}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-chatur-gold text-chatur-dark text-xs sm:text-sm font-bold rounded-lg hover:bg-chatur-gold-light transition duration-300"
                    >
                      {copiedOffer ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedOffer ? 'Copied Secure Link!' : 'Copy Invitation Link'}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-chatur-charcoal/50 rounded-lg border border-chatur-sandal/10 justify-center">
                    <div className="bg-white p-2.5 rounded-lg shadow-inner">
                      <QRCodeSVG 
                        value={getShareableUrl()} 
                        size={120}
                        bgColor="#FFFFFF"
                        fgColor="#120d09"
                        level="L"
                        includeMargin={false}
                      />
                    </div>
                    <div className="text-center sm:text-left space-y-1 max-w-[240px]">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-chatur-gold text-xs font-semibold">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Instant QR Handoff</span>
                      </div>
                      <p className="text-[10px] text-chatur-sandal/60 leading-relaxed">
                        Have your opponent scan this with their phone's camera. It opens the page and connects automatically via secure Nostr relays.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={resetStore}
              className="w-full px-4 py-2 border border-chatur-sandal/30 text-chatur-sandal/80 font-bold text-xs rounded-lg hover:bg-chatur-charcoal transition"
            >
              Cancel Match
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-chatur-pane border border-chatur-sandal/10 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-chatur-gold to-transparent opacity-60" />

          <h2 className="font-serif text-2xl font-bold text-chatur-ivory mb-2 flex items-center justify-between">
            <span>Connecting via Nostr</span>
            <span className="text-xs font-mono font-normal tracking-wider px-2 py-0.5 rounded bg-chatur-charcoal border border-chatur-sandal/20 text-chatur-gold uppercase">
              Joiner
            </span>
          </h2>

          {decodedOfferConfig && (
            <div className="mb-6 px-4 py-3 bg-chatur-charcoal/60 border border-chatur-sandal/10 rounded-xl flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-chatur-gold" />
                <span className="text-chatur-sandal">TIME:</span>
                <strong className="text-chatur-ivory">
                  {decodedOfferConfig.timeControl === 0 ? 'Untimed (Casual)' : `${decodedOfferConfig.timeControl} minutes`}
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-chatur-gold" />
                <span className="text-chatur-sandal">YOUR COLOR:</span>
                <strong className="text-chatur-ivory">
                  {decodedOfferConfig.hostColor === 'w' ? 'Mahogany (Black)' : 'Ivory (White)'}
                </strong>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-chatur-dark/30 border border-chatur-sandal/10 rounded-xl p-4 text-center">
              <div className="flex justify-center mb-4">
                 <RefreshCw className="w-8 h-8 text-chatur-gold animate-spin" />
              </div>
              <span className="inline-block px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-amber-400 text-[10px] font-mono mb-2 animate-pulse">
                NEGOTIATING RELAY HANDSHAKE
              </span>
              <p className="text-xs text-chatur-sandal/60 leading-normal max-w-sm mx-auto">
                Securely connecting to your opponent... The game will start automatically once the connection is established.
              </p>

              <button
                onClick={resetStore}
                className="mt-4 px-5 py-1.5 border border-chatur-sandal/20 text-chatur-sandal/70 hover:text-chatur-ivory rounded-lg text-xs hover:bg-chatur-charcoal transition duration-300"
              >
                Abort & Return Lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-10">
        <h2 className="font-serif text-3xl sm:text-5xl font-extrabold text-chatur-ivory tracking-wide mb-3">
          Ancient Chess
        </h2>
        <p className="text-sm sm:text-base text-chatur-sandal/75 max-w-xl mx-auto leading-relaxed">
          Experience direct peer-on-peer play with zero middleman servers. Completely private, decentralized gameplay over Nostr relays!
        </p>
      </div>

      <div className="flex border-b border-chatur-sandal/10 max-w-md mx-auto mb-8 bg-chatur-pane/40 p-1.5 rounded-xl border">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition duration-200 ${
            activeTab === 'create'
              ? 'bg-chatur-charcoal text-chatur-gold border border-chatur-gold/20 shadow-sm'
              : 'text-chatur-sandal/60 hover:text-chatur-ivory'
          }`}
        >
          <Play className="w-4 h-4" />
          Create Game
        </button>
        <button
          onClick={() => setActiveTab('join')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition duration-200 ${
            activeTab === 'join'
              ? 'bg-chatur-charcoal text-chatur-gold border border-chatur-gold/20 shadow-sm'
              : 'text-chatur-sandal/60 hover:text-chatur-ivory'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Join Game
        </button>
        <button
          onClick={() => setActiveTab('how')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition duration-200 ${
            activeTab === 'how'
              ? 'bg-chatur-charcoal text-chatur-gold border border-chatur-gold/20 shadow-sm'
              : 'text-chatur-sandal/60 hover:text-chatur-ivory'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          How It Works
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="bg-chatur-pane border border-chatur-sandal/10 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-chatur-gold to-transparent opacity-60" />

          <h3 className="font-serif text-xl font-bold text-chatur-ivory mb-5">
            Configure Royal Battle
          </h3>

          <div className="space-y-6">
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-chatur-gold uppercase block mb-3">
                1. Select Side
              </span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedColor('w')}
                  className={`border rounded-xl p-3 flex flex-col items-center gap-1.5 transition duration-300 ${
                    selectedColor === 'w'
                      ? 'border-chatur-gold bg-chatur-charcoal/80 text-chatur-gold shadow-sm'
                      : 'border-chatur-sandal/10 bg-chatur-charcoal/20 text-chatur-sandal/50 hover:border-chatur-sandal/30 hover:text-chatur-ivory'
                  }`}
                >
                  <span className="w-6 h-6 rounded bg-chatur-ivory border border-chatur-sandal/30 inline-block shadow-inner" />
                  <span className="text-xs font-serif font-bold">Ivory (White)</span>
                </button>

                <button
                  onClick={() => setSelectedColor('b')}
                  className={`border rounded-xl p-3 flex flex-col items-center gap-1.5 transition duration-300 ${
                    selectedColor === 'b'
                      ? 'border-chatur-gold bg-chatur-charcoal/80 text-chatur-gold shadow-sm'
                      : 'border-chatur-sandal/10 bg-chatur-charcoal/20 text-chatur-sandal/50 hover:border-chatur-sandal/30 hover:text-chatur-ivory'
                  }`}
                >
                  <span className="w-6 h-6 rounded bg-chatur-charcoal border border-chatur-sandal/50 inline-block shadow-inner" />
                  <span className="text-xs font-serif font-bold">Mahogany (Black)</span>
                </button>

                <button
                  onClick={() => setSelectedColor('random')}
                  className={`border rounded-xl p-3 flex flex-col items-center gap-1.5 justify-center transition duration-300 ${
                    selectedColor === 'random'
                      ? 'border-chatur-gold bg-chatur-charcoal/80 text-chatur-gold shadow-sm'
                      : 'border-chatur-sandal/10 bg-chatur-charcoal/20 text-chatur-sandal/50 hover:border-chatur-sandal/30 hover:text-chatur-ivory'
                  }`}
                >
                  <span className="w-6 h-6 rounded bg-gradient-to-br from-chatur-ivory to-chatur-pane border border-chatur-sandal/40 inline-block shadow-inner" />
                  <span className="text-xs font-serif font-bold">Flip Coin (Random)</span>
                </button>
              </div>
            </div>

            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-chatur-gold uppercase block mb-3">
                2. Select Clock
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Casual', min: 0 },
                  { label: '3 min Blitz', min: 3 },
                  { label: '5 min Blitz', min: 5 },
                  { label: '10 min Rapid', min: 10 },
                  { label: '15 min Rapid', min: 15 },
                  { label: '30 min Standard', min: 30 },
                  { label: '60 min Classical', min: 60 }
                ].slice(0, 4).map((tc) => (
                  <button
                    key={tc.min}
                    onClick={() => setSelectedTime(tc.min)}
                    className={`border rounded-lg py-2.5 text-xs font-semibold transition ${
                      selectedTime === tc.min
                        ? 'border-chatur-gold bg-chatur-charcoal text-chatur-gold'
                        : 'border-chatur-sandal/10 bg-chatur-charcoal/20 text-chatur-sandal/70 hover:border-chatur-sandal/20 hover:text-chatur-ivory'
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label: '15M Rapid', min: 15 },
                  { label: '30M standard', min: 30 },
                  { label: '60M classical', min: 60 }
                ].map((tc) => (
                  <button
                    key={tc.min}
                    onClick={() => setSelectedTime(tc.min)}
                    className={`border rounded-lg py-2.5 text-xs font-semibold transition ${
                      selectedTime === tc.min
                        ? 'border-chatur-gold bg-chatur-charcoal text-chatur-gold'
                        : 'border-chatur-sandal/10 bg-chatur-charcoal/20 text-chatur-sandal/70 hover:border-chatur-sandal/20 hover:text-chatur-ivory'
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateMatch}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-chatur-gold to-[#bfa032] text-chatur-dark font-extrabold rounded-xl text-sm shadow-md hover:shadow-xl transition duration-300"
            >
              <Play className="w-4 h-4" />
              Start Relay Host
            </button>
          </div>
        </div>
      )}

      {activeTab === 'join' && (
        <div className="bg-chatur-pane border border-chatur-sandal/10 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-chatur-gold to-transparent opacity-60" />

          <h3 className="font-serif text-xl font-bold text-chatur-ivory mb-4">
            Join Existing Battle
          </h3>

          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-chatur-sandal/70">
              Paste the <strong>Invitation Link</strong> or the <strong>Offer Code</strong> broadcast by your opponent below to join via Nostr relays.
            </p>

            <textarea
              value={joinInputCode}
              onChange={(e) => {
                setJoinInputCode(e.target.value);
                setInvalidCodeError(false);
              }}
              placeholder="Paste invitation code or URL..."
              rows={4}
              className="w-full bg-chatur-charcoal border border-chatur-sandal/25 text-chatur-ivory rounded-lg p-3 text-xs placeholder:text-chatur-sandal/30 focus:outline-none focus:ring-1 focus:ring-chatur-gold font-mono"
            />

            {invalidCodeError && (
              <p className="text-rose-400 text-xs font-mono font-semibold">
                ⚠️ Invalid invitation code. Please ask the Host to generate and send a fresh Invitation link.
              </p>
            )}

            <button
              onClick={handleJoinMatchSubmit}
              disabled={!joinInputCode.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-chatur-gold to-[#bfa032] text-chatur-dark font-extrabold rounded-xl text-sm shadow-md hover:shadow-xl transition duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-4 h-4" />
              Connect to Relay
            </button>
          </div>
        </div>
      )}

      {activeTab === 'how' && <GameManual />}
    </div>
  );
}
