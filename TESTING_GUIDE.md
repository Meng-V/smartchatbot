# 🧪 SmartChatbot Testing Guide

## Overview

This guide provides comprehensive testing instructions for developers to validate the SmartChatbot application functionality, performance, and reliability.

## 🚀 Quick Testing Setup

### Prerequisites
- SmartChatbot deployed and running
- Access to health endpoints
- Test environment configured

### Start Testing
```bash
# Ensure application is running
curl http://localhost:3000/health

# Run the test suite
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 🧪 Testing Categories

### 1. Unit Tests
**Purpose**: Test individual components in isolation

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test tests/unit/database/database.service.spec.ts

# Run with coverage
npm run test:cov
```

**Coverage Areas:**
- Database service operations
- WebSocket memory monitoring
- Health controller responses
- Environment validation
- Error handling logic

### 2. Integration Tests
**Purpose**: Test component interactions and external dependencies

```bash
# Run integration tests
npm run test:integration

# Test WebSocket connections
npm run test tests/integration/websocket/chat-gateway.integration.spec.ts
```

**Test Scenarios:**
- WebSocket gateway with real connections
- Database operations with test database
- Rate limiting validation
- Memory cleanup verification
- LibCal API integration

### 3. End-to-End Tests
**Purpose**: Test complete user workflows

```bash
# Run E2E tests
npm run test:e2e

# Run specific E2E test
npm run test tests/e2e/chat-workflow.e2e.spec.ts
```

**User Journeys:**
- Complete chat conversation flow
- Health endpoint validation
- Metrics endpoint verification
- Manual restart functionality

## 🎯 Manual Testing Scenarios

### Core Chat Functionality

#### 1. Basic Chat Flow
```bash
# Test basic conversation
1. Open application in browser
2. Send message: "Hello, I need help"
3. Verify AI responds appropriately
4. Check conversation context is maintained
```

#### 2. Library-Specific Features
```bash
# Test room reservation
1. Send: "I need to book a study room for tomorrow"
2. Verify LibCal integration works
3. Check room availability response

# Test library hours
1. Send: "What are your hours today?"
2. Verify current hours are returned
3. Check accuracy of information
```

#### 3. Error Handling & Fallback
```bash
# Test human librarian fallback
1. Send complex query that AI can't handle
2. Verify "Talk to a real librarian" option appears
3. Test widget functionality

# Test connection errors
1. Disconnect internet briefly
2. Verify error handling and reconnection
3. Check user-friendly error messages
```

### System Health Testing

#### 1. Health Endpoints
```bash
# Test health endpoint
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"...","uptime":...}

# Test metrics endpoint
curl http://localhost:3000/metrics
# Expected: Memory, WebSocket, database stats

# Test readiness probe
curl http://localhost:3000/readiness
# Expected: {"status":"ready","checks":[...]}
```

#### 2. Auto-Restart System
```bash
# Test manual restart
curl -X POST http://localhost:3000/health/restart
# Expected: Server restarts gracefully in <15 seconds

# Monitor restart process
tail -f auto-restart.log
# Verify restart flag detection and clean shutdown
```

#### 3. Performance Testing
```bash
# Test memory usage under load
# Open multiple browser tabs (10+)
# Send messages simultaneously
# Monitor: curl http://localhost:3000/metrics

# Test WebSocket connections
# Connect 50+ concurrent users
# Verify connection limits and cleanup
```

### Rate Limiting & Security

#### 1. Rate Limiting
```bash
# Test message rate limits
1. Send 35+ messages rapidly (within 1 minute)
2. Verify rate limit error after 30 messages
3. Check error message: "Rate limit exceeded"
```

#### 2. Input Validation
```bash
# Test message length limits
1. Send message >2000 characters
2. Verify truncation to 2000 chars
3. Check validation error handling

# Test invalid input
1. Send empty messages
2. Send non-string data
3. Verify proper error responses
```

## 🔍 Performance Testing

