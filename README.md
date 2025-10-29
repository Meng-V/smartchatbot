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

## 🚀 Quick Start (No Docker)

### Prerequisites
- Node.js 22+
- OpenAI API key
- PostgreSQL database (Neon recommended) and `DATABASE_URL`
- Weaviate cluster (host + optional API key)
- LibCal API credentials (optional features)
- Google Custom Search API credentials (optional)

### Setup
```bash
# 1) Clone
git clone <your-repo-url>
cd smartchatbot

# 2) Install backend deps and generate Prisma client
npm install
npx prisma generate

# 3) Install frontend deps
cd client && npm install && cd ..

# 4) Copy env and fill values
cp .env.example .env
# Edit .env: DATABASE_URL, OPENAI_API_KEY, FRONTEND_URL, WEAVIATE_HOST, WEAVIATE_API_KEY (if needed), GOOGLE keys (optional)

# 5) Run in development
# Terminal A: backend
npm run start:dev
# Terminal B: frontend
cd client && npm run dev
```

### Access Points (Dev)
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics

## 🔧 Environment Setup

Required environment variables in `.env`:

```env
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# OpenAI Integration
OPENAI_API_KEY="sk-your-openai-key"
OPENAI_ORGANIZATION_ID="org-optional"

# Weaviate (Vector DB)
WEAVIATE_SCHEME="https"
WEAVIATE_HOST="your-cluster.weaviate.network"  # required to enable RAG
WEAVIATE_API_KEY="your-weaviate-key"           # optional if private network

# RAG tuning
RAG_EMBEDDING_MODEL="text-embedding-3-small"
RAG_TOP_K="6"
RAG_HYBRID_ALPHA="0.6"
RAG_MIN_SCORE="0.70"
RAG_DEFAULT_INSTITUTION_ID="miami-oh"          # optional default filter
RAG_DEFAULT_CAMPUS="oxford"                    # optional default filter
RAG_MULTI_QUERY="false"                        # set true to use query variants
RAG_RECENCY_HALFLIFE_DAYS="180"                # recency boost half-life in days

# Router thresholds (intent routing)
ROUTER_RULE_THRESHOLD="0.85"
ROUTER_EMBED_THRESHOLD="0.8"

# LibCal Integration (optional)
LIBCAL_CLIENT_ID="your-libcal-client-id"
LIBCAL_CLIENT_SECRET="your-libcal-client-secret"

# Google Search Integration (optional)
GOOGLE_API_KEY="your-google-api-key"
GOOGLE_LIBRARY_SEARCH_CSE_ID="your-custom-search-engine-id"

# Application Configuration
NODE_ENV="production"
FRONTEND_URL="https://your-domain.com"
```

## 📘 RAG (Weaviate) Setup & Ingestion

1) Ensure `.env` has `WEAVIATE_HOST` (and optional `WEAVIATE_API_KEY`).

2) Prepare a JSON array of FAQ entries:
```json
[
  {
    "question": "How can I access the New York Times?",
    "answer": "Register with your university email at <link>.",
    "category": "Newspapers",
    "tags": ["nyt", "new york times"],
    "institutionId": "miami-oh",
    "campus": "oxford",
    "sourceUrl": "https://library.miamioh.edu/nyt",
    "updatedAt": "2025-10-20T00:00:00.000Z"
  }
]
```

3) Ingest your data:
```bash
npm run build
npx ts-node src/scripts/ingest-faqs.ts ./faqs.json
```

4) Optional: Evaluate routing quality on your examples
```bash
npx ts-node src/scripts/evaluate-routing.ts ./routing-eval.json
```

5) Ask routed questions (e.g., “Adobe license”, “NYT access”, “3D printing”). Answers will include a Sources section when citations are available.

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

### Production (Node-only)
```bash
# 1) Build frontend (serves static files via your web server)
cd client && npm install && npm run build && cd ..

# 2) Build backend
npm install
npx prisma generate
npm run build

# 3) Start backend server (port 3000)
npm run start:prod

# 4) Serve client/dist with your preferred web server (e.g., Nginx, Apache, or a static host)
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
