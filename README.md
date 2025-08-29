# 🤖 SmartChatbot - AI Library Assistant

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18-green" alt="Node.js" />
  <img src="https://img.shields.io/badge/NestJS-11-red" alt="NestJS" />
  <img src="https://img.shields.io/badge/React-18-blue" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Docker-Ready-blue" alt="Docker" />
  <img src="https://img.shields.io/badge/LibCal-Integration-orange" alt="LibCal" />
  <img src="https://img.shields.io/badge/Production-Ready-purple" alt="Production Ready" />
</p>

**SmartChatbot** is a production-ready AI library assistant built for Miami University Libraries. It provides intelligent chat assistance with room reservations, library hours, research help, and seamless fallback to human librarians when AI cannot help.

## 🎯 Problems We Solve

**SmartChatbot** addresses critical challenges in modern library services:

- **24/7 Availability**: Provides instant assistance when librarians aren't available
- **Scalable Support**: Handles multiple users simultaneously without wait times
- **Consistent Information**: Delivers accurate, up-to-date library information
- **Seamless Integration**: Works with existing library systems (LibCal, databases)
- **Intelligent Routing**: Knows when to escalate to human librarians
- **Accessibility**: Ensures all users can access library services easily

## ✨ Core Features

### 🤖 **AI-Powered Assistance**
- **Smart Conversations**: OpenAI GPT-4 integration with library-specific knowledge
- **Room Reservations**: Direct LibCal API integration for booking study rooms
- **Library Information**: Real-time hours, services, and facility information
- **Research Support**: Intelligent help with academic research queries
- **Contextual Memory**: Maintains conversation context for natural interactions

### 🔄 **Production Reliability**
- **Auto-Restart System**: Self-healing architecture with graceful error recovery
- **Health Monitoring**: Real-time system health checks and alerts
- **Performance Tracking**: Memory usage, connection monitoring, and optimization
- **Error Handling**: Comprehensive error tracking with fallback mechanisms
- **Human Handoff**: Seamless transition to live librarians when needed

### ⚡ **High Performance**
- **Real-time Chat**: WebSocket-based instant messaging
- **Parallel Processing**: Optimized database and AI operations
- **Memory Management**: Automatic cleanup and garbage collection
- **Rate Limiting**: Protection against abuse (30 messages/minute per IP)
- **Connection Pooling**: Efficient database connection management  

## 🏗️ Technical Architecture

### Backend Stack
- **Framework**: NestJS 11 with TypeScript 5
- **Database**: Neon serverless PostgreSQL with Prisma ORM
- **AI Integration**: OpenAI GPT-4 API
- **Library Integration**: LibCal API for room reservations
- **Search**: Google Custom Search API
- **Real-time**: WebSocket gateway with Socket.io
- **Runtime**: Node.js 18

### Frontend Stack
- **Framework**: React 18 with Vite
- **UI Library**: Chakra UI components
- **Real-time**: Socket.io client
- **State Management**: React Context
- **Build Tool**: Vite for fast development

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose with Nginx
- **Auto-restart**: Custom shell script with health monitoring
- **Monitoring**: Health endpoints, metrics, and error tracking

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (recommended)
- Node.js 18+ (for local development)
- OpenAI API Key
- LibCal API credentials
- Neon Database URL

### One-Command Setup
```bash
# Clone and start with auto-restart script
git clone <your-repo-url>
cd smartchatbot
cp .env.example .env
# Edit .env with your API keys
bash auto-restart.sh
```

### Access Points
- **Frontend**: http://localhost (Nginx serves React app)
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics

## 🔧 Environment Setup

Required environment variables in `.env`:

```env
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# OpenAI Integration
OPENAI_API_KEY="sk-your-openai-key"

# LibCal Integration (for room reservations)
LIBCAL_CLIENT_ID="your-libcal-client-id"
LIBCAL_CLIENT_SECRET="your-libcal-client-secret"

# Google Search Integration
GOOGLE_CUSTOM_SEARCH_API_KEY="your-google-key"
GOOGLE_CUSTOM_SEARCH_ENGINE_ID="your-engine-id"

# Application Configuration
NODE_ENV="production"
FRONTEND_URL="https://your-domain.com"
```

## 🧪 Testing Features

### Library Assistant Capabilities
1. **Room Reservations**
   - "I need to book a study room for tomorrow"
   - "What rooms are available this afternoon?"

2. **Library Information**
   - "What are your hours today?"
   - "Where is the reference desk?"

3. **Research Help**
   - "Help me find sources on climate change"
   - "How do I access academic databases?"

4. **Fallback to Human**
   - When AI can't help, users get "Talk to a real librarian" option
   - Seamless handoff for complex questions

### System Health
```bash
# Check application health
curl http://localhost:3000/health

# View real-time metrics
curl http://localhost:3000/metrics

# Test auto-restart (manual trigger)
curl -X POST http://localhost:3000/health/restart
```

## 📚 API Reference

### Health & Monitoring
- `GET /health` - Application health status
- `GET /metrics` - Performance metrics
- `GET /readiness` - Kubernetes readiness probe
- `POST /health/restart` - Manual restart trigger

### WebSocket Events
- `message` - Send/receive chat messages
- `messageRating` - Rate AI responses
- `userFeedback` - Submit conversation feedback

## 🛠️ Development

For detailed development and deployment instructions, see:
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Complete setup and deployment guide
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing instructions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm run test`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**🚀 Ready to enhance your library services with AI? Get started in minutes!**