### Load Testing with Artillery
```bash
# Install Artillery
npm install -g artillery

# Test WebSocket load
artillery run tests/performance/websocket-load.yml

# Test HTTP endpoints
artillery run tests/performance/http-load.yml
```

### Memory Leak Testing
```bash
# Long-running test (30+ minutes)
1. Start application with memory monitoring
2. Simulate continuous chat activity
3. Monitor memory usage: curl http://localhost:3000/metrics
4. Verify memory doesn't continuously grow
5. Check garbage collection triggers
```

### Database Performance
```bash
# Test database under load
1. Run concurrent chat sessions (20+)
2. Monitor database connection pool
3. Check query response times
4. Verify connection cleanup
```

## 🐛 Error Scenario Testing

### Database Failures
```bash
# Simulate database disconnect
1. Stop database temporarily
2. Send chat messages
3. Verify graceful error handling
4. Check auto-restart triggers
5. Restart database and verify recovery
```

### API Failures
```bash
# Test OpenAI API failures
1. Use invalid API key temporarily
2. Send chat messages
3. Verify fallback responses
4. Check human librarian handoff

# Test LibCal API failures
1. Simulate LibCal downtime
2. Request room reservations
3. Verify error handling and user messaging
```

### Network Issues
```bash
# Test connection resilience
1. Disconnect network briefly during chat
2. Verify WebSocket reconnection
3. Check message queue handling
4. Test offline/online state management
```

## 📊 Test Results Validation

### Success Criteria

#### Unit Tests
- ✅ 80%+ code coverage
- ✅ All tests pass
- ✅ No memory leaks in test runs
- ✅ Fast execution (<30 seconds)

#### Integration Tests
- ✅ WebSocket connections work properly
- ✅ Database operations succeed
- ✅ Rate limiting functions correctly
- ✅ Memory cleanup verified

#### E2E Tests
- ✅ Complete user workflows work
- ✅ Health endpoints respond correctly
- ✅ Manual restart functions properly
- ✅ Error scenarios handled gracefully

#### Performance Tests
- ✅ <2 second response times
- ✅ Memory usage <512MB under normal load
- ✅ 100+ concurrent WebSocket connections
- ✅ Rate limiting at 30 messages/minute

### Common Issues & Solutions

#### Test Failures
```bash
# Database connection issues
- Check DATABASE_URL in .env.test
- Verify test database is accessible
- Run: npx prisma migrate deploy

# WebSocket test timeouts
- Increase test timeout to 30 seconds
- Check port conflicts
- Verify WebSocket path: /smartchatbot/socket.io

# Memory test failures
- Run tests with --detectOpenHandles
- Check for unclosed connections
- Verify cleanup in afterEach blocks
```

#### Performance Issues
```bash
# Slow test execution
- Run tests in parallel: --maxWorkers=4
- Use test database instead of production
- Mock external API calls

# Memory leaks in tests
- Add proper cleanup in test teardown
- Close all connections and timers
- Use --detectLeaks flag
```

## 🔧 Test Environment Setup

### Test Database
```bash
# Setup test database
cp .env.example .env.test
# Edit DATABASE_URL to point to test database

# Run migrations
NODE_ENV=test npx prisma migrate deploy

# Seed test data (optional)
NODE_ENV=test npx prisma db seed
```

### Mock Services
```bash
# Mock external APIs for testing
# OpenAI API responses
# LibCal API responses  
# Google Search API responses
```

### CI/CD Integration
```bash
# GitHub Actions testing
- Unit tests run on every PR
- Integration tests on main branch
- E2E tests on releases
- Performance tests weekly

# Quality gates
- All tests must pass
- Coverage >80%
- No security vulnerabilities
- Performance benchmarks met
```

## 📈 Monitoring Test Results

### Test Reports
- Coverage reports in `coverage/` directory
- Test results in JUnit XML format
- Performance metrics logged
- Error screenshots for E2E failures

### Continuous Monitoring
- Daily automated test runs
- Performance regression detection
- Error rate monitoring
- Memory usage tracking

---

**🎯 Ready to test? Start with the quick setup and work through each testing category systematically!**
