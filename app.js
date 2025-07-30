import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import cors from "cors";

// Setting up directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
const port = 3000;

// Create MySQL connection pool
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "sigrid123",
  database: "portfolio_manager",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
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
)`);

// Add JSON parsing middleware
app.use(express.json());

// Middleware to serve static files
app.use(express.static(path.join(__dirname, "public")));

// Twelve Data API configuration
const TWELVE_DATA_API_KEY = "43230254888343009b1591f9b3c06f5e"; // Replace with your actual API key
const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";

//------------- User API endpoints ------------

// Encrypt
import bcrypt from "bcrypt";
const saltRounds = 10;

// User Register
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (rows.length > 0) {
      return res
        .status(409)
        .json({ code: 409, msg: "Username already exists" });
    }

    // 对密码进行加密
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await db.execute(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    res.json({ code: 200, msg: "Registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: "Registration failed" });
  }
});

// User Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    // 查询用户信息，包括加密后的密码
    const [rows] = await db.query(
      "SELECT id, username, password FROM users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Wrong username or password" });
    }

    const user = rows[0];

    // 用 bcrypt 验证密码是否匹配
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong username or password" });
    }

    res.json({
      message: "Login successful",
      id: user.id,
      username: user.username,
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// ---------- Stock API endpoints ----------
// Get stock real-time quote
app.get("/api/stock/quote/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`API request received for symbol: ${symbol}`);

    const url = `${TWELVE_DATA_BASE_URL}/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`;
    console.log(`Calling Twelve Data API: ${url}`);

    const response = await fetch(url);
    console.log(`Twelve Data API response status: ${response.status}`);

    const data = await response.json();
    console.log(`Twelve Data API response data:`, data);

    if (data.code && data.status === "error") {
      console.error(`Twelve Data API error: ${data.message}`);
      return res.status(data.code).json({
        error: "API request failed",
        details: data.message,
      });
    }

    if (!data.symbol) {
      console.error("No symbol found in API response");
      return res.status(404).json({ error: "Stock data not found" });
    }

    console.log(`Successfully returning data for ${symbol}`);
    // Return original API response
    res.json(data);
  } catch (error) {
    console.error("Failed to get stock quote:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Get stock data
app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval, outputsize } = req.query;

    const url = `${TWELVE_DATA_BASE_URL}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code && data.status === "error") {
      return res.status(data.code).json({
        error: "API request failed",
        details: data.message,
      });
    }

    if (!data.values || !data.meta) {
      return res.status(404).json({ error: "Stock data not found" });
    }

    // Return original API response
    res.json(data);
  } catch (error) {
    console.error("Failed to get stock data:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Search stock symbols
app.get("/api/stock/search/:keywords", async (req, res) => {
  try {
    const { keywords } = req.params;
    const url = `${TWELVE_DATA_BASE_URL}/symbol_search?symbol=${keywords}&apikey=${TWELVE_DATA_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code && data.status === "error") {
      return res.status(data.code).json({
        error: "API request failed",
        details: data.message,
      });
    }

    if (!data.data || data.data.length === 0) {
      return res.status(404).json({ error: "No matching stocks found" });
    }

    // Return original API response
    res.json(data);
  } catch (error) {
    console.error("Failed to search stocks:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// ---------- Asset API endpoints ----------
// Add existing asset to the user's portfolio (not buy)
app.post("/api/user/:userId/assets", async (req, res) => {
  try {
    const { userId } = req.params;
    const { asset_type, symbol, quantity, average_price } = req.body;

    // Validate required fields
    if (
      !asset_type ||
      !symbol ||
      quantity === undefined ||
      average_price === undefined
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: asset_type, symbol, quantity, average_price",
      });
    }

    // Validate asset_type
    if (!["stock", "cash"].includes(asset_type)) {
      return res.status(400).json({
        error: 'asset_type must be either "stock" or "cash"',
      });
    }

    let averagePrice = average_price;
    // Special logic for cash assets
    if (asset_type === "cash") {
      // Cash average_price is always 1
      averagePrice = 1;

      // Only USD is supported for now
      if (symbol !== "USD") {
        return res.status(400).json({
          error: "Only USD is supported for cash assets currently",
        });
      }
    }

    // Check if asset already exists for this user
    const [existingAssets] = await db.execute(
      "SELECT * FROM assets WHERE user_id = ? AND asset_type = ? AND symbol = ?",
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
      if (asset_type === "cash") {
        finalAvgPrice = 1;
      } else {
        // Weighted average: (existing_qty * existing_price + new_qty * new_price) / total_qty
        finalAvgPrice =
          (existingQuantity * existingAvgPrice + newQuantity * newAvgPrice) /
          totalQuantity;
      }

      await db.execute(
        "UPDATE assets SET quantity = ?, average_price = ? WHERE id = ?",
        [totalQuantity, finalAvgPrice, existingAsset.id]
      );

      res.json({
        id: existingAsset.id,
        userId: parseInt(userId),
        asset_type,
        symbol,
        quantity: totalQuantity,
        average_price: Math.round(finalAvgPrice * 10000) / 10000, // Round to 4 decimal places
        action: "updated",
      });
    } else {
      // Asset doesn't exist, create new record
      const [result] = await db.execute(
        "INSERT INTO assets (user_id, asset_type, symbol, quantity, average_price) VALUES (?, ?, ?, ?, ?)",
        [userId, asset_type, symbol, quantity, averagePrice]
      );

      res.json({
        id: result.insertId,
        userId: parseInt(userId),
        asset_type,
        symbol,
        quantity: parseFloat(quantity),
        average_price: parseFloat(averagePrice),
        action: "created",
      });
    }
  } catch (error) {
    console.error("Failed to add asset:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Get total cash for a user
app.get("/api/user/:userId/assets/cash", async (req, res) => {
  try {
    const { userId } = req.params;
    const [result] = await db.execute(
      'SELECT SUM(quantity) as total_cash FROM assets WHERE user_id = ? AND asset_type = "cash"',
      [userId]
    );
    res.json({
      userId: parseInt(userId),
      totalCash: Math.round((result[0].total_cash || 0) * 100) / 100,
    });
  } catch (error) {
    console.error("Failed to get cash:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Get total stock cost for a user
app.get("/api/user/:userId/assets/stocks/cost", async (req, res) => {
  try {
    const { userId } = req.params;
    const [assets] = await db.execute(
      'SELECT * FROM assets WHERE user_id = ? AND asset_type = "stock"',
      [userId]
    );
    let totalCost = 0;
    for (const asset of assets) {
      totalCost += parseFloat(asset.quantity) * parseFloat(asset.average_price);
    }
    res.json({
      userId: parseInt(userId),
      totalCost: Math.round(totalCost * 100) / 100,
    });
  } catch (error) {
    console.error("Failed to get total stock cost:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Get total value of all stocks for a user
app.get("/api/user/:userId/assets/stocks", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all assets for the user
    const [assets] = await db.execute(
      "SELECT * FROM assets WHERE user_id = ?",
      [userId]
    );

    if (assets.length === 0) {
      return res.json({
        userId: parseInt(userId),
        totalValue: 0,
      });
    }

    let totalValue = 0;

    // Process each asset
    for (const asset of assets) {
      let currentValue = 0;

      if (asset.asset_type === "stock") {
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
      totalValue: Math.round(totalValue * 100) / 100, // Round to 2 decimal places
    });
  } catch (error) {
    console.error("Failed to get total assets value:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Get assets details for a user
app.get("/api/user/:userId/assets/details", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all assets for the user
    const [assets] = await db.execute(
      "SELECT * FROM assets WHERE user_id = ?",
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

      if (asset.asset_type === "cash") {
        // For cash, value equals quantity
        currentValue = parseFloat(asset.quantity);
        currentPrice = 1;
      } else if (asset.asset_type === "stock") {
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

      const totalCost =
        parseFloat(asset.quantity) * parseFloat(asset.average_price);

      assetDetails.push({
        assetType: asset.asset_type,
        symbol: asset.symbol,
        quantity: parseFloat(asset.quantity),
        averagePrice: parseFloat(asset.average_price),
        currentPrice: currentPrice,
        totalCost: Math.round(totalCost * 100) / 100,
        currentValue: Math.round(currentValue * 100) / 100,
      });
    }

    res.json(assetDetails);
  } catch (error) {
    console.error("Failed to get assets details:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Get one specific asset for a user (must be placed after other specific routes)
app.get("/api/user/:userId/assets/:asset_type/:symbol", async (req, res) => {
  try {
    const { userId, asset_type, symbol } = req.params;
    const [assets] = await db.execute(
      "SELECT * FROM assets WHERE user_id = ? AND asset_type = ? AND symbol = ?",
      [userId, asset_type, symbol]
    );

    if (assets.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const asset = assets[0];
    let currentValue = 0;
    let currentPrice = 0;

    if (asset.asset_type === "cash") {
      // For cash, value equals quantity
      currentValue = parseFloat(asset.quantity);
      currentPrice = 1;
    } else if (asset.asset_type === "stock") {
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

    const totalCost =
      parseFloat(asset.quantity) * parseFloat(asset.average_price);

    const assetDetail = {
      assetType: asset.asset_type,
      symbol: asset.symbol,
      quantity: parseFloat(asset.quantity),
      averagePrice: parseFloat(asset.average_price),
      currentPrice: currentPrice,
      totalCost: Math.round(totalCost * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100,
    };

    res.json(assetDetail);
  } catch (error) {
    console.error("Failed to get asset:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Query transaction history (paged)
app.get("/api/user/:userId/transactions", async (req, res) => {
  try {
    const { userId } = req.params;
    //默认一页十个
    const { symbol, type, page = 1, pageSize = 10 } = req.query;

    const pageInt = Number.isNaN(Number(page)) ? 1 : Number(page);
    const pageSizeInt = Number.isNaN(Number(pageSize)) ? 10 : Number(pageSize);
    const offset = (pageInt - 1) * pageSizeInt;

    // 构建基本查询和参数
    let baseQuery = "SELECT * FROM transactions WHERE user_id = ?";
    const baseParams = [Number(userId)];

    if (symbol) {
      baseQuery += " AND symbol = ?";
      baseParams.push(symbol.toUpperCase());
    }

    if (type && ["buy", "sell"].includes(type)) {
      baseQuery += " AND type = ?";
      baseParams.push(type);
    }

    // 总数查询语句
    const countQuery = `SELECT COUNT(*) AS total FROM (${baseQuery}) AS countTable`;
    const [countRows] = await db.execute(countQuery, baseParams);
    const total = countRows[0].total;
    console.log(`Total transactions for user ${userId}: ${total}`);

    // 数据分页查询语句
    // 拼接分页SQL，LIMIT 和 OFFSET 直接拼字符串（注意安全：pageSizeInt 和 offset 都是Number类型，且是经过parseInt的）
    const paginatedQuery = `${baseQuery} ORDER BY timestamp DESC LIMIT ${pageSizeInt} OFFSET ${offset}`;

    //测试数值
    // console.log({ pageInt, pageSizeInt, offset, dataParams });
    const [rows] = await db.execute(paginatedQuery, baseParams);

    // 格式化结果
    const formatted = rows.map((tx) => ({
      id: tx.id,
      symbol: tx.symbol,
      type: tx.type,
      quantity: tx.quantity,
      price: parseFloat(tx.price),
      timestamp: tx.timestamp,
    }));

    // 返回响应
    res.json({
      userId: parseInt(userId),
      total,
      page: pageInt,
      pageSize: pageSizeInt,
      transactions: formatted,
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Transaction - buy
// If Node version <18，need import node-fetch
// const fetch = require('node-fetch');

// Function to fetch real-time stock price
async function fetchPrice(symbol) {
  const res = await fetch(`http://localhost:3000/api/stock/quote/${symbol}`);
  if (!res.ok) return null;
  const data = await res.json();
  return parseFloat(data.close);
}

// Buy API
app.post("/api/user/:userId/buy", async (req, res) => {
  const { userId } = req.params;
  let { symbol, quantity } = req.body;

  symbol = symbol.toUpperCase();
  const q = parseFloat(quantity);
  if (!symbol || isNaN(q) || q <= 0) {
    return res.status(400).json({ error: "Invalid symbol or quantity" });
  }
  //声明连接
  let conn;

  try {
    const price = await fetchPrice(symbol);
    console.log(`Fetched price for ${symbol}: ${price}`);
    if (!price) return res.status(404).json({ error: "Stock price not found" });

    const totalCost = price * q;

    conn = await db.getConnection();
    await conn.beginTransaction();

    // 获取现金余额
    const [cashRows] = await conn.execute(
      `SELECT quantity FROM assets WHERE user_id = ? AND asset_type = 'cash' AND symbol = 'USD'`,
      [userId]
    );
    const cash = parseFloat(cashRows[0]?.quantity || 0);

    if (cash < totalCost) {
      await conn.rollback();
      return res.status(400).json({ error: "Insufficient cash balance" });
    }

    // 查询是否已有该股票
    const [stockRows] = await conn.execute(
      `SELECT quantity, average_price FROM assets WHERE user_id = ? AND asset_type = 'stock' AND symbol = ?`,
      [userId, symbol]
    );
    const stock = stockRows[0];

    if (stock) {
      const newQty = parseFloat(stock.quantity) + q;
      const newAvgPrice =
        (parseFloat(stock.quantity) * parseFloat(stock.average_price) +
          totalCost) /
        newQty;

      await conn.execute(
        `UPDATE assets SET quantity = ?, average_price = ? WHERE user_id = ? AND asset_type = 'stock' AND symbol = ?`,
        [newQty, newAvgPrice, userId, symbol]
      );
    } else {
      await conn.execute(
        `INSERT INTO assets (user_id, asset_type, symbol, quantity, average_price) VALUES (?, 'stock', ?, ?, ?)`,
        [userId, symbol, q, price]
      );
    }

    // 扣除现金
    await conn.execute(
      `UPDATE assets SET quantity = quantity - ? WHERE user_id = ? AND asset_type = 'cash' AND symbol = 'USD'`,
      [totalCost, userId]
    );

    // 写入交易记录
    await conn.execute(
      `INSERT INTO transactions (user_id, symbol, type, quantity, price) VALUES (?, ?, 'buy', ?, ?)`,
      [userId, symbol, q, price]
    );

    await conn.commit();
    res.json({
      success: true,
      symbol,
      quantity: q,
      price,
      totalCost,
    });
  } catch (err) {
    console.error("Buy error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (conn) conn.release();
  }
});

// Sell API
app.post("/api/user/:userId/sell", async (req, res) => {
  const { userId } = req.params;
  let { symbol, quantity } = req.body;

  symbol = symbol.toUpperCase();
  const q = parseFloat(quantity);
  if (!symbol || isNaN(q) || q <= 0) {
    return res.status(400).json({ error: "Invalid symbol or quantity" });
  }
  let conn;

  try {
    const price = await fetchPrice(symbol);
    console.log(`Fetched price for ${symbol}: ${price}`);
    if (!price) return res.status(404).json({ error: "Stock price not found" });

    const totalRevenue = price * q;

    conn = await db.getConnection(); // 从连接池中获取连接

    // 开始事务
    await conn.beginTransaction();

    // 查询持有的该股票
    const [stockRows] = await conn.execute(
      `SELECT quantity FROM assets WHERE user_id = ? AND asset_type = 'stock' AND symbol = ?`,
      [userId, symbol]
    );
    const stock = stockRows[0];
    const heldQty = parseFloat(stock?.quantity || 0);

    if (heldQty < q) {
      await conn.rollback();
      return res.status(400).json({ error: "Insufficient stock holdings" });
    }

    if (heldQty === q) {
      // 全部卖出就删除记录
      await conn.execute(
        `DELETE FROM assets WHERE user_id = ? AND asset_type = 'stock' AND symbol = ?`,
        [userId, symbol]
      );
    } else {
      // 部分卖出就更新数量
      await conn.execute(
        `UPDATE assets SET quantity = quantity - ? WHERE user_id = ? AND asset_type = 'stock' AND symbol = ?`,
        [q, userId, symbol]
      );
    }

    // 增加现金
    await conn.execute(
      `UPDATE assets SET quantity = quantity + ? WHERE user_id = ? AND asset_type = 'cash' AND symbol = 'USD'`,
      [totalRevenue, userId]
    );

    // 写入交易记录
    await conn.execute(
      `INSERT INTO transactions (user_id, symbol, type, quantity, price) VALUES (?, ?, 'sell', ?, ?)`,
      [userId, symbol, q, price]
    );

    await conn.commit();
    res.json({
      success: true,
      symbol,
      quantity: q,
      price,
      totalRevenue,
    });
  } catch (err) {
    console.error("Sell error:", err.message);
    await conn.rollback();
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (conn) conn.release();
  }
});

// List stock holdings for sell
app.get("/api/user/:userId/held-stocks", async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.execute(
      `SELECT symbol FROM assets WHERE user_id = ? AND asset_type = 'stock' AND quantity > 0`,
      [userId]
    );
    const symbols = rows.map((row) => row.symbol);
    res.json({ success: true, symbols });
  } catch (err) {
    console.error("Held stocks fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch held stocks" });
  }
});

// Start server
app.listen(port, () => {
  console.log(
    `Personal Asset Management System running at http://localhost:${port}`
  );
  console.log("Stock market API ready - Using Twelve Data API");
});
