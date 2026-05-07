# Phase 7: The Customer Engine & Frictionless Auth

## 1. Goal
To build a seamless onboarding and ordering experience for end-consumers. Instead of forcing customers to create complex accounts with passwords, we implement a frictionless OTP (One-Time Password) based authentication system. Additionally, we expose highly optimized, publicly accessible menu endpoints so customers can instantly view menus via QR codes without logging in.

## 2. Implementation Details

### Customer Model (`src/models/Customer.js`)
- **Schema**: `phoneNumber` (unique identifier), `name`, `createdAt`.
- **Strategy**: Passwords are eliminated. The phone number serves as the primary key for customer identity.

### Frictionless Authentication (`src/api/controllers/customerAuthController.js`)
- **`requestOtp`**: Accepts a phone number. If the customer does not exist, they are seamlessly created. A mock OTP is generated (currently hardcoded to `1234` for development).
- **`verifyOtp`**: Validates the OTP. Upon success, generates a long-lived JWT (30 days) containing the customer's ID and role (`customer`).

### Customer Middleware (`src/api/middlewares/customerMiddleware.js`)
- **`protectCustomer`**: Extracts and validates the JWT. Specifically verifies that the token's role is `customer` to prevent cross-role authorization (e.g., preventing a restaurant admin from accidentally authenticating as a customer, or vice versa).

### Public Menu API (`src/api/controllers/publicMenuController.js`)
- **`getPublicMenu`**: A strictly read-only endpoint that allows anyone to fetch a restaurant's menu using just the `restaurantId`.
- **Caching**: Utilizes the Upstash Redis Cache-Aside pattern (implemented in Phase 2) to guarantee lightning-fast menu loads, essential for a positive QR-code scanning experience.

## 3. Acceptance Criteria
1. Customers can request an OTP using a phone number.
2. Customers can verify the OTP and receive a valid JWT.
3. Protected customer routes enforce the `customer` role.
4. Public users can fetch a restaurant's menu instantly, leveraging Redis caching.
