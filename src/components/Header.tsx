import { Crown, Wifi, WifiOff } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export default function Header() {
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const myColor = useGameStore((state) => state.myColor);
  const resetStore = useGameStore((state) => state.resetStore);

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Wifi className="w-3.5 h-3.5" />
            <span>PEER CONNECTED</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-500/30 text-amber-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <Wifi className="w-3.5 h-3.5" />
            <span>SIGNALING...</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <WifiOff className="w-3.5 h-3.5" />
            <span>DISCONNECTED</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-chatur-charcoal border border-chatur-sandal/20 text-chatur-sandal/60 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-chatur-sandal/40" />
            <span>OFFLINE LOBBY</span>
          </div>
        );
    }
  };

  return (
    <header className="border-b border-chatur-sandal/10 bg-chatur-pane/55 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div 
        onClick={resetStore}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <div className="bg-chatur-charcoal p-2 rounded-lg border border-chatur-gold/20 group-hover:border-chatur-gold/60 transition duration-300">
          {/* Custom stylized horse logo representation via noble crown with decorative trim */}
          <Crown className="w-6 h-6 text-chatur-gold transform group-hover:scale-110 transition duration-300" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-wide text-chatur-ivory">
            Chaturanga
          </h1>
          <p className="text-[10px] text-chatur-sandal/60 font-mono tracking-widest uppercase">
            Peer-to-Peer Chess
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {myColor && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-chatur-charcoal/80 border border-chatur-sandal/20 rounded text-xs select-none">
            <span className="text-chatur-sandal/60">YOUR PIECES:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 rounded border border-chatur-sandal/40 ${myColor === 'w' ? 'bg-chatur-ivory' : 'bg-chatur-charcoal'}`} />
              <span className="font-serif font-bold text-chatur-ivory">
                {myColor === 'w' ? 'Ivory (White)' : 'Mahogany (Black)'}
              </span>
            </div>
          </div>
        )}
        {getStatusBadge()}
      </div>
    </header>
  );
}
