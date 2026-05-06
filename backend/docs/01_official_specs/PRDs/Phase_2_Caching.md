# Phase 2: The Read Bottleneck & Redis Caching

## Goal
The goal of this phase is to implement a robust caching layer using **Upstash Serverless Redis** to address potential read bottlenecks when fetching menu data. By implementing the **Cache-Aside pattern**, we ensure that frequently accessed menu data is served instantly without repeated database queries or the overhead of traditional connection pooling.

## Key Objectives
- **Build an Express Server**: Transition to a fully functional API server to handle requests.
- **Implement Cache-Aside Pattern**: 
    1. Check Redis for cached menu data.
    2. If found (Cache Hit), return the data immediately.
    3. If not found (Cache Miss), query MongoDB, cache the result in Redis with an expiry (TTL), and return the data.
- **Serverless Redis (Upstash)**: Use Upstash's REST-based Redis client to avoid connection pooling issues common in serverless or highly concurrent environments.

## Technical Requirements
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Caching**: Upstash Redis (@upstash/redis)
- **TTL**: 1 hour (3600 seconds) for menu items.

## API Endpoints
### GET /api/menus/:restaurantId
- **Description**: Fetches the menu for a specific restaurant.
- **Caching Logic**:
    - Key: `menu:${restaurantId}`
    - Source flag included in response: `cache` or `database`.

## Success Metrics
- Reduced latency for menu fetch requests.
- Decreased load on MongoDB for read-heavy operations.
