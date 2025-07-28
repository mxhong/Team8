import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

// Setting up directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// MySQL connection config (adjust as needed)
const db = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '19971104', // set your password
  database: 'profileAPP',
});


// Create tables
await db.execute(`
  CREATE TABLE IF NOT EXISTS users(
     id INT AUTO_INCREMENT PRIMARY KEY,
     username VARCHAR(50) NOT NULL UNIQUE,
     email VARCHAR(255) NOT NULL UNIQUE,
     password VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);
//资产表
await db.execute(`
  CREATE TABLE IF NOT EXISTS assets(
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     asset_type ENUM('stock', 'cash') NOT NULL DEFAULT 'stock',
     symbol VARCHAR(10) NOT NULL,
     quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
     average_price DECIMAL(15,4) NOT NULL DEFAULT 0,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id),
     UNIQUE KEY unique_user_asset (user_id, asset_type, symbol)
  )
`);
//交易记录表
await db.execute(`
  CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    symbol VARCHAR(10),
    type ENUM('buy', 'sell'),
    quantity INT,
    price DECIMAL(12,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)`
);

// Add JSON parsing middleware
app.use(express.json());


// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));


// Twelve Data API configuration
const TWELVE_DATA_API_KEY = '43230254888343009b1591f9b3c06f5e'; // Replace with your actual API key
const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

// ---------- Stock API endpoints ----------
// Get stock real-time quote
app.get('/api/stock/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const url = `${TWELVE_DATA_BASE_URL}/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code && data.status === 'error') {
      return res.status(data.code).json({ 
        error: 'API request failed',
        details: data.message
      });
    }
    
    if (!data.symbol) {
      return res.status(404).json({ error: 'Stock data not found' });
    }
    
    // Return original API response
    res.json(data);
    
  } catch (error) {
    console.error('Failed to get stock quote:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get stock data
app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval, outputsize } = req.query;
    
    const url = `${TWELVE_DATA_BASE_URL}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code && data.status === 'error') {
      return res.status(data.code).json({ 
        error: 'API request failed',
        details: data.message
      });
    }
    
    if (!data.values || !data.meta) {
      return res.status(404).json({ error: 'Stock data not found' });
    }
    
    // Return original API response
    res.json(data);
    
  } catch (error) {
    console.error('Failed to get stock data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Search stock symbols
app.get('/api/stock/search/:keywords', async (req, res) => {
  try {
    const { keywords } = req.params;
    const url = `${TWELVE_DATA_BASE_URL}/symbol_search?symbol=${keywords}&apikey=${TWELVE_DATA_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code && data.status === 'error') {
      return res.status(data.code).json({ 
        error: 'API request failed',
        details: data.message
      });
    }
    
    if (!data.data || data.data.length === 0) {
      return res.status(404).json({ error: 'No matching stocks found' });
    }
    
    // Return original API response
    res.json(data);
    
  } catch (error) {
    console.error('Failed to search stocks:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// ---------- User API endpoints ----------
// TODO: Add user registration, login, and logout endpoints

// ---------- Asset API endpoints ----------
// Add existing asset to the user's portfolio (not buy)
app.post('/api/user/:userId/assets', async (req, res) => {
  try {
    const { userId } = req.params;
    const { asset_type, symbol, quantity, average_price } = req.body;
    
    // Validate required fields
    if (!asset_type || !symbol || quantity === undefined || average_price === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: asset_type, symbol, quantity, average_price' 
      });
    }
    
    // Validate asset_type
    if (!['stock', 'cash'].includes(asset_type)) {
      return res.status(400).json({ 
        error: 'asset_type must be either "stock" or "cash"' 
      });
    }
    
    let averagePrice = average_price;
    // Special logic for cash assets
    if (asset_type === 'cash') {
      // Cash average_price is always 1
      averagePrice = 1;
      
      // Only USD is supported for now
      if (symbol !== 'USD') {
        return res.status(400).json({ 
          error: 'Only USD is supported for cash assets currently' 
        });
      }
    }
    
    // Check if asset already exists for this user
    const [existingAssets] = await db.execute(
      'SELECT * FROM assets WHERE user_id = ? AND asset_type = ? AND symbol = ?',
      [userId, asset_type, symbol]
    );
    
    if (existingAssets.length > 0) {
      // Asset exists, update quantity and recalculate average price
      const existingAsset = existingAssets[0];
      const existingQuantity = parseFloat(existingAsset.quantity);
      const existingAvgPrice = parseFloat(existingAsset.average_price);
      const newQuantity = parseFloat(quantity);
      const newAvgPrice = parseFloat(averagePrice);
      
      const totalQuantity = existingQuantity + newQuantity;
      
      // Calculate weighted average price (only for stocks, cash always stays 1)
      let finalAvgPrice;
      if (asset_type === 'cash') {
        finalAvgPrice = 1;
      } else {
        // Weighted average: (existing_qty * existing_price + new_qty * new_price) / total_qty
        finalAvgPrice = (existingQuantity * existingAvgPrice + newQuantity * newAvgPrice) / totalQuantity;
      }
      
      await db.execute(
        'UPDATE assets SET quantity = ?, average_price = ? WHERE id = ?',
        [totalQuantity, finalAvgPrice, existingAsset.id]
      );
      
      res.json({
        id: existingAsset.id,
        userId: parseInt(userId),
        asset_type,
        symbol,
        quantity: totalQuantity,
        average_price: Math.round(finalAvgPrice * 10000) / 10000, // Round to 4 decimal places
        action: 'updated'
      });
      
    } else {
      // Asset doesn't exist, create new record
      const [result] = await db.execute(
        'INSERT INTO assets (user_id, asset_type, symbol, quantity, average_price) VALUES (?, ?, ?, ?, ?)',
        [userId, asset_type, symbol, quantity, averagePrice]
      );
      
      res.json({
        id: result.insertId,
        userId: parseInt(userId),
        asset_type,
        symbol,
        quantity: parseFloat(quantity),
        average_price: parseFloat(averagePrice),
        action: 'created'
      });
    }
    
  } catch (error) {
    console.error('Failed to add asset:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get one specific asset for a user
app.get('/api/user/:userId/assets/:asset_type/:symbol', async (req, res) => {
  try {
    const { userId, asset_type, symbol } = req.params;
    const [assets] = await db.execute('SELECT * FROM assets WHERE user_id = ? AND asset_type = ? AND symbol = ?', [userId, asset_type, symbol]);
    
    if (assets.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    const asset = assets[0];
    let currentValue = 0;
    let currentPrice = 0;
    
    if (asset.asset_type === 'cash') {
      // For cash, value equals quantity
      currentValue = parseFloat(asset.quantity);
      currentPrice = 1;
    } else if (asset.asset_type === 'stock') {
      // For stocks, get current price from API
      try {
        const url = `${TWELVE_DATA_BASE_URL}/quote?symbol=${asset.symbol}&apikey=${TWELVE_DATA_API_KEY}`;
        const response = await fetch(url);
        const stockData = await response.json();
        
        if (stockData.close) {
          currentPrice = parseFloat(stockData.close);
          currentValue = currentPrice * parseFloat(asset.quantity);
        } else {
          console.warn(`Failed to get price for ${asset.symbol}`);
          currentPrice = 0;
          currentValue = 0;
        }
      } catch (error) {
        console.error(`Error fetching price for ${asset.symbol}:`, error);
        currentPrice = 0;
        currentValue = 0;
      }
    }
    
    const totalCost = parseFloat(asset.quantity) * parseFloat(asset.average_price);
    
    const assetDetail = {
      assetType: asset.asset_type,
      symbol: asset.symbol,
      quantity: parseFloat(asset.quantity),
      averagePrice: parseFloat(asset.average_price),
      currentPrice: currentPrice,
      totalCost: Math.round(totalCost * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100
    };
    
    res.json(assetDetail);
    
  } catch (error) {
    console.error('Failed to get asset:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get total cash for a user
app.get('/api/user/:userId/assets/cash', async (req, res) => {
  try {
    const { userId } = req.params;
    const [result] = await db.execute('SELECT SUM(quantity) as total_cash FROM assets WHERE user_id = ? AND asset_type = "cash"', [userId]);
    res.json({
      userId: parseInt(userId),
      totalCash: result[0].total_cash || 0
    });
  } catch (error) {
    console.error('Failed to get cash:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get total value of all stocks for a user
app.get('/api/user/:userId/assets/stocks', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all assets for the user
    const [assets] = await db.execute(
      'SELECT * FROM assets WHERE user_id = ?',
      [userId]
    );
    
    if (assets.length === 0) {
      return res.json({
        userId: parseInt(userId),
        totalValue: 0
      });
    }
    
    let totalValue = 0;
    
    // Process each asset
    for (const asset of assets) {
      let currentValue = 0;
      
      if (asset.asset_type === 'stock') {
        // For stocks, get current price from API
        try {
          const url = `${TWELVE_DATA_BASE_URL}/quote?symbol=${asset.symbol}&apikey=${TWELVE_DATA_API_KEY}`;
          const response = await fetch(url);
          const stockData = await response.json();
          
          if (stockData.close) {
            const currentPrice = parseFloat(stockData.close);
            currentValue = currentPrice * parseFloat(asset.quantity);
          } else {
            console.warn(`Failed to get price for ${asset.symbol}`);
            currentValue = 0;
          }
        } catch (error) {
          console.error(`Error fetching price for ${asset.symbol}:`, error);
          currentValue = 0;
        }
        totalValue += currentValue;
      }      
    }
    
    res.json({
      userId: parseInt(userId),
      totalValue: Math.round(totalValue * 100) / 100 // Round to 2 decimal places
    });
    
  } catch (error) {
    console.error('Failed to get total assets value:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get assets details for a user
app.get('/api/user/:userId/assets/details', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all assets for the user
    const [assets] = await db.execute(
      'SELECT * FROM assets WHERE user_id = ?',
      [userId]
    );
    
    if (assets.length === 0) {
      return res.json([]);
    }
    
    const assetDetails = [];
    
    // Process each asset
    for (const asset of assets) {
      let currentValue = 0;
      let currentPrice = 0;
      
      if (asset.asset_type === 'cash') {
        // For cash, value equals quantity
        currentValue = parseFloat(asset.quantity);
        currentPrice = 1;
      } else if (asset.asset_type === 'stock') {
        // For stocks, get current price from API
        try {
          const url = `${TWELVE_DATA_BASE_URL}/quote?symbol=${asset.symbol}&apikey=${TWELVE_DATA_API_KEY}`;
          const response = await fetch(url);
          const stockData = await response.json();
          
          if (stockData.close) {
            currentPrice = parseFloat(stockData.close);
            currentValue = currentPrice * parseFloat(asset.quantity);
          } else {
            console.warn(`Failed to get price for ${asset.symbol}`);
            currentPrice = 0;
            currentValue = 0;
          }
        } catch (error) {
          console.error(`Error fetching price for ${asset.symbol}:`, error);
          currentPrice = 0;
          currentValue = 0;
        }
      }
      
        const totalCost = parseFloat(asset.quantity) * parseFloat(asset.average_price);
        
        assetDetails.push({
          assetType: asset.asset_type,
          symbol: asset.symbol,
          quantity: parseFloat(asset.quantity),
          averagePrice: parseFloat(asset.average_price),
          currentPrice: currentPrice,
          totalCost: Math.round(totalCost * 100) / 100,
          currentValue: Math.round(currentValue * 100) / 100
        });
    }
    
    res.json(assetDetails);
    
  } catch (error) {
    console.error('Failed to get assets details:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

//查询交易记录
// 查询用户的交易记录
app.get('/api/user/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { symbol, type } = req.query;

    let baseQuery = 'SELECT * FROM transactions WHERE user_id = ?';
    const queryParams = [userId];

    if (symbol) {
      baseQuery += ' AND symbol = ?';
      queryParams.push(symbol.toUpperCase());
    }

    if (type && ['buy', 'sell'].includes(type)) {
      baseQuery += ' AND type = ?';
      queryParams.push(type);
    }

    baseQuery += ' ORDER BY timestamp DESC';

    const [rows] = await db.execute(baseQuery, queryParams);

    const formatted = rows.map(tx => ({
      id: tx.id,
      symbol: tx.symbol,
      type: tx.type,
      quantity: tx.quantity,
      price: parseFloat(tx.price),
      timestamp: tx.timestamp
    }));

    res.json({
      userId: parseInt(userId),
      total: formatted.length,
      transactions: formatted
    });

  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Personal Asset Management System running at http://localhost:${port}`);
  console.log('Stock market API ready - Using Twelve Data API');
});

