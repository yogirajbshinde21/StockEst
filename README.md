# StockEst - Stock Market Simulator for Rural Education

A comprehensive MERN stack platform that provides a realistic stock market simulation experience designed specifically for rural education. Users start with ₹100,000 in virtual money and can practice trading with real-time stock data from the Upstox API.

## 🎯 Features

### Core Trading Features
- **Virtual Trading**: Start with ₹100,000 virtual money
- **Real-time Data**: Live stock prices from Upstox API
- **Portfolio Management**: Track holdings, P&L, and transaction history
- **Market Orders**: Buy and sell stocks with instant execution
- **Live Updates**: Real-time price updates via Socket.io
- **Transaction History**: Complete record of all trades

### Educational Focus
- **Simple Interface**: Designed for rural users and beginners
- **Mobile-Responsive**: Works perfectly on smartphones and tablets
- **Educational Content**: Learn stock market basics through practice
- **Hindi/English Support**: Multilingual interface support
- **Offline-Ready**: Progressive Web App capabilities

### Technical Features
- **JWT Authentication**: Secure user registration and login
- **Real-time Communication**: Socket.io for live price updates
- **Database Persistence**: MongoDB for user data and portfolios
- **API Integration**: Upstox market data integration
- **Responsive Design**: Mobile-first approach for rural connectivity

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **node-cron** - Scheduled tasks
- **Upstox API** - Stock market data

### Frontend
- **React.js** - Frontend library
- **React Router** - Navigation
- **Context API** - State management
- **Socket.io Client** - Real-time updates
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **Axios** - HTTP client

## 🚀 Quick Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/stockest-scratch.git
cd stockest-scratch
```

### 2. Environment Setup

#### Backend Environment
```bash
cd backend
cp .env.example .env
# Edit .env with your actual API keys and configuration
```

#### Frontend Environment  
```bash
cd frontend
cp .env.example .env
# Edit .env with your configuration
```

### 3. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 4. Start Development Servers
```bash
# Start backend (Terminal 1)
cd backend
npm run dev

# Start frontend (Terminal 2)
cd frontend
npm start
```

## 🔑 Required API Keys

To run this project, you'll need:

1. **Upstox API** - For real-time stock data
   - Sign up at [Upstox Developer Console](https://developer.upstox.com/)
   - Get API Key, Secret, and Access Token

2. **Google Gemini API** - For AI chatbot
   - Get API key from [Google AI Studio](https://aistudio.google.com/)

3. **Perplexity API** - For financial news
   - Sign up at [Perplexity API](https://docs.perplexity.ai/)

4. **MongoDB** - Database
   - Use local MongoDB or [MongoDB Atlas](https://www.mongodb.com/atlas)

## 📁 Project Structure

```
stockest/
├── backend/
│   ├── models/
│   │   ├── User.js              # User schema with portfolio
│   │   └── StockPrice.js        # Stock price history schema
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── stocks.js            # Stock data routes
│   │   └── trading.js           # Trading operations routes
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── services/
│   │   └── stockDataService.js  # Upstox API integration
│   ├── server.js                # Main server file
│   ├── package.json
│   └── .env
├── frontend/
│   ├── public/
│   │   └── index.html           # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── StockList.js     # Stock listing component
│   │   │   ├── Portfolio.js     # Portfolio management
│   │   │   ├── TradingModal.js  # Trading interface
│   │   │   ├── StockList.css    # Component styles
│   │   │   ├── Portfolio.css
│   │   │   └── TradingModal.css
│   │   ├── context/
│   │   │   ├── AuthContext.js   # Authentication context
│   │   │   └── SocketContext.js # Socket.io context
│   │   ├── pages/
│   │   │   ├── Login.js         # Login page
│   │   │   ├── Register.js      # Registration page
│   │   │   ├── Dashboard.js     # Main dashboard
│   │   │   ├── Auth.css         # Auth pages styles
│   │   │   └── Dashboard.css    # Dashboard styles
│   │   ├── App.js               # Main app component
│   │   ├── App.css              # Global styles
│   │   └── index.js             # React entry point
│   ├── package.json
│   └── README.md
├── accessToken.txt              # Your Upstox access token
├── start.js                     # Original API integration script
├── package.json                 # Root package.json
└── README.md                    # This file
```

## 🔧 Configuration

### Backend Configuration Options

#### Database Settings
- `MONGODB_URI`: MongoDB connection string
- For local MongoDB: `mongodb://localhost:27017/stockest`
- For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/stockest`

#### JWT Settings
- `JWT_SECRET`: Strong secret key for token signing
- `JWT_EXPIRE`: Token expiration time (e.g., "30d", "7d", "24h")

#### API Settings
- `UPSTOX_API_KEY`: Your Upstox API key
- `UPSTOX_ACCESS_TOKEN`: Your Upstox access token
- `RATE_LIMIT_WINDOW`: Rate limiting window in minutes
- `RATE_LIMIT_MAX`: Maximum requests per window

### Frontend Configuration
The frontend automatically connects to the backend on `http://localhost:5000`. To change this, update the base URL in the axios configuration in `AuthContext.js`.

## 🎮 Usage Guide

### For Students/Users

#### 1. Registration & Login
- Visit the platform and create a new account
- Verify your email (if email verification is enabled)
- Login with your credentials

