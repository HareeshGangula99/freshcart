import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../config';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(API_BASE, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const registerSocketUser = (userId: string): void => {
  const s = getSocket();
  if (s.connected) {
    s.emit('user_register', userId);
  } else {
    s.on('connect', () => {
      s.emit('user_register', userId);
    });
  }
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
