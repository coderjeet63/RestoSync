# Phase 9: Table & QR Management (Dine-In Logic)

## 1. Goal
The objective of Phase 9 is to enable dine-in functionality by managing physical tables within a restaurant. This allows the platform to associate customer orders with specific table locations, which is critical for the Kitchen Display System (KDS) and waitstaff.

## 2. Table Management
- **Entity**: Each `Table` belongs to a specific `Restaurant`.
- **Identification**: Tables are identified by a `tableNumber` (e.g., "1", "10", "VIP-A").
- **Uniqueness**: Table numbers must be unique within a single restaurant to avoid confusion.
- **State**: Tables have a `status` (`AVAILABLE`, `OCCUPIED`) to help managers monitor floor activity in real-time.

## 3. Dine-In Order Flow
1. **QR Scanning**: Customers scan a QR code at their table (future phase will generate these URLs).
2. **Order Placement**: When placing an order, the customer frontend sends the `tableId` and sets `orderType` to `DINE_IN`.
3. **Kitchen Visibility**: The KDS receives the `tableId` via real-time WebSocket/Redis triggers, allowing chefs to know exactly where the food should be served.

## 4. Multi-Tenancy & Security
- **Isolation**: Tables are strictly isolated by `restaurantId`. 
- **RBAC**: Only `OWNER` and `MANAGER` roles can create or manage table configurations.
- **Diner Access**: Customers do not interact with the Table API directly; they only provide the `tableId` during the order process.

## 5. Technical Implementation
- **Schema**: `Table` model with a compound index on `{ restaurantId: 1, tableNumber: 1 }`.
- **Order Linking**: `Order` model expanded to include `orderType` and optional `tableId`.
- **Real-time**: Redis 'kitchen-events' payload expanded to include table data.