#### 2. Dashboard Overview
- View your virtual cash balance (starts at ₹100,000)
- See your portfolio value and P&L
- Monitor market highlights and top gainers/losers

#### 3. Stock Trading
- Browse available stocks in the market
- Search for specific stocks by symbol or name
- Click "Buy" to purchase stocks
- Enter quantity and confirm the order
- View your holdings in the Portfolio section

#### 4. Portfolio Management
- Track your stock holdings and their performance
- View profit/loss for each stock
- Sell stocks when needed
- Monitor transaction history

### For Educators

#### 1. Setting Up the Platform
- Deploy the platform on a local server or cloud
- Configure user registration settings
- Set up initial stock data and market hours

#### 2. Creating Learning Scenarios
- Use the platform to demonstrate trading concepts
- Create sample portfolios for demonstration
- Monitor student progress through their portfolios

#### 3. Teaching Materials
- The platform serves as a hands-on learning tool
- Students can practice without financial risk
- Real market data provides authentic experience

## 🔌 API Endpoints

### Authentication Routes
```
POST /api/auth/register    # User registration
POST /api/auth/login       # User login
GET  /api/auth/profile     # Get user profile
PUT  /api/auth/profile     # Update user profile
```

### Stock Data Routes
```
GET  /api/stocks           # Get all stocks
GET  /api/stocks/:symbol   # Get specific stock data
GET  /api/stocks/search    # Search stocks
```

### Trading Routes
```
POST /api/trading/buy      # Buy stocks
POST /api/trading/sell     # Sell stocks
GET  /api/trading/portfolio # Get user portfolio
GET  /api/trading/transactions # Get transaction history
```

## 🔄 Real-time Features

### Socket.io Events

#### Client Events (Frontend → Backend)
- `join_room`: Join user-specific room for updates
- `request_price_update`: Request latest prices

#### Server Events (Backend → Frontend)
- `price_update`: Real-time price updates
- `portfolio_update`: Portfolio value changes
- `market_status`: Market open/close status
- `connection_status`: Connection state updates

## 🛡️ Security Features

### Authentication & Authorization
- JWT-based authentication
- Password hashing with bcryptjs
- Protected routes and API endpoints
- Session management

### Data Protection
- Input validation and sanitization
- Rate limiting to prevent abuse
- CORS configuration for frontend access
- Environment variable protection

### API Security
- API key management for Upstox integration
- Rate limiting for external API calls
- Error handling without exposing sensitive data

## 📱 Mobile Responsiveness

The platform is designed with a mobile-first approach:

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile Optimizations
- Touch-friendly interface
- Optimized layouts for small screens
- Fast loading on slow connections
- Offline capabilities (Progressive Web App)

## 🚀 Deployment

### Development Deployment

#### Local Development
```bash
# Start MongoDB
mongod

# Start backend (Terminal 1)
cd backend
npm run dev

# Start frontend (Terminal 2)
cd frontend
npm start
```

### Production Deployment

#### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start ecosystem.config.js

# Build and serve frontend
cd frontend
npm run build
pm2 serve build 3000 --spa
```

#### Using Docker
```bash
# Build and run with Docker Compose
docker-compose up -d
```

#### Environment Setup for Production
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-super-secure-production-secret
FRONTEND_URL=https://your-domain.com
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

### API Testing
Use tools like Postman or curl to test API endpoints:

```bash
# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🐛 Troubleshooting

### Common Issues

#### Backend Issues
1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **Upstox API Errors**
   - Verify API credentials in `.env`
   - Check access token validity
   - Ensure API rate limits are not exceeded

3. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing processes: `lsof -ti:5000 | xargs kill -9`

#### Frontend Issues
1. **API Connection Errors**
   - Verify backend is running on correct port
   - Check CORS configuration
   - Ensure correct API base URL

2. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Clear cache: `npm start -- --reset-cache`

#### Authentication Issues
1. **JWT Token Errors**
   - Check JWT_SECRET in environment
   - Verify token expiration settings
   - Clear browser localStorage

### Debug Mode
Enable debug logging:
```bash
# Backend debug mode
DEBUG=stockest:* npm run dev

# Frontend development mode
REACT_APP_DEBUG=true npm start
```

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests for new features
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Submit a pull request

### Code Style
- Follow ESLint configuration
- Use Prettier for code formatting
- Add comments for complex logic
- Write meaningful commit messages

### Testing Guidelines
- Add unit tests for new features
- Ensure all existing tests pass
- Test on multiple devices and browsers
- Verify API endpoints work correctly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Upstox API** for providing real-time market data
- **MongoDB** for database solutions
- **React.js** and **Node.js** communities
- **Educational institutions** inspiring this rural education focus

## 📞 Support

### Documentation
- [API Documentation](docs/api.md)
- [Frontend Guide](docs/frontend.md)
- [Deployment Guide](docs/deployment.md)

### Getting Help
- Create an issue on GitHub
- Check existing documentation
- Review troubleshooting section
- Contact the development team

### Feature Requests
We welcome feature requests that align with our educational mission:
- Enhanced educational content
- Better mobile experience
- Multilingual support
- Additional market data
- Improved user interface

---

**Built with ❤️ for rural education and financial literacy**

Start your stock market learning journey today with StockEst! 🚀📈
