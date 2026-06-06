# Chaturanga

**Play Live:** [https://Dhruvil-8.github.io/chaturanga](https://Dhruvil-8.github.io/chaturanga)

A completely decentralized, serverless peer-to-peer chess platform powered by Nostr.

Chaturanga allows you to play chess online privately without relying on any centralized matchmaking or gameplay servers. It uses public Nostr relays to route your moves securely.

## Features
- **Serverless & Decentralized**: Powered entirely by the Nostr network.
- **Procedural Sound Engine**: High-quality chess sound effects generated directly in the browser via the Web Audio API.

## How to Play
1. **Host a Game**: Choose your color and time control. The app generates an encrypted Nostr invite link.
2. **Join a Game**: Send the link to your friend. When they open it, their browser instantly negotiates a handshake via the Nostr relay and the game begins.

## Local Development
1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Build for production: `npm run build`

## License
MIT
