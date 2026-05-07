# RestoSync Backend - Phase 4: Real-Time Sockets & Pub/Sub

## 1. Goal
The primary goal of Phase 4 is to close the communication loop in our asynchronous Producer-Consumer architecture. Since orders are placed into a background queue (Phase 3) and the API immediately returns a `202 Accepted` response, the frontend lacks visibility into the final success or failure of the order processing. We will implement a real-time WebSocket connection using **Socket.io** and **Redis Pub/Sub** to push asynchronous updates from the isolated Worker process directly back to the connected client.

## 2. The Architectural Challenge
- The **API Server** handles HTTP requests and holds the WebSocket connections with the frontend clients.
- The **Worker** is a completely separate Node.js process. It performs the actual database work but has zero direct connection to the frontend clients.
- **Solution:** We will use a **Redis Backplane (Adapter/Emitter)**. The Worker will shout (publish) events into Redis, and the API Server will listen (subscribe) to Redis and forward those events to the appropriate WebSocket clients.

## 3. Technology Stack
*   **Socket.io**: Industry standard for robust WebSocket connections.
*   **@socket.io/redis-adapter**: Allows the main Socket.io server to subscribe to Redis Pub/Sub channels.
*   **@socket.io/redis-emitter**: Allows non-socket processes (like our Worker) to emit events onto the Redis Backplane.

## 4. Implementation Details

### Step 1: Centralized Socket Configuration
- Create `src/config/socket.js`.
- Initialize `socket.io` and configure it to use the `redis-adapter`, connecting to our Upstash Redis instance using `ioredis`.

### Step 2: API Server Integration
- In `src/api/server.js`, wrap the Express `app` with Node's native `http.createServer()`.
- Attach the `initSocket` function to this HTTP server so it can listen for WebSocket upgrade requests on the same port (`5000`).

### Step 3: Worker Emitter Integration
- In `src/workers/orderWorker.js`, initialize the `redis-emitter` using `ioredis`.
- Upon successful order processing (after MongoDB Atomic Updates), emit an `order_update` event with status `COMPLETED`.
- Upon failure (e.g., insufficient inventory), emit an `order_update` event with status `FAILED` and the error message.

### Step 4: Standalone Client Testing
- Create a standalone Node.js script (`test-socket.js`) using `socket.io-client` to simulate a frontend connection and verify real-time event reception without needing a React SPA.

## 5. Acceptance Criteria
1. The API Server successfully boots and logs `Socket.io: Enabled with Redis Adapter`.
2. A client can connect to `ws://localhost:5000` via Socket.io.
3. When a load test (e.g., Autocannon) queues jobs, the background Worker processes them and successfully pushes `order_update` events via Redis.
4. The connected client receives the `order_update` payload in real-time, displaying either success or failure status.
