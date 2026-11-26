import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  autoConnect: true
});

socket.on('connect', () => {
  console.log('PerishLink connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error.message);
});

socket.on('pickup-status-changed', (data) => {
  console.log('Pickup status updated:', data);
});

export default socket;