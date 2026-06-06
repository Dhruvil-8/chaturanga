export type ConnectionMode = 'lobby' | 'host' | 'join' | 'connected' | 'disconnected';

export interface GameConfig {
  hostColor: 'w' | 'b';
  timeControl: number; // in minutes, 0 means infinite / untimed
}

export interface OfferBundle {
  sdp: string;
  config: GameConfig;
}

export interface AnswerBundle {
  sdp: string;
}

export interface GameTimer {
  w: number; // seconds left
  b: number; // seconds left
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'opponent' | 'system';
  text: string;
  timestamp: number;
}

export interface MoveData {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  fenBefore: string;
  fenAfter: string;
}

export type NetworkMessage =
  | { type: 'move'; from: string; to: string; promotion?: string; clocks: GameTimer }
  | { type: 'chat'; text: string; timestamp: number }
  | { type: 'draw_offer' }
  | { type: 'draw_response'; accept: boolean }
  | { type: 'resign' }
  | { type: 'rematch_offer' }
  | { type: 'rematch_accept'; newHostColor: 'w' | 'b' }
  | { type: 'ping'; timestamp: number }
  | { type: 'pong'; timestamp: number };
