# Personal Asset Management API

Backend API for managing user assets (stocks & cash) with trading functionality. Built with Node.js + Express + MySQL.

## Quick Start

1. Start server: `npm run dev`
2. API runs at: `http://localhost:3000`

## Database Design

The system uses 3 main tables:

### **users** - User accounts
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary key, auto-increment |
| username | VARCHAR(50) | Unique username |
| email | VARCHAR(255) | Unique email address |
| password | VARCHAR(255) | User password |
| created_at | TIMESTAMP | Account creation time |

### **assets** - User portfolio holdings
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary key, auto-increment |
| user_id | INT | Foreign key → users.id |
| asset_type | ENUM | 'stock' or 'cash' |
| symbol | VARCHAR(10) | Stock symbol (e.g., AAPL) or 'USD' |
| quantity | DECIMAL(15,4) | Number of shares/amount |
| average_price | DECIMAL(15,4) | Average cost per share (1 for cash) |
| created_at | TIMESTAMP | Asset creation time |
| updated_at | TIMESTAMP | Last update time |

**Constraints:** Unique combination of (user_id, asset_type, symbol)

### **transactions** - Trading history
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary key, auto-increment |
| user_id | INT | Foreign key → users.id |
| symbol | VARCHAR(10) | Stock symbol |
| type | ENUM | 'buy' or 'sell' |
| quantity | INT | Number of shares traded |
| price | DECIMAL(12,2) | Price per share at transaction |
| timestamp | TIMESTAMP | Transaction time |

**Key Design Notes:**
- Each user can have multiple assets and transactions
- Assets table prevents duplicate holdings via unique constraint
- Cash assets always have symbol='USD' and average_price=1
- All tables auto-create on server startup

## API Endpoints

### Stock Market Data
```
GET /api/stock/quote/{symbol}                # Get real-time stock price
GET /api/stock/{symbol}?interval={}&outputsize={}  # Get historical data
GET /api/stock/search/{keywords}             # Search stocks
```

### User Assets Management
```
POST /api/user/{userId}/assets               # Add asset to portfolio
GET  /api/user/{userId}/assets/details       # Get all assets with details
GET  /api/user/{userId}/assets/cash          # Get total cash
GET  /api/user/{userId}/assets/stocks        # Get total stock value
GET  /api/user/{userId}/assets/{asset_type}/{symbol}  # Get specific asset
```

### Trading Operations
```
POST /api/user/{userId}/buy                  # Buy stock
POST /api/user/{userId}/sell                 # Sell stock
GET  /api/user/{userId}/transactions         # Get transaction history
GET  /api/user/{userId}/held-stocks          # Get list of owned stocks
```

**Parameters:**
- `{symbol}` - Stock symbol (e.g., AAPL, MSFT)
- `{userId}` - User ID (e.g., 1, 2)
- `{asset_type}` - Asset type: `stock` or `cash`
- `{keywords}` - Search keywords (e.g., Apple, Microsoft)
- `interval` - Time interval: `1min`, `5min`, `1day`, etc.
- `outputsize` - Number of data points (e.g., 30, 100)

## Request Examples

### Add Stock Asset
```bash
POST /api/user/1/assets
Content-Type: application/json

{
  "asset_type": "stock",
  "symbol": "AAPL",
  "quantity": 10,
  "average_price": 150.25
}
```

### Add Cash Asset
```bash
POST /api/user/1/assets
Content-Type: application/json

{
  "asset_type": "cash", 
  "symbol": "USD",
  "quantity": 5000,
  "average_price": 1
}
```

### Buy Stock
```bash
POST /api/user/1/buy
Content-Type: application/json

{
  "symbol": "AAPL",
  "quantity": 5
}
```

### Sell Stock
```bash
POST /api/user/1/sell
Content-Type: application/json

{
  "symbol": "AAPL", 
  "quantity": 3
}
```

### Get Transaction History
```bash
GET /api/user/1/transactions                 # All transactions
GET /api/user/1/transactions?symbol=AAPL     # Specific stock
GET /api/user/1/transactions?type=buy        # Buy transactions only
```

## Response Examples

### Asset Details
```json
[
  {
    "assetType": "stock",
    "symbol": "AAPL",
    "quantity": 10,
    "averagePrice": 150.25,
    "currentPrice": 185.20,
    "totalCost": 1502.50,
    "currentValue": 1852.00
  }
]
```

### Buy/Sell Response
```json
{
  "success": true,
  "symbol": "AAPL",
  "quantity": 5,
  "price": 185.20,
  "totalCost": 926.00
}
```

### Transaction History
```json
{
  "userId": 1,
  "total": 10,
  "transactions": [
    {
      "id": 1,
      "symbol": "AAPL",
      "type": "buy",
      "quantity": 10,
      "price": 150.25,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Held Stocks
```json
{
  "success": true,
  "symbols": ["AAPL", "MSFT", "GOOGL"]
}
```

## Key Features

- **Real-time Trading**: Buy/sell stocks at current market prices
- **Portfolio Management**: Track assets with cost basis and current values
- **Transaction History**: Complete audit trail of all trades
- **Asset Accumulation**: Adding duplicate assets accumulates quantities
- **Weighted Average**: Stock cost basis calculated automatically
- **Cash Management**: USD cash balance updated with trades

## Testing Setup

**User Management**: User registration/login endpoints are not implemented yet. For testing:

1. Insert a test user into database like:
   ```sql
   INSERT INTO users (username, email, password) VALUES ('testuser', 'test@example.com', 'password123');
   ```
2. Use `userId = 1` in all API calls that require user ID

## Notes
- Stock prices fetched in real-time from Twelve Data API
- All trades require sufficient cash/stock balance
- Transactions are atomic (database transactions)
- Only USD cash currently supported
- User authentication system pending implementation

---
