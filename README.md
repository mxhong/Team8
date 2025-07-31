# AssetPro - Personal Asset Management System

AssetPro is a comprehensive personal portfolio management platform that enables users to track investments, execute stock trades, and analyze portfolio performance in real-time. Built with modern web technologies and integrated with professional financial data APIs.

## 🚀 Key Features

### **Complete Web Application**
- **Responsive Frontend**: Modern, mobile-friendly interface with TailwindCSS
- **Multi-page Application**: Dedicated pages for dashboard, trading, market data, and portfolio management
- **Interactive Navigation**: Collapsible sidebar navigation with user profile management

### **User Management**
- **Secure Authentication**: User registration and login with bcrypt password encryption
- **Demo Access**: Quick demo login (username: `team8demo`, password: `team8demo`)
- **Session Management**: Persistent login state with localStorage

### **Real-time Market Data**
- **Dual API Integration**: Twelve Data API and Finnhub API for comprehensive market coverage
- **Live Stock Quotes**: Real-time price updates with change indicators
- **Stock Search**: Symbol and company name search functionality
- **Popular Stocks Dashboard**: Pre-loaded trending stocks with live data
- **Historical Data**: Time series data with configurable intervals

### **Portfolio Management**
- **Multi-asset Tracking**: Support for stocks and cash holdings
- **Automatic Calculations**: Real-time portfolio valuation and cost basis tracking
- **Asset Accumulation**: Smart handling of duplicate asset additions with weighted averages
- **Performance Analytics**: Gain/loss calculations and portfolio performance metrics

### **Trading System**
- **Real-time Trading**: Buy and sell stocks at current market prices
- **Atomic Transactions**: Database-level transaction safety
- **Balance Validation**: Automatic cash and stock balance verification
- **Live Price Integration**: Current market price fetching for all trades
- **Smart Stock Selection**: Auto-populate sell panel with owned stocks only

### **Transaction Management**
- **Complete Audit Trail**: Full transaction history with filtering and pagination
- **Advanced Filtering**: Filter by transaction type, stock symbol, and date ranges
- **Transaction Statistics**: Real-time stats including buy/sell counts and values
- **Recent Activity Feed**: Latest transactions with visual indicators

## 🏗️ Architecture & Technology Stack

### **Backend**
- **Runtime**: Node.js with ES6+ modules
- **Framework**: Express.js
- **Database**: MySQL with connection pooling
- **Authentication**: bcrypt for password hashing
- **APIs**: Twelve Data & Finnhub for financial data

### **Frontend**
- **Styling**: TailwindCSS for responsive design
- **Icons**: Font Awesome and Lucide icons
- **Charts**: Chart.js for data visualization
- **Architecture**: Multi-page application with shared components

### **Database Schema**
- **users**: User accounts with encrypted passwords
- **assets**: Portfolio holdings (stocks and cash)
- **transactions**: Complete trading history

## 📱 Application Pages

### **Public Pages**
- **`index.html`**: Landing page with feature overview and authentication
- **`login.html`**: User authentication portal

### **Authenticated Pages**
- **`home.html`**: Main dashboard with portfolio overview
- **`assetdashboard.html`**: Comprehensive portfolio analytics and visualizations
- **`stock.html`**: Real-time market data browser with search functionality
- **`trading.html`**: Interactive trading interface for buy/sell operations
- **`stock-detail.html`**: Detailed stock information and historical data

### **Shared Components**
- **`sidebar.html`**: Navigation sidebar with user profile management

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14 or higher)
- **MySQL** database server
- **API Keys**: 
- Twelve Data API key (free tier available)
  - Finnhub API key (free tier available)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Team8
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   ```bash
   # Create database (MySQL command line or GUI)
   CREATE DATABASE portfolio_manager;
   ```

4. **Configure Database Connection**
   
   Update the database credentials in `app.js`:
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

5. **Add API Keys**
   
   Update the API keys in `app.js`:
   ```javascript
   const TWELVE_DATA_API_KEY = "your_twelve_data_api_key";
   const FINN_HUB_API_KEY = "your_finnhub_api_key";
   ```

6. **Start the Application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Or production mode
   npm start
   ```

7. **Access the Application**
   - **Frontend**: `http://localhost:3000`
   - **API Base**: `http://localhost:3000/api`

### 🎯 Demo Access
For quick testing, use the demo credentials:
- **Username**: `team8demo`
- **Password**: `team8demo`

> **Note**: The application automatically creates all required database tables on startup.

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

## 🔗 API Documentation

### **User Authentication**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register` | Register new user account |
| `POST` | `/api/login` | User login authentication |

