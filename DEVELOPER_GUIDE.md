# 🛠️ Developer Guide - SmartChatbot

## 📋 Table of Contents
- [Quick Setup](#quick-setup)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [Key Components](#key-components)
- [API Integration](#api-integration)
- [Testing Strategy](#testing-strategy)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Setup

### Prerequisites
```bash
# Required versions
Node.js >= 22.0.0
Docker >= 24.0.0
Docker Compose >= 2.0.0
```

### Environment Setup
```bash
# 1. Clone and setup
git clone <your-repo>
cd smartchatbot

# 2. Install dependencies
npm install
cd client && npm install && cd ..

# 3. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 4. Database setup
npx prisma generate
npx prisma migrate deploy

# 5. Start development
./auto-restart.sh  # Production mode
# OR
npm run start:dev  # Development mode
```

## 🏗️ Architecture Overview

### System Design
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External APIs │
│   (React)       │◄──►│   (NestJS)      │◄──►│   (LibCal, AI)  │
│                 │    │                 │    │                 │
│ • Chakra UI     │    │ • WebSocket     │    │ • OpenAI GPT-4  │
│ • Socket.io     │    │ • REST API      │    │ • LibCal API    │
│ • Real-time UI  │    │ • Auto-restart  │    │ • Google Search │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │   (PostgreSQL)  │
                    │                 │
                    │ • Prisma ORM    │
                    │ • Neon Hosted   │
                    │ • Auto-migrate  │
                    └─────────────────┘
```

### Key Directories
```
smartchatbot/
├── src/                          # Backend source
│   ├── gateway/chat/             # WebSocket chat handling
│   ├── llm-chain/               # AI integration & tools
│   ├── database/                # Database services
│   ├── health/                  # Health checks & restart
│   └── library-api/             # LibCal integration
├── client/                      # Frontend React app
│   ├── src/components/          # React components
│   ├── src/context/            # State management
│   └── public/                 # Static assets
├── prisma/                     # Database schema & migrations
└── auto-restart.sh             # Production restart script
```

## 🔄 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/your-feature

# Start development servers
npm run start:dev          # Backend (port 3000)
cd client && npm run dev   # Frontend (port 5173)

# Make changes and test
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

### 2. Database Changes
```bash
# Modify schema
vim prisma/schema.prisma

# Generate migration
npx prisma migrate dev --name your_migration_name

# Apply to production
npx prisma migrate deploy
```

### 3. Adding New AI Tools
```typescript
// 1. Create tool service in src/llm-chain/llm-toolbox/
export class YourToolService extends LlmToolService {
  async toolRunForLlm(input: LlmToolInput): Promise<string> {
    // Your tool logic here
    return "Tool response";
  }
}

// 2. Register in llm-toolbox.module.ts
@Module({
  providers: [
    // ... existing tools
    YourToolService,
  ],
})
```

## 🔑 Key Components

### Chat Gateway (`src/gateway/chat/chat.gateway.ts`)
**Purpose**: Handles real-time WebSocket communication
```typescript
@SubscribeMessage('message')
async handleUserMessage(client: Socket, userMessage: string) {
  // 1. Parallel DB save + LLM chain init
  // 2. Generate AI response with timeout
  // 3. Send response immediately
  // 4. Save AI response in background
}
```

**Key Features**:
- Parallel processing for performance
- 20-second LLM timeout
- Background database operations
- Automatic error recovery

### Auto-Restart System (`auto-restart.sh`)
**Purpose**: Production-grade server management
```bash
# Features:
- Graceful shutdown with SIGTERM
- Automatic restart on crashes
- Manual restart via /health/restart
- Crash attempt limiting (10 max)
- Logging and monitoring
```

### Error Monitoring (`src/gateway/chat/error-monitoring.service.ts`)
**Purpose**: Enterprise error tracking and auto-restart triggers
```typescript
// Monitors:
- Chat gateway errors
- API failure rates
- Database connection issues
- Performance bottlenecks

// Actions:
- Log structured errors
- Trigger auto-restart on critical errors
- Alert on high error rates
```

### LibCal Integration (`src/llm-chain/llm-toolbox/libcal-tools/`)
**Purpose**: Room reservation and library services
```typescript
// Tools available:
- ReserveRoomTool: Book study rooms
- LibraryHoursTool: Get current hours
- LocationTool: Find library locations

// Features:
- Token auto-refresh
- Error handling with user-friendly messages
- Production booking ID handling
```

## 🔌 API Integration

### OpenAI Integration
```typescript
// Configuration in src/llm-chain/llm/
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 20000, // 20 second timeout
});

// Usage with error handling
try {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: conversationHistory,
    tools: availableTools,
  });
} catch (error) {
  // Fallback to human librarian
}
```

### LibCal API
```typescript
// Token management
class LibcalAuthorizationService {
  async refreshToken() {
    // Auto-refresh every 55 minutes
    // Handle token expiration gracefully
  }
}

// Room booking
async reserveRoom(params: ReservationParams) {
  // Validate user input
  // Make API call with retry logic
  // Return real booking ID (not test ID)
}
```

## 🧪 Testing Strategy

### Unit Tests
```bash
# Backend tests
npm run test

