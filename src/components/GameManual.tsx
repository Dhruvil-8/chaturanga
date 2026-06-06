import { BookOpen, ShieldCheck, Zap, Globe } from 'lucide-react';

export default function GameManual() {
  return (
    <div className="bg-chatur-pane/80 border border-chatur-sandal/10 rounded-2xl p-6 sm:p-8 shadow-xl max-w-3xl mx-auto">
      <div className="flex items-center gap-3 border-b border-chatur-sandal/10 pb-4 mb-6">
        <BookOpen className="w-5.5 h-5.5 text-chatur-gold shrink-0" />
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-chatur-ivory">
          How Nostr-Powered Decentralized Play Works
        </h2>
      </div>

      <p className="text-sm text-chatur-sandal/80 leading-relaxed mb-6">
        Named after <strong>Chaturanga</strong>, the ancient 6th-century Indian precursor of modern chess, this platform is completely decentralized. All games occur via secure Nostr relays using end-to-end NIP-04 encryption, bypassing central matchmaking servers while completely protecting your IP address.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-chatur-dark/50 border border-chatur-sandal/10 rounded-xl p-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-chatur-charcoal border border-chatur-gold/30 flex items-center justify-center mb-3">
            <span className="font-serif text-chatur-gold text-sm font-bold">1</span>
          </div>
          <h3 className="font-serif text-chatur-ivory text-sm font-semibold mb-1">Host Generates Code</h3>
          <p className="text-xs text-chatur-sandal/60 leading-normal">
            Select peace-of-mind rules & time constraints. Generate an encrypted Nostr Invite Link or QR code.
          </p>
        </div>

        <div className="bg-chatur-dark/50 border border-chatur-sandal/10 rounded-xl p-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-chatur-charcoal border border-chatur-gold/30 flex items-center justify-center mb-3">
            <span className="font-serif text-chatur-gold text-sm font-bold">2</span>
          </div>
          <h3 className="font-serif text-chatur-ivory text-sm font-semibold mb-1">Opponent Connects</h3>
          <p className="text-xs text-chatur-sandal/60 leading-normal">
            Opponent opens website, clicks Join, inputs your Code, and instantly connects through the relay. Handshake completes and the private duel commences on the board.
          </p>
        </div>
      </div>

      <div className="bg-chatur-dark/35 border border-chatur-sandal/10 rounded-xl p-5 space-y-4">
        <h4 className="font-serif text-sm font-bold text-chatur-gold tracking-wide uppercase">
          Why Nostr Relays?
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-chatur-gold shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[11px] font-semibold text-chatur-ivory uppercase">Uncompromising Privacy</h5>
              <p className="text-[10px] text-chatur-sandal/60 leading-normal">
                Unlike standard P2P which leaks IP addresses, Nostr routes encrypted messages through public relays. Your IP is never exposed to your opponent.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-chatur-gold shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[11px] font-semibold text-chatur-ivory uppercase">Instant Connections</h5>
              <p className="text-[10px] text-chatur-sandal/60 leading-normal">
                No firewall traversal issues or NAT punching. Connecting via a relay ensures 100% reliable handshakes without complex copy-pasting.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Globe className="w-4 h-4 text-chatur-gold shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[11px] font-semibold text-chatur-ivory uppercase">Eternal Preservation</h5>
              <p className="text-[10px] text-chatur-sandal/60 leading-normal">
                No monthly backend hosting costs. The game works indefinitely over static GitHub Pages code and free public Nostr relays.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
