# Portofolio Manager Backend API (Internal)

## What is this?
- Node.js backend for personal asset management (stocks only)
- Uses Twelve Data API for stock data

## How to run
Start server (same as nodemon app.js):
   ```bash
   npm run dev
   ```

## API Endpoints

### 1. Real-time quote
GET `/api/stock/quote/:symbol`
- Example: `http:localhost:3000/api/stock/quote/AAPL`

### 2. Time series (daily/intraday)
GET `/api/stock/:symbol?interval=xxx&outputsize=xxx`
- Example: `http:localhost:3000/api/stock/AAPL?interval=1day&outputsize=30`
- Example: `http:localhost:3000/api/stock/AAPL?interval=5min&outputsize=50`

### 3. Search stock
GET `/api/stock/search/:keywords`
- Example: `http:localhost:3000/api/stock/search/Apple`

## How to test
- Use browser, curl, or Postman to call above endpoints
- All responses are JSON from Twelve Data

---
