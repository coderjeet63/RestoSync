# Phase 6: The Analytics Engine (MongoDB Aggregation)

## 1. Goal
The final milestone is to provide restaurant owners with actionable Business Intelligence (BI). We will implement complex MongoDB Aggregation Pipelines to process raw order data into high-level dashboard metrics—specifically total revenue, order volume, and top-performing menu items—while strictly enforcing multi-tenant isolation.

## 2. Multi-Tenancy Security
Analytics must strictly respect the `req.user.restaurantId` injected by the `protect` middleware. No tenant should ever see the revenue or sales data of another tenant.

## 3. Implementation Details

### Query 1: Overall Statistics
- **Match Stage**: Filter by `restaurantId` and only include `COMPLETED` orders.
- **Group Stage**: Sum the `totalAmount` to calculate `totalRevenue` and count documents for `totalOrders`.

### Query 2: Top Selling Items (Top 5)
- **Unwind Stage**: Deconstruct the `items` array from each order document.
- **Group Stage**: Aggregate by `menuItemId` and sum the `quantity` sold for each item.
- **Sort & Limit Stage**: Sort by volume descending and pick the top 5.
- **Lookup Stage**: Perform a "Left Outer Join" with the `menus` collection to fetch item names and categories.
- **Project Stage**: Format the final output for a clean frontend response.

## 4. Acceptance Criteria
1. The `/api/analytics` endpoint is protected and requires a valid JWT.
2. The response contains valid `overallStats` (Revenue and Volume).
3. The response contains a `topItems` array with correct sales counts and joined menu details.
4. Data is strictly isolated to the authenticated tenant.
