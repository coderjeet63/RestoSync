# Phase 5: JWT Authentication & Multi-Tenancy Security

## 1. Goal
Implement robust authentication using JSON Web Tokens (JWT) and enforce strict tenant data isolation. In a B2B SaaS architecture, it is absolutely critical that users (tenants) can only interact with their own restaurant's data.

## 2. Implementation Steps

1. **User Model (`src/models/User.js`)**
   - Securely store user credentials with hashed passwords using `bcryptjs`.
   - Maintain a hard link (`restaurantId`) to associate the user strictly to a single tenant.

2. **Authentication Flow (`src/api/controllers/authController.js`)**
   - Provide `/api/auth/register` and `/api/auth/login` endpoints.
   - Generate secure JWTs embedding the `user._id` and `restaurantId`.

3. **Bouncer Middleware (`src/api/middlewares/authMiddleware.js`)**
   - The `protect` middleware intercepts API requests, extracts the Bearer token, verifies its signature, and maps the request to the authenticated user.

4. **Enforcing Multi-Tenancy (Data Isolation)**
   - Protect all business routes (`/api/menus` and `/api/orders`).
   - Remove client-provided `restaurantId` from payloads and route parameters.
   - Instead, automatically inject `req.user.restaurantId` into database queries and cache keys to forcefully guarantee users cannot query or mutate data belonging to other restaurants.
