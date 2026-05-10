import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const joinRestaurantRoom = (restaurantId) => {
  if (!restaurantId) {
    return;
  }

  connectSocket();
  socket.emit('join_restaurant', restaurantId);
};

export const leaveRestaurantRoom = (restaurantId) => {
  if (!restaurantId) {
    return;
  }

  socket.emit('leave_restaurant', restaurantId);
};
