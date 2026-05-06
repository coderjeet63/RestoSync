import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import { orderQueue } from './queue.js';

// Initialize the Express adapter for Bull-Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Set up Bull-Board
createBullBoard({
  queues: [new BullMQAdapter(orderQueue)],
  serverAdapter: serverAdapter,
});

// Export the router to be mounted in the main Express app
export const bullBoardRouter = serverAdapter.getRouter();
