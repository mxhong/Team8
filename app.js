import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Setting up directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Add JSON parsing middleware
app.use(express.json());

// Twelve Data API configuration
const TWELVE_DATA_API_KEY = '43230254888343009b1591f9b3c06f5e'; // Replace with your actual API key
const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

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

// Get stock intraday data
app.get('/api/stock/intraday/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '5min', outputsize = '30' } = req.query;
    
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
      return res.status(404).json({ error: 'Intraday data not found' });
    }
    
    // Return original API response
    res.json(data);
    
  } catch (error) {
    console.error('Failed to get intraday data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get stock daily data
app.get('/api/stock/daily/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { outputsize = '30' } = req.query;
    
    const url = `${TWELVE_DATA_BASE_URL}/time_series?symbol=${symbol}&interval=1day&outputsize=${outputsize}&apikey=${TWELVE_DATA_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code && data.status === 'error') {
      return res.status(data.code).json({ 
        error: 'API request failed',
        details: data.message
      });
    }
    
    if (!data.values || !data.meta) {
      return res.status(404).json({ error: 'Daily data not found' });
    }
    
    // Return original API response
    res.json(data);
    
  } catch (error) {
    console.error('Failed to get daily data:', error);
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

// Start server
app.listen(port, () => {
  console.log(`Personal Asset Management System running at http://localhost:${port}`);
  console.log('Stock market API ready - Using Twelve Data API');
});

