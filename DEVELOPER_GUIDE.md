# 🛠️ SmartChatbot Developer Guide

## Overview
This comprehensive guide helps developers deploy and maintain the SmartChatbot application in their own environment. Whether you're setting up for development, staging, or production, this guide covers everything you need to know.

## Prerequisites
- **Node.js 18+** (LTS recommended)
- **Docker & Docker Compose** (latest versions)
- **Git** for version control
- **API Keys**: OpenAI, LibCal, Google Custom Search
- **Database**: Neon PostgreSQL (or any PostgreSQL 14+)

## 🚀 Quick Deployment Options

### Option 1: Auto-Restart Script (Recommended)
The fastest way to get SmartChatbot running in production:

```bash
# Clone and setup
git clone <repository-url>
cd smartchatbot
cp .env.example .env
# Edit .env with your API keys and database URL

# One-command deployment
bash auto-restart.sh
```

**Features:**
- Builds both frontend and backend automatically
- Starts Nginx to serve the React app
- Backend runs on port 3000 with health monitoring
- Auto-restart on crashes with comprehensive logging

### Option 2: Docker Compose (Full Stack)
For containerized deployment with load balancing:

```bash
# Setup environment
cp .env.example .env
# Configure your .env file

# Deploy with Docker
docker-compose up -d --build

# View logs
docker-compose logs -f
```

**Features:**
- Nginx load balancer
- Multi-replica backend scaling
- Automatic health checks
- SSL/HTTPS ready

### Option 3: Local Development
For development and testing:

```bash
# Backend setup
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev

# Frontend setup (separate terminal)
cd client
npm install
npm run dev
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health: http://localhost:3000/health

## 🔧 Environment Configuration

Create a `.env` file in the root directory with these variables:

### Required Configuration
```env
# Database Connection
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# AI Integration
OPENAI_API_KEY="sk-your-openai-api-key"

# LibCal Integration (for room reservations)
LIBCAL_CLIENT_ID="your-libcal-client-id"
LIBCAL_CLIENT_SECRET="your-libcal-client-secret"

# Google Search Integration
GOOGLE_CUSTOM_SEARCH_API_KEY="your-google-api-key"
GOOGLE_CUSTOM_SEARCH_ENGINE_ID="your-search-engine-id"

# Application Settings
NODE_ENV="production"
FRONTEND_URL="https://your-domain.com"
```

### Optional Performance Settings
```env
# Memory and Connection Limits
MAX_CONNECTIONS="1000"
MEMORY_LIMIT_MB="512"

# Logging Level
LOG_LEVEL="info"
```

### Getting API Keys

1. **OpenAI API Key**
   - Visit https://platform.openai.com/api-keys
   - Create new secret key
   - Ensure you have GPT-4 access

2. **LibCal API Credentials**
   - Contact your LibCal administrator
   - Request API client credentials
   - Ensure permissions for room booking

3. **Google Custom Search**
   - Visit https://developers.google.com/custom-search
   - Create a Custom Search Engine
   - Get API key from Google Cloud Console

## Health Monitoring

### Health Endpoints
- `GET /health` - Application health status
- `GET /metrics` - Application metrics
- `GET /metrics/prometheus` - Prometheus format metrics
- `GET /readiness` - Kubernetes readiness probe

### Auto-Restart Features
- Automatic server restart on critical errors
- Health check monitoring with startup grace period
- Manual restart via `POST /health/restart`
- Comprehensive error logging and alerting

## Performance Optimization

### Memory Management
- WebSocket connection monitoring
- Automatic garbage collection triggers
- Memory usage alerts and thresholds
- Connection cleanup on disconnect

### Database Optimization
- Neon adapter for serverless connections
- Connection pooling configuration
- Query performance monitoring
- Health check validation

## Security Considerations

### WebSocket Security
- Rate limiting (30 messages/minute per IP)
- Input validation and sanitization
- CORS configuration by environment
- Connection authentication

### API Security
- Environment-based CORS origins
- Input validation with class-validator
- Security audit in CI pipeline
- Dependency vulnerability scanning

## Monitoring and Observability

### Metrics Collection
- Memory usage tracking
- WebSocket connection counts
- Database health monitoring
- API response times

### Error Monitoring
- Comprehensive error logging
- Auto-restart triggers on critical errors
- Performance monitoring integration
- Alert thresholds and notifications

## CI/CD Pipeline

### Automated Testing
- Unit tests (80% coverage target)
- Integration tests with real database
- E2E tests for critical workflows
- Security vulnerability scanning

### Deployment Stages
1. **Test**: Lint, unit tests, integration tests
2. **Security**: Audit dependencies, vulnerability scan
3. **Build**: Docker images for frontend/backend
4. **Deploy**: Automated deployment to staging/production

### Quality Gates
- All tests must pass
- Coverage threshold met (80%)
- No high-severity security issues
- Successful build and deployment

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check environment variables
npm run test:env

# Verify database connection
npx prisma db pull

# Check logs
tail -f logs/error-monitoring.json
```

#### High Memory Usage
```bash
# Check current metrics
curl http://localhost:3000/metrics

# Force garbage collection (if enabled)
curl -X POST http://localhost:3000/health/gc

# Restart application
curl -X POST http://localhost:3000/health/restart
```

#### WebSocket Connection Issues
```bash
# Check connection count
curl http://localhost:3000/metrics | grep websocket_connections

# Verify CORS configuration
curl -H "Origin: http://localhost:5173" http://localhost:3000/health

# Test WebSocket endpoint
wscat -c ws://localhost:3000/smartchatbot/socket.io
```

### Log Analysis
```bash
# View error logs
cat logs/error-monitoring.json | jq '.[] | select(.level == "error")'

# Monitor restart events
grep "restart" auto-restart.log

# Check performance metrics
cat logs/alerts.json | jq '.[] | select(.type == "performance")'
```

## Scaling Considerations

### Horizontal Scaling
- Load balancer configuration for WebSocket sticky sessions
- Database connection pooling across instances
- Shared session storage (Redis recommended)
- Distributed logging and monitoring

### Vertical Scaling
- Memory limit adjustments
- CPU allocation optimization
- Database connection pool sizing
- WebSocket connection limits

## Backup and Recovery

### Database Backups
```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql $DATABASE_URL < backup_file.sql
```

### Application State
- Environment variable backup
- Configuration file versioning
- Docker image tagging strategy
- Rollback procedures

## Support and Maintenance

### Regular Maintenance Tasks
- Weekly dependency updates
- Monthly security audits
- Quarterly performance reviews
- Database maintenance and optimization

### Monitoring Checklist
- [ ] Health endpoints responding
- [ ] Memory usage within limits
- [ ] Database connections healthy
- [ ] WebSocket connections stable
- [ ] Error rates acceptable
- [ ] Performance metrics normal
