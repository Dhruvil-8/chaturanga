import Header from './components/Header';
import Lobby from './components/Lobby';
import ChessGame from './components/ChessGame';
import { useGameStore } from './store/gameStore';

export default function App() {
  const mode = useGameStore((state) => state.mode);

  return (
    <div className="min-h-screen bg-chatur-dark text-chatur-ivory flex flex-col font-sans selection:bg-chatur-gold/30 selection:text-chatur-gold">
      {/* Universal Ancient-Minimal Header bar */}
      <Header />

      {/* Screen Routing based on active WebRTC signal State */}
      <main className="flex-1 flex flex-col justify-center py-6 sm:py-10">
        {mode === 'connected' || mode === 'disconnected' ? (
          <ChessGame />
        ) : (
          <Lobby />
        )}
      </main>

      {/* Footer copyright notice block */}
      <footer className="border-t border-chatur-sandal/5 bg-chatur-pane/25 py-4 pb-6 text-center">
        <p className="text-[10px] text-chatur-sandal/40 font-mono tracking-widest uppercase">
          Chaturanga P2P Chess © 2026 • Direct Peer Secure Network
        </p>
      </footer>
    </div>
  );
}
