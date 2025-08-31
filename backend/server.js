const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const stockRoutes = require('./routes/stocks');
const tradingRoutes = require('./routes/trading');
const newsRoutes = require('./routes/news');
const chatbotRoutes = require('./routes/chatbot');
const watchlistRoutes = require('./routes/watchlist');
const achievementRoutes = require('./routes/achievements');
const analysisRoutes = require('./routes/analysis');

// Import services
const stockDataService = require('./services/stockDataService');
const newsScheduler = require('./utils/newsScheduler');
const HistoricalDataService = require('./services/HistoricalDataService');

// Import middleware
const { auth } = require('./middleware/auth');

class StockSimulatorServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://yourdomain.com'] 
          : ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST']
      }
    });
    
    this.port = process.env.PORT || 5000;
    this.connectedUsers = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.setupDatabase();
    this.setupStockDataService();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS middleware
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
      }
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check route
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Stock Simulator API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/stocks', stockRoutes);
    this.app.use('/api/trading', tradingRoutes);
    this.app.use('/api/news', newsRoutes);
    this.app.use('/api/chatbot', chatbotRoutes);
    this.app.use('/api/watchlist', watchlistRoutes);
    this.app.use('/api/achievements', achievementRoutes);
    this.app.use('/api/analysis', analysisRoutes);

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'API endpoint not found'
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('❌ Global error handler:', error);
      
      res.status(error.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message || 'Something went wrong'
      });
    });

    // Catch-all handler for non-API routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    });
  }

  /**
   * Setup Socket.IO for real-time stock updates
   */
  setupSocketIO() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      // Handle user authentication for socket
      socket.on('authenticate', async (token) => {
        try {
          if (token) {
            const { validateToken } = require('./middleware/auth');
            const decoded = validateToken(token);
            
            if (decoded) {
              const User = require('./models/User');
              const user = await User.findById(decoded.userId);
              
              if (user) {
                socket.userId = user._id.toString();
                socket.userEmail = user.email;
                this.connectedUsers.set(socket.id, {
                  userId: user._id.toString(),
                  email: user.email,
                  connectedAt: new Date()
                });
                
                console.log(`✅ User authenticated via socket: ${user.email}`);
                socket.emit('authenticated', { success: true, user: user.toJSON() });
              }
            }
          }
        } catch (error) {
          console.error('❌ Socket authentication error:', error);
          socket.emit('authenticated', { success: false, message: 'Authentication failed' });
        }
      });

      // Handle real-time stock data requests
      socket.on('subscribe-stocks', async () => {
        try {
          socket.join('stock-updates');
          const stockData = await stockDataService.getFormattedPriceData();
          socket.emit('stock-data', stockData);
          
          const subscribersCount = this.io.sockets.adapter.rooms.get('stock-updates')?.size || 0;
          console.log(`📈 User subscribed to stock updates: ${socket.id} (Total subscribers: ${subscribersCount})`);
        } catch (error) {
          console.error('❌ Error subscribing to stocks:', error);
          socket.emit('error', { message: 'Failed to subscribe to stock updates' });
        }
      });

      socket.on('unsubscribe-stocks', () => {
        socket.leave('stock-updates');
        console.log(`📉 User unsubscribed from stock updates: ${socket.id}`);
      });

      // Handle portfolio updates
      socket.on('subscribe-portfolio', () => {
        if (socket.userId) {
          socket.join(`portfolio-${socket.userId}`);
          console.log(`💼 User subscribed to portfolio updates: ${socket.userEmail}`);
        }
      });

      socket.on('unsubscribe-portfolio', () => {
        if (socket.userId) {
          socket.leave(`portfolio-${socket.userId}`);
          console.log(`💼 User unsubscribed from portfolio updates: ${socket.userEmail}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (this.connectedUsers.has(socket.id)) {
          const user = this.connectedUsers.get(socket.id);
          console.log(`🔌 User disconnected: ${user.email} (${socket.id})`);
          this.connectedUsers.delete(socket.id);
        } else {
          console.log(`🔌 Unknown user disconnected: ${socket.id}`);
        }
      });
    });

    console.log('✅ Socket.IO server initialized');
  }

  /**
   * Setup MongoDB database connection
   */
  async setupDatabase() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stock-simulator';
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log('✅ Connected to MongoDB');

      // Handle MongoDB connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  /**
   * Setup stock data service and cron jobs
   */
  async setupStockDataService() {
    try {
      // Initialize stock data
      await stockDataService.initializeStocks();
      console.log('✅ Stock data service initialized');

      // Setup cron job for stock price updates (every 30 seconds during market hours)
      const updateInterval = process.env.STOCK_UPDATE_INTERVAL || 30000;
      
      cron.schedule('*/30 * * * * *', async () => {
        try {
          if (stockDataService.isMarketOpen()) {
            console.log(`🔄 Attempting stock price update at ${new Date().toLocaleTimeString()}`);
            const updatedPrices = await stockDataService.updateStockPrices();
            
            if (updatedPrices.length > 0) {
              // Broadcast updated prices to all connected clients
              const stockData = await stockDataService.getFormattedPriceData();
              this.io.to('stock-updates').emit('stock-data', stockData);
              console.log(`📡 Broadcasted stock data to ${this.io.sockets.adapter.rooms.get('stock-updates')?.size || 0} connected clients`);
              
              // Update user portfolios with new prices
              await this.updateUserPortfolios(updatedPrices);
            } else {
              console.log('⚠️ No stock price updates received from API');
            }
          } else {
            console.log('🕐 Market is closed - skipping stock update');
          }
        } catch (error) {
          console.error('❌ Scheduled stock update error:', error.message);
        }
      });

      console.log('✅ Stock price update scheduler started');

      // Start news scheduler
      newsScheduler.startScheduler();
      console.log('✅ News scheduler started for Perplexity API');

      // Setup cron job for historical data refresh (daily at 4:00 PM IST, after market close)
      cron.schedule('0 16 * * 1-5', async () => {
        try {
          console.log('🔄 Starting daily historical data refresh...');
          await HistoricalDataService.bulkRefreshData();
          console.log('✅ Daily historical data refresh completed');
        } catch (error) {
          console.error('❌ Historical data refresh error:', error.message);
        }
      }, {
        timezone: "Asia/Kolkata"
      });

      console.log('✅ Historical data refresh scheduler started (weekdays 4:00 PM IST)');

      // Initial price update
      if (stockDataService.isMarketOpen()) {
        setTimeout(async () => {
          try {
            const updatedPrices = await stockDataService.updateStockPrices();
            
            if (updatedPrices.length > 0) {
              // Broadcast initial stock data to all connected clients
              const stockData = await stockDataService.getFormattedPriceData();
              this.io.to('stock-updates').emit('stock-data', stockData);
              console.log('✅ Initial stock prices updated and broadcasted');
            } else {
              console.log('✅ Initial stock prices updated');
            }
          } catch (error) {
            console.error('❌ Initial stock update error:', error);
          }
        }, 5000); // Wait 5 seconds before first update
      }

    } catch (error) {
      console.error('❌ Stock data service setup failed:', error);
    }
  }

  /**
   * Update user portfolios with new stock prices
   */
  async updateUserPortfolios(updatedPrices) {
    try {
      const User = require('./models/User');
      
      // Create price map
      const stockPrices = {};
      updatedPrices.forEach(stock => {
        stockPrices[stock.instrumentKey] = stock.currentPrice;
      });

      // Find users with portfolios containing updated stocks
      const instrumentKeys = updatedPrices.map(stock => stock.instrumentKey);
      const usersWithStocks = await User.find({
        'portfolio.instrumentKey': { $in: instrumentKeys }
      });

      // Update portfolios and emit updates
      for (const user of usersWithStocks) {
        user.updatePortfolioValues(stockPrices);
        await user.save();

        // Emit portfolio update to connected user
        this.io.to(`portfolio-${user._id.toString()}`).emit('portfolio-update', {
          portfolio: user.portfolio,
          summary: {
            totalInvested: user.totalInvested,
            currentValue: user.totalPortfolioValue,
            totalProfitLoss: user.totalProfitLoss,
            totalProfitLossPercent: user.totalProfitLossPercent,
            cashBalance: user.virtualBalance,
            totalBalance: user.getTotalBalance()
          },
          lastUpdated: new Date()
        });
      }

      if (usersWithStocks.length > 0) {
        console.log(`📊 Updated portfolios for ${usersWithStocks.length} users`);
      }

    } catch (error) {
      console.error('❌ Error updating user portfolios:', error);
    }
  }

  /**
   * Start the server
   */
  start() {
    this.server.listen(this.port, () => {
      console.log('🚀========================================🚀');
      console.log(`🎯 Stock Simulator API Server Started`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Server: http://localhost:${this.port}`);
      console.log(`📊 Health Check: http://localhost:${this.port}/health`);
      console.log(`💾 Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/stock-simulator'}`);
      console.log(`📈 Market Status: ${stockDataService.getMarketStatus()}`);
      console.log(`🕐 Server Time: ${new Date().toLocaleString()}`);
      console.log('🚀========================================🚀');
    });

    // Graceful shutdown
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  /**
   * Graceful shutdown
   */
  async shutdown(signal) {
    console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);
    
    try {
      // Close HTTP server
      this.server.close(() => {
        console.log('✅ HTTP server closed');
      });

      // Close Socket.IO server
      this.io.close(() => {
        console.log('✅ Socket.IO server closed');
      });

      // Close MongoDB connection
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new StockSimulatorServer();
server.start();

module.exports = server;
