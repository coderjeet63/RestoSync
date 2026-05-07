import { io } from "socket.io-client";

// Connect to our local server
const socket = io("http://localhost:5000", {
  reconnection: true,
  timeout: 10000
});

console.log("⏳ Attempting to connect to http://localhost:5000...");

socket.on("connect_error", (err) => {
  console.error(`❌ Connection Error: ${err.message}`);
});

socket.on("connect", () => {
  console.log(`✅ Connected to Socket.io server with ID: ${socket.id}`);
  console.log(`📡 Listening for 'order_update' events. Run your autocannon test now!`);
});

// Listen for the custom event emitted by our orderWorker
socket.on("order_update", (data) => {
  console.log("\n🔥 REAL-TIME UPDATE RECEIVED 🔥");
  console.log(`Status: ${data.status}`);
  console.log(`Job ID: ${data.jobId}`);
  if (data.orderId) console.log(`Order ID: ${data.orderId}`);
  if (data.message) console.log(`Message: ${data.message}`);
  if (data.error) console.log(`Error: ${data.error}`);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});