### **Stock Market Data**
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/api/stock/quote/{symbol}` | Get real-time stock quote (Twelve Data) | `symbol`: Stock symbol |
| `GET` | `/api/stock/quote-finnhub/{symbol}` | Get real-time stock quote (Finnhub) | `symbol`: Stock symbol |
| `GET` | `/api/stock/{symbol}` | Get historical stock data | `symbol`, `interval`, `outputsize` |
| `GET` | `/api/stock/search/{keywords}` | Search stocks by symbol/name | `keywords`: Search term |

### **Portfolio Management**
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `POST` | `/api/user/{userId}/assets` | Add/update asset in portfolio | `asset_type`, `symbol`, `quantity`, `average_price` |
| `GET` | `/api/user/{userId}/assets/details` | Get all assets with current prices | `userId`: User ID |
| `GET` | `/api/user/{userId}/assets/cash` | Get total cash balance | `userId`: User ID |
| `GET` | `/api/user/{userId}/assets/stocks` | Get total stock portfolio value | `userId`: User ID |
| `GET` | `/api/user/{userId}/assets/stocks/cost` | Get total stock cost basis | `userId`: User ID |
| `GET` | `/api/user/{userId}/assets/{asset_type}/{symbol}` | Get specific asset details | `userId`, `asset_type`, `symbol` |

### **Trading Operations**
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `POST` | `/api/user/{userId}/buy` | Execute buy order at market price | `symbol`, `quantity` |
| `POST` | `/api/user/{userId}/sell` | Execute sell order at market price | `symbol`, `quantity` |
| `GET` | `/api/user/{userId}/held-stocks` | Get list of owned stock symbols | `userId`: User ID |

### **Transaction History**
| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/api/user/{userId}/transactions` | Get paginated transaction history | `page`, `pageSize`, `symbol`, `type` |
| `GET` | `/api/user/{userId}/state` | Get transaction statistics summary | `userId`: User ID |

### **API Features**
- **Real-time Pricing**: Live stock quotes from professional APIs
- **Dual Provider Support**: Twelve Data for comprehensive data, Finnhub for high-quota scenarios
- **Atomic Transactions**: Database-level transaction safety for all trading operations
- **Smart Pagination**: Efficient data retrieval with customizable page sizes
- **Advanced Filtering**: Filter transactions by type, symbol, and date ranges
- **Error Handling**: Comprehensive error responses with detailed messages

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

## 📦 Dependencies

### **Production Dependencies**
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.1.0 | Web application framework |
| `mysql2` | ^3.14.2 | MySQL database driver with promise support |
| `bcrypt` | ^6.0.0 | Password hashing and encryption |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing middleware |
| `path` | ^0.12.7 | File path utilities |
| `url` | ^0.11.4 | URL parsing utilities |

### **Development Dependencies**
| Package | Version | Purpose |
|---------|---------|---------|
| `nodemon` | ^3.1.10 | Development server with auto-reload |

### **Frontend Libraries (CDN)**
- **TailwindCSS**: Utility-first CSS framework
- **Font Awesome**: Icon library
- **Chart.js**: Data visualization library  
- **Lucide**: Modern icon set

## 🛡️ Security & Error Handling

### **Security Features**
- **Password Encryption**: bcrypt with salt rounds for secure password storage
- **SQL Injection Protection**: Parameterized queries with mysql2 prepared statements
- **Input Validation**: Comprehensive validation for all user inputs
- **Session Management**: Secure client-side session handling

### **Error Handling**
The application includes comprehensive error handling for:
- **Authentication Errors**: Invalid credentials, expired sessions
- **Trading Errors**: Insufficient balance, invalid stock symbols, market closures
- **Database Errors**: Connection issues, transaction failures, constraint violations
- **API Errors**: Rate limiting, network timeouts, invalid responses
- **Validation Errors**: Invalid input formats, missing required fields

### **API Response Format**
All API endpoints return consistent JSON responses:
```javascript
// Success Response
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}

// Error Response  
{
  "error": "Error type",
  "message": "Detailed error description",
  "code": 400
}
```

## 🚨 Important Notes

### **Trading System**
- **Real-time Pricing**: Stock prices fetched live from professional APIs
- **Market Hours**: Trading available 24/7 (demo system)  
- **Balance Validation**: Automatic verification of cash/stock balances before trades
- **Atomic Operations**: All trading operations use database transactions

### **API Limitations**
- **Twelve Data**: Free tier includes rate limits (800 requests/day)
- **Finnhub**: Higher rate limits but fewer data points
- **Currency Support**: Currently USD only
- **Demo Data**: Uses hardcoded user ID (1) for demo purposes

### **Browser Compatibility**
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Support**: Responsive design for iOS and Android devices
- **JavaScript**: ES6+ features, requires modern browser support

## 🤝 Contributing

This is a training project for Team 8. For educational purposes and internal development only.

---

**AssetPro** - Smart Investing, Simplified  
© 2025 Team 8 Demo Version