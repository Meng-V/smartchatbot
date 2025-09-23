# 🤖 SmartChatbot - AI Library Assistant

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22-green" alt="Node.js" />
  <img src="https://img.shields.io/badge/NestJS-11-red" alt="NestJS" />
  <img src="https://img.shields.io/badge/React-19-blue" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7-purple" alt="Vite" />
  <img src="https://img.shields.io/badge/Prisma-6.15-indigo" alt="Prisma" />
  <img src="https://img.shields.io/badge/Docker-Ready-blue" alt="Docker" />
  <img src="https://img.shields.io/badge/LibCal-Integration-orange" alt="LibCal" />
  <img src="https://img.shields.io/badge/Production-Ready-purple" alt="Production Ready" />
</p>

**SmartChatbot** is a production-ready AI library assistant built for Miami University Libraries. It provides intelligent chat assistance with room reservations, library hours, research help, message rating functionality, automated error recovery, and seamless fallback to human librarians when AI cannot help.

## 🎯 Problems We Solve

**SmartChatbot** addresses critical challenges in modern library services:

- **24/7 Availability**: Provides instant assistance when librarians aren't available
- **Scalable Support**: Handles multiple users simultaneously without wait times
- **Consistent Information**: Delivers accurate, up-to-date library information
- **Seamless Integration**: Works with existing library systems (LibCal, Neon database)
- **Intelligent Error Recovery**: Self-healing architecture with automatic restart capabilities
- **User Feedback System**: Message rating and conversation feedback collection
- **Intelligent Routing**: Knows when to escalate to human librarians
- **Accessibility**: Ensures all users can access library services easily

## ✨ Core Features

### 🤖 **AI-Powered Assistance**
- **Smart Conversations**: OpenAI integration with library-specific knowledge and custom prompts
- **Room Reservations**: Direct LibCal API integration for booking study rooms
- **Library Information**: Real-time hours, services, and facility information
- **Research Support**: Intelligent help with academic research queries
- **Contextual Memory**: Maintains conversation context for natural interactions
- **Message Rating**: Users can rate AI responses with thumbs up/down for continuous improvement

### 🔄 **Production Reliability**
- **Auto-Restart System**: Self-healing architecture with graceful error recovery and configurable restart limits
- **Health Monitoring**: Real-time system health checks with database, OpenAI, and external API monitoring
- **Performance Tracking**: Memory usage, connection monitoring, WebSocket performance analytics
- **Error Monitoring**: Comprehensive error tracking with automatic restart triggers and fallback mechanisms
- **Database Cleanup**: Automated cleanup service prevents database pollution from health checks
- **Human Handoff**: Seamless transition to live librarians with intelligent error detection
- **Manual Restart**: Administrative restart capability via health endpoints

### ⚡ **High Performance**
- **Real-time Chat**: WebSocket-based instant messaging with Socket.io
- **Parallel Processing**: Optimized database and AI operations with async/await patterns
- **Memory Management**: Automatic cleanup, garbage collection, and WebSocket memory monitoring
- **Rate Limiting**: Protection against abuse (30 messages/minute per IP)
- **Connection Pooling**: Efficient Neon database connection management with Prisma ORM
- **Token Usage Tracking**: Automatic OpenAI token usage monitoring and logging
- **Conversation Feedback**: Real-time feedback collection and persistence  

## 🏗️ Technical Architecture

### Backend Stack
- **Framework**: NestJS 11 with TypeScript 5
- **Database**: Neon serverless PostgreSQL with Prisma ORM 6.15
- **AI Integration**: OpenAI API with custom conversation prompts
- **Library Integration**: LibCal API for room reservations and authentication
- **Search**: Google Custom Search API integration
- **Real-time**: WebSocket gateway with Socket.io and memory monitoring
- **Runtime**: Node.js 22
- **Monitoring**: Health checks, error monitoring, and auto-restart services
- **Scheduling**: Cron-based database cleanup and maintenance tasks

### Frontend Stack
- **Framework**: React 19 with Vite 7
- **UI Library**: Chakra UI components with custom styling
- **Real-time**: Socket.io client with automatic reconnection
- **State Management**: React Context with message and socket providers
- **Build Tool**: Vite for fast development and production builds
- **Components**: Message rating, feedback forms, human librarian widget, error boundaries
- **Features**: Real-time typing indicators, markdown support, link parsing

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose with Nginx reverse proxy
- **Auto-restart**: Advanced shell script with health monitoring, crash detection, and restart limits
- **Monitoring**: Comprehensive health endpoints, metrics dashboard, and error tracking
- **Deployment**: Production-ready deployment scripts with build optimization
- **Testing**: Jest with unit, integration, and E2E test suites
- **Code Quality**: ESLint, Prettier, and pre-commit hooks

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (recommended)
- Node.js 22+ (for local development)
- OpenAI API Key
- LibCal API credentials (Client ID & Secret)
- Neon Database URL
- Google Custom Search API credentials (optional)

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
GOOGLE_API_KEY="your-google-api-key"
GOOGLE_LIBRARY_SEARCH_CSE_ID="your-custom-search-engine-id"

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

4. **Interactive Features**
   - Rate AI responses with thumbs up/down buttons
   - Provide conversation feedback at the end of sessions
   - Real-time typing indicators and message status

5. **Fallback to Human**
   - When AI can't help, users get "Talk to a real librarian" option
   - Automatic fallback on connection errors or system issues
   - Seamless handoff for complex questions

### System Health & Monitoring
```bash
# Check application health
curl http://localhost:3000/health

# View detailed system status
curl http://localhost:3000/health/status

# Check restart status and history
curl http://localhost:3000/health/restart-status

# Test manual restart (admin only)
curl -X POST http://localhost:3000/health/restart

# View real-time metrics
curl http://localhost:3000/metrics

# Check readiness for Kubernetes
curl http://localhost:3000/readiness
```

## 📚 API Reference

### Health & Monitoring
- `GET /health` - Application health status with service checks
- `GET /health/status` - Detailed system status and restart information
- `GET /health/restart-status` - Auto-restart attempts and cooldown status
- `POST /health/restart` - Manual restart trigger (admin)
- `GET /metrics` - Performance metrics and system stats
- `GET /readiness` - Kubernetes readiness probe

### WebSocket Events
- `message` - Send/receive chat messages with conversation context
- `messageRating` - Rate AI responses (thumbs up/down)
- `userFeedback` - Submit conversation feedback with ratings
- `messageIdUpdate` - Update temporary message IDs with database IDs
- `connectionStatus` - Real-time connection status updates
- `typing` - Typing indicators for enhanced UX

## 🛠️ Development

### Local Development
```bash
# Backend development
npm run start:dev

# Frontend development
cd client && npm run start

# Run tests
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests

# Code quality
npm run lint              # ESLint check
npm run format            # Prettier formatting
```

### Production Deployment
```bash
# Full deployment with auto-restart
bash auto-restart.sh

# Development mode
bash auto-restart.sh --dev

# Skip builds (faster restarts)
bash auto-restart.sh --skip-build
```

For detailed development and deployment instructions, see:
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Complete setup and deployment guide
- **[MANUAL_RESTART_TESTING_GUIDE.md](MANUAL_RESTART_TESTING_GUIDE.md)** - Manual restart testing procedures
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
