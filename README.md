# 🤖 The Smart Chatbot Application at Miami University Libraries
[https://new.lib.miamioh.edu/smartchatbot/] https://new.lib.miamioh.edu/smartchatbot/

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22-green" alt="Node.js Version" />
  <img src="https://img.shields.io/badge/NestJS-11-red" alt="NestJS Version" />
  <img src="https://img.shields.io/badge/React-19-blue" alt="React Version" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Docker-Ready-blue" alt="Docker" />
</p>

A modern, full-stack AI-powered chatbot application built with cutting-edge technologies. Experience real-time conversations with AI, enhanced by Google Custom Search integration for up-to-date information retrieval.

## ✨ Features

🚀 **Real-time Chat**: WebSocket-powered instant messaging  
🧠 **AI-Powered**: OpenAI GPT integration for intelligent responses  
🔍 **Smart Search**: Google Custom Search API for current information  
💾 **Persistent Storage**: Neon serverless database with Prisma ORM  
🎨 **Modern UI**: Beautiful React interface with Chakra UI  
🐳 **Docker Ready**: Full containerization with Docker Compose  
⚡ **High Performance**: Node.js 22 with latest optimizations  
🔄 **Scalable**: Load balancer with multiple backend replicas  

## 🏗️ Architecture

### Backend (NestJS + TypeScript)
- **Framework**: NestJS 11 with TypeScript 5
- **Database**: Neon serverless PostgreSQL with Prisma ORM
- **AI Integration**: OpenAI API for chat responses
- **Search**: Google Custom Search API
- **Real-time**: WebSocket gateway for instant messaging
- **Runtime**: Node.js 22 Alpine

### Frontend (React + Vite)
- **Framework**: React 19 with Vite 7
- **UI Library**: Chakra UI for modern components
- **Real-time**: Socket.io client for WebSocket connections
- **Markdown**: Support for rich text responses
- **Build Tool**: Vite for lightning-fast development

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose with Nginx load balancer
- **Scaling**: Multiple backend replicas with health checks
- **SSL Ready**: Nginx configuration for HTTPS

## 🚀 Quick Start

### Prerequisites
- **Docker & Docker Compose** (recommended)
- **Node.js 22+** (for local development)
- **OpenAI API Key**
- **Google Custom Search API Key & Engine ID**
- **Neon Database URL**

### 🐳 Docker Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd smartchatbot
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and database URL
   ```

3. **Start the application**
   ```bash
   # Quick restart script
   ./restart.sh
   
   # Or manually
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost/api
   - Health Check: http://localhost/health

### 💻 Local Development

#### Backend Setup
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run start:dev
```

#### Frontend Setup
```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm run start
```

## 🔧 Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Google Custom Search
GOOGLE_API_KEY="your-google-api-key"
GOOGLE_SEARCH_ENGINE_ID="your-search-engine-id"

# Application
NODE_ENV="development"
PORT=3000
```

## 🧪 Testing the Application

### 🎯 Try These Features

1. **Basic Chat**
   - Open the application in your browser
   - Type "Hello!" and see the AI respond
   - Try asking questions like "What's the weather like?"

2. **Search Integration**
   - Ask "What's the latest news about AI?"
   - Try "Tell me about recent developments in technology"
   - The bot will use Google Search for current information

3. **Real-time Features**
   - Open multiple browser tabs
   - Send messages and see real-time updates
   - Test WebSocket connectivity

4. **Advanced Conversations**
   - Ask complex questions requiring reasoning
   - Request code examples or explanations
   - Test the AI's ability to maintain context

### 🔍 Health Checks

```bash
# Check backend health
curl http://localhost/health

# Check database connection
curl http://localhost/api/health

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 📚 API Documentation

### WebSocket Events
- `message`: Send/receive chat messages
- `connect`: Client connection established
- `disconnect`: Client disconnection

### REST Endpoints
- `GET /health`: Application health status
- `POST /api/chat`: Send chat message (alternative to WebSocket)
- `GET /api/search`: Google Custom Search endpoint

## 🛠️ Development Scripts

### Backend
```bash
npm run start:dev      # Development with hot reload
npm run build          # Build for production
npm run start:prod     # Start production server
npm run test           # Run unit tests
npm run test:e2e       # Run end-to-end tests
npm run lint:fix       # Fix linting issues
```

### Frontend
```bash
npm run start          # Development server
npm run build          # Build for production
npm run preview        # Preview production build
npm run lint           # Check code quality
```

## 🐳 Docker Commands

```bash
# Build and start services
docker-compose up -d

# Rebuild without cache
docker-compose build --no-cache

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Clean up
docker system prune -f
```

## 🚀 Deployment

The application is production-ready with:
- Multi-replica backend scaling
- Nginx load balancer
- Health checks and auto-restart
- SSL/HTTPS ready configuration
- Environment-based configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check database URL format
echo $DATABASE_URL

# Test Prisma connection
npx prisma db pull
```

**API Key Issues**
```bash
# Verify environment variables
docker-compose exec backend env | grep API
```

**Port Conflicts**
```bash
# Check if ports are in use
lsof -i :80 -i :3000 -i :5173
```

### Getting Help

- Check the logs: `docker-compose logs -f`
- Verify environment variables are set correctly
- Ensure all API keys are valid and have proper permissions
- Test database connectivity

---

**Ready to chat with AI? 🚀 Start the application and begin your conversation!**