# Frontend tests
cd client && npm run test
```

### Integration Testing
```bash
# Health system test
curl http://localhost:3000/health

# Chat functionality
# Use WebSocket client to test real-time chat

# LibCal integration
# Test room booking with real API
```

### Performance Testing
```typescript
// Monitor these metrics:
- Chat response time (target: <5 seconds)
- Database query performance
- Memory usage and leaks
- WebSocket connection stability
```

## 🚀 Deployment Guide

### Production Deployment
```bash
# 1. Environment setup
export NODE_ENV=production
export DATABASE_URL="your-production-db"
export OPENAI_API_KEY="your-key"

# 2. Build and deploy
docker-compose -f docker-compose.prod.yml up -d

# 3. Health check
curl https://your-domain/health
```

### Auto-Restart Configuration
```bash
# Use auto-restart.sh for production
./auto-restart.sh

# Features:
- Graceful shutdown handling
- Automatic crash recovery
- Manual restart endpoint: POST /health/restart
- Comprehensive logging
```

### Monitoring Setup
```bash
# Log locations
tail -f auto-restart.log        # Restart logs
docker logs smartchatbot-backend # Application logs

# Health endpoints
GET /health                     # Basic health
GET /health/status             # Detailed status
POST /health/restart           # Manual restart
```

## 🔧 Configuration

### Environment Variables
```env
# Required
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
LIBCAL_CLIENT_ID=your-id
LIBCAL_CLIENT_SECRET=your-secret

# Optional
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
RESTART_MAX_ATTEMPTS=10
```

### Performance Tuning
```typescript
// Chat gateway optimizations
- Parallel DB operations
- Background AI response saving
- 20s LLM timeout (vs 30s default)
- Connection pooling

// Database optimizations
- Prisma connection pooling
- Efficient query patterns
- Background operations
```

## 🐛 Troubleshooting

### Common Issues

**1. Chat responses are slow**
```bash
# Check performance logs
grep "Slow operation" logs/

# Optimize database queries
npx prisma studio  # Check query performance

# Monitor LLM response times
# Target: <20 seconds
```

**2. Auto-restart not working**
```bash
# Check restart script
ps aux | grep auto-restart.sh

# Verify restart endpoint
curl -X POST http://localhost:3000/health/restart

# Check logs
tail -f auto-restart.log
```

**3. LibCal integration failing**
```bash
# Check token status
curl http://localhost:3000/health/status

# Verify credentials
echo $LIBCAL_CLIENT_ID
echo $LIBCAL_CLIENT_SECRET

# Test API directly
curl -X POST https://libcal.miamioh.edu/1.1/oauth/token
```

**4. Database connection issues**
```bash
# Test connection
npx prisma db pull

# Check connection string
echo $DATABASE_URL

# Verify SSL settings
# Neon requires sslmode=require
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run start:dev

# WebSocket debugging
# Use browser dev tools -> Network -> WS

# Database query logging
# Enable in prisma/schema.prisma:
# log = ["query", "info", "warn", "error"]
```

## 📚 Best Practices

### Code Quality
```typescript
// 1. Use TypeScript strictly
interface ChatMessage {
  messageId: string;
  content: string;
  timestamp: Date;
}

// 2. Error handling
try {
  await riskyOperation();
} catch (error) {
  this.logger.error('Operation failed', error);
  // Always provide user-friendly fallback
}

// 3. Performance monitoring
const startTime = Date.now();
await operation();
const duration = Date.now() - startTime;
if (duration > 5000) {
  this.logger.warn(`Slow operation: ${duration}ms`);
}
```

### Security
```typescript
// 1. Input validation
const sanitizedMessage = userMessage.trim().substring(0, 2000);

// 2. Environment variables
// Never hardcode API keys
const apiKey = process.env.OPENAI_API_KEY;

// 3. Error messages
// Don't expose internal errors to users
return "I'm having trouble right now. Please try again or contact a librarian.";
```

### Performance
```typescript
// 1. Parallel operations
const [dbResult, llmChain] = await Promise.all([
  this.database.save(message),
  this.llm.getChain(clientId)
]);

// 2. Background operations
// Send response immediately, save to DB in background
client.emit('message', response);
this.database.save(response).catch(this.logger.error);

// 3. Timeouts
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Timeout')), 20000)
);
```

## 🔄 Continuous Integration

### GitHub Actions
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build
```

### Pre-commit Hooks
```bash
# Install husky
npm install --save-dev husky

# Setup pre-commit
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

---

## 🎯 Next Steps for New Developers

1. **Setup Development Environment** (30 minutes)
   - Follow Quick Setup guide
   - Test chat functionality
   - Make a small change and see it work

2. **Understand the Architecture** (1 hour)
   - Read through key components
   - Trace a chat message from frontend to backend
   - Understand the auto-restart system

3. **Make Your First Contribution** (2 hours)
   - Pick a small feature or bug fix
   - Follow the development workflow
   - Submit a pull request

4. **Advanced Topics** (ongoing)
   - Add new AI tools
   - Optimize performance
   - Enhance error handling
   - Improve user experience

**Happy coding! 🚀**
