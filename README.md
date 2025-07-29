# Personal Asset Management System

A comprehensive personal portfolio management system with real-time stock trading capabilities. Built with Node.js, Express, MySQL, and Twelve Data API integration.

## Features

- **User Authentication**: Secure user registration and login with bcrypt password encryption
- **Real-time Stock Data**: Live stock quotes, historical data, and symbol search via Twelve Data API
- **Portfolio Management**: Track stocks and cash with automatic cost basis calculation
- **Real-time Trading**: Buy and sell stocks at current market prices with atomic transactions
- **Transaction History**: Complete audit trail with pagination support
- **Asset Analytics**: Portfolio value tracking and performance metrics

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL database
- Twelve Data API key (free tier available)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure MySQL database connection in `app.js`
4. Add your Twelve Data API key to the `TWELVE_DATA_API_KEY` variable
5. Start the server:
   ```bash
   npm run dev
   ```
6. API runs at: `http://localhost:3000`

### Database Configuration
Update the database connection settings in `app.js`:
```javascript
const db = mysql.createPool({
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  database: 'portfolio_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

The system automatically creates all required tables on startup.

## Database Schema

The system uses 3 main tables:

### **users** - User accounts
| Field | Type | Description |
|-------|------|-------------|
| id | INT | Primary key, auto-increment |
| username | VARCHAR(50) | Unique username |
| email | VARCHAR(255) | Unique email address |
| password | VARCHAR(255) | Encrypted password (bcrypt) |
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

## API Endpoints

### User Authentication
```
POST /api/register                              # Register new user
POST /api/login                                 # User login
```

### Stock Market Data
```
GET /api/stock/quote/{symbol}                   # Get real-time stock price
GET /api/stock/{symbol}?interval={}&outputsize={}  # Get historical data
GET /api/stock/search/{keywords}                # Search stocks
```

### User Assets Management
```
POST /api/user/{userId}/assets                  # Add asset to portfolio
GET  /api/user/{userId}/assets/details          # Get all assets with details
GET  /api/user/{userId}/assets/cash             # Get total cash
GET  /api/user/{userId}/assets/stocks           # Get total stock value
GET  /api/user/{userId}/assets/stocks/cost      # Get total stock cost basis
GET  /api/user/{userId}/assets/{asset_type}/{symbol}  # Get specific asset
```

### Trading Operations
```
POST /api/user/{userId}/buy                     # Buy stock
POST /api/user/{userId}/sell                    # Sell stock
GET  /api/user/{userId}/transactions            # Get transaction history
GET  /api/user/{userId}/held-stocks             # Get list of owned stocks
```

## Request Examples

### User Registration
```bash
POST /api/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### User Login
```bash
POST /api/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securepassword123"
}
```

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

### Get Transaction History (with filters)
```bash
GET /api/user/1/transactions                    # All transactions (first page)
GET /api/user/1/transactions?page=2&pageSize=20  # Page 2, 20 records per page
GET /api/user/1/transactions?symbol=AAPL        # Specific stock transactions
GET /api/user/1/transactions?type=buy&page=1&pageSize=5  # Buy transactions with pagination
```

## Response Examples

### Login Response
```json
{
  "message": "Login successful",
  "id": 1,
  "username": "john_doe"
}
```

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

### Transaction History (Paginated)
```json
{
  "userId": 1,
  "total": 25,
  "page": 1,
  "pageSize": 10,
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

## Key Features

- **Secure Authentication**: Password encryption with bcrypt and session management
- **Real-time Trading**: Buy/sell stocks at current market prices with live price fetching
- **Portfolio Management**: Track assets with automatic cost basis and current value calculation
- **Transaction History**: Complete audit trail of all trades with advanced filtering and pagination
- **Asset Accumulation**: Adding duplicate assets automatically accumulates quantities
- **Weighted Average**: Stock cost basis calculated automatically using weighted average method
- **Cash Management**: USD cash balance updated automatically with trades
- **Database Transactions**: All trading operations are atomic to ensure data consistency
- **Connection Pool**: MySQL connection pooling for optimal performance

## Dependencies

The project uses the following main dependencies:
- **express**: Web framework
- **mysql2**: MySQL database driver with promise support
- **bcrypt**: Password encryption
- **node-fetch**: HTTP client for API calls (built-in for Node.js 18+)

## Error Handling

The API includes comprehensive error handling for:
- Invalid user credentials
- Insufficient balance for trades
- Stock symbol not found
- Database connection errors
- API rate limits and timeouts

## Notes

- Stock prices are fetched in real-time from Twelve Data API
- All trades require sufficient cash/stock balance validation
- Transactions use database-level atomic operations
- Currently supports USD cash only
- Free Twelve Data API tier includes rate limits
- All endpoints return consistent JSON responses with proper HTTP status codes

## Frontend Integration

The system includes HTML frontend pages located in the `public/` directory:
- `index.html` - Home page
- `login.html` - User authentication
- `stock.html` - Stock search and quotes
- `trading.html` - Buy/sell interface
- `records.html` - Transaction history
- `assetdashboard.html` - Portfolio overview

---
