# Database Schema Design (MongoDB)

## 1. Collection: `restaurants`
Stores the core tenant information.
*   `_id`: ObjectId
*   `name`: String (Required)
*   `location`: String
*   `isActive`: Boolean (Default: true)
*   `createdAt`: Timestamp
*   *Index:* `{ "name": 1 }`

## 2. Collection: `menus`
Stores individual food items. Designed for fast retrieval per restaurant.
*   `_id`: ObjectId
*   `restaurantId`: ObjectId (Ref: 'restaurants', Required)
*   `category`: String (e.g., "Starters", "Main Course")
*   `name`: String (Required)
*   `price`: Number (Required)
*   `isAvailable`: Boolean (Default: true)
*   `availableQuantity`: Number (Crucial for concurrency later)
*   *Index:* `{ "restaurantId": 1, "category": 1 }` (Compound index for fast menu filtering)

## 3. Collection: `orders`
Captures the transactional data.
*   `_id`: ObjectId
*   `restaurantId`: ObjectId (Ref: 'restaurants', Required)
*   `customerName`: String
*   `items`: Array of Objects
    *   `menuItemId`: ObjectId (Ref: 'menus')
    *   `quantity`: Number
    *   `priceAtOrder`: Number (Historical price record)
*   `totalAmount`: Number
*   `status`: String (Enum: 'PENDING', 'PREPARING', 'COMPLETED', 'CANCELLED')
*   `createdAt`: Timestamp
*   *Index:* `{ "restaurantId": 1, "createdAt": -1 }` (To quickly fetch a restaurant's recent orders)