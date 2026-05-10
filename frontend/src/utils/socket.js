import { io } from 'socket.io-client';

// Single shared socket instance — autoConnect: false lets us connect manually
// inside components so we control the lifecycle precisely.
export const socket = io('http://localhost:5000', { autoConnect: false });
