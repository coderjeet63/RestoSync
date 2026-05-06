# Phase 3: The Write Bottleneck & Message Queues

## Goal
The goal of this phase is to solve database write concurrency and potential bottlenecks during high-volume order placement. By implementing a **Producer-Consumer architecture** using **BullMQ**, we decouple the order intake from the processing logic, ensuring the system remains responsive even under heavy load.

## Key Objectives
- **Decouple Order Placement**: Transition from synchronous database writes to an asynchronous queue-based system.
- **Implement Message Queue (BullMQ)**: Use Redis as a message broker to store pending orders.
- **Develop Background Worker**: Create a dedicated worker process to handle inventory verification and database persistence.
- **Reliability**: Ensure that orders are processed sequentially and accurately, with built-in retry mechanisms and error logging.

## Technical Requirements
- **Queue Engine**: BullMQ
- **Redis Client (for Queue)**: `ioredis` (TCP/RESP protocol)
- **Architecture**:
    - **Producer**: Express Controller (`orderController.js`) adding jobs to the queue.
    - **Consumer**: Background Worker (`orderWorker.js`) processing jobs from the queue.
- **Inventory Check**: Atomic decrement of `availableQuantity` in the `Menu` collection during processing.

## Success Metrics
- Immediate response to the customer (202 Accepted) regardless of database load.
- Zero over-selling of items (Inventory integrity).
- Improved system stability during traffic spikes.
