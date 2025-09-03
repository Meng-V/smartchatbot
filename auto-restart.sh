#!/bin/bash

# Auto-restart script for the NestJS backend
# This script monitors the Node.js process and restarts it automatically on failure

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
MAX_GLOBAL_RESTARTS=10
RESTART_DELAY=2
HEALTH_CHECK_INTERVAL=30  # Check health every 30 seconds
HEALTH_CHECK_FAILURES_THRESHOLD=3  # Restart after 3 consecutive failures
LOG_FILE="auto-restart.log"
PID_FILE=".backend.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Health check function
check_server_health() {
    local response_code
    local startup_time_limit=$1  # Pass startup time limit as parameter
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
    
    if [ "$response_code" = "200" ]; then
        return 0  # Healthy
    elif [ "$response_code" = "503" ] || [ "$response_code" = "500" ] || [ "$response_code" = "502" ] || [ "$response_code" = "504" ]; then
        log "${RED}🚨 Server returned $response_code status - unhealthy/degraded${NC}"
        return 1  # Unhealthy
    elif [ -z "$response_code" ] || [ "$response_code" = "000" ]; then
        # Check if we're still in startup grace period
        if [ "$startup_time_limit" -gt 0 ]; then
            return 2  # Not responding during startup (grace period)
        else
            log "${RED}🚨 Server not responding after startup period - likely crashed${NC}"
            return 1  # Not responding after startup = unhealthy
        fi
    else
        # Only log unexpected status codes that aren't temporary
        if [ "$response_code" != "503" ]; then
            log "${YELLOW}⚠️  Server returned unexpected status: $response_code${NC}"
        fi
        return 1  # Unhealthy
    fi
}

# Cleanup function
cleanup() {
    log "${YELLOW}🧹 Cleaning up...${NC}"
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            log "${YELLOW}📤 Stopping process $PID...${NC}"
            kill -TERM "$PID" 2>/dev/null
            sleep 3
            if kill -0 "$PID" 2>/dev/null; then
                log "${RED}💀 Force killing process $PID...${NC}"
                kill -KILL "$PID" 2>/dev/null
            fi
        fi
        rm -f "$PID_FILE"
    fi
    rm -f ".restart-flag"
    rm -f ".health-restart-flag"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Check if backend is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        log "${RED}❌ Backend is already running with PID $PID${NC}"
        exit 1
    else
        rm -f "$PID_FILE"
    fi
fi

log "${GREEN}🚀 Starting auto-restart manager...${NC}"

restart_count=0

while [ $restart_count -lt $MAX_GLOBAL_RESTARTS ]; do
    log "${BLUE}📦 Starting backend (attempt $((restart_count + 1))/$MAX_GLOBAL_RESTARTS)...${NC}"
    
    # Ensure Prisma client is up to date before starting
    if [ $restart_count -eq 0 ]; then
        log "${YELLOW}🔧 Generating Prisma client...${NC}"
        npx prisma generate > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            log "${GREEN}✅ Prisma client generated successfully${NC}"
        else
            log "${RED}❌ Prisma client generation failed${NC}"
        fi
    fi
    
    # Start the backend process
    npm run start:dev &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$PID_FILE"
    
    log "${GREEN}✅ Backend started with PID $BACKEND_PID${NC}"
    
    # Wait for server to be ready
    sleep 5
    
    # Health monitoring loop with startup grace period
    health_failure_count=0
    startup_grace_period=60  # 60 seconds grace period for startup
    startup_end_time=$(($(date +%s) + startup_grace_period))
    
    while kill -0 $BACKEND_PID 2>/dev/null; do
        # Calculate remaining startup time
        current_time=$(date +%s)
        remaining_startup_time=$((startup_end_time - current_time))
        
        # Check server health with startup grace period
        health_result=$(check_server_health $remaining_startup_time)
        health_status=$?
        
        if [ $health_status -eq 0 ]; then
            health_failure_count=0  # Reset failure count on success
            # Server is healthy, no more startup grace period needed
            startup_end_time=0
        elif [ $health_status -eq 1 ]; then
            # Actual unhealthy response - count as failure
            health_failure_count=$((health_failure_count + 1))
            log "${YELLOW}📊 Health check failure $health_failure_count/$HEALTH_CHECK_FAILURES_THRESHOLD${NC}"
            
            if [ $health_failure_count -ge $HEALTH_CHECK_FAILURES_THRESHOLD ]; then
                log "${RED}🚨 Health check threshold reached - triggering restart${NC}"
                # Create health restart flag
                echo "$(date '+%Y-%m-%d %H:%M:%S') - Health check failure" > ".health-restart-flag"
                # Kill the backend process
                kill -TERM $BACKEND_PID 2>/dev/null
                sleep 2
                if kill -0 $BACKEND_PID 2>/dev/null; then
                    kill -KILL $BACKEND_PID 2>/dev/null
                fi
                break
            fi
        else
            # Status 2 = not responding during startup grace period
            if [ $remaining_startup_time -gt 0 ]; then
                log "${YELLOW}⚠️  Server not responding (startup grace period: ${remaining_startup_time}s remaining)${NC}"
            fi
        fi
        
        # Wait before next health check
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    # Wait for the process to finish (if it hasn't been killed)
    wait $BACKEND_PID 2>/dev/null
    EXIT_CODE=$?
    
    # Remove PID file
    rm -f "$PID_FILE"
    
    # Detect manual or health-triggered restart regardless of exit code
    if [ -f ".restart-flag" ]; then
        log "${BLUE}🔄 Manual restart detected (exit code $EXIT_CODE)${NC}"
        rm -f ".restart-flag"
        # Don't increment restart count; immediately loop to restart
        log "${YELLOW}🔁 Restarting backend...${NC}"
        sleep $RESTART_DELAY
        continue
    elif [ -f ".health-restart-flag" ]; then
        log "${RED}🚨 Health-triggered restart detected (exit code $EXIT_CODE)${NC}"
        rm -f ".health-restart-flag"
        # Don't increment restart count; immediately loop to restart
        log "${YELLOW}🔁 Restarting backend...${NC}"
        sleep $RESTART_DELAY
        continue
    fi

    if [ $EXIT_CODE -eq 0 ]; then
        log "${GREEN}✅ Backend exited normally${NC}"
        break
    else
        # Check if this was a manual restart
        if [ -f ".restart-flag" ]; then
            log "${BLUE}🔄 Manual restart detected (exit code $EXIT_CODE)${NC}"
            rm -f ".restart-flag"
            # Don't increment restart count for manual restarts
        elif [ -f ".health-restart-flag" ]; then
            log "${RED}🚨 Health-triggered restart detected (exit code $EXIT_CODE)${NC}"
            rm -f ".health-restart-flag"
            # Don't increment restart count for health-triggered restarts
        else
            log "${RED}❌ Backend crashed with exit code $EXIT_CODE${NC}"
            restart_count=$((restart_count + 1))
        fi
        
        # Check if there's error information
        if [ -f "last-error.json" ]; then
            log "${YELLOW}📋 Last error details:${NC}"
            cat "last-error.json" | tail -10 >> "$LOG_FILE"
        fi
        
        if [ $restart_count -lt $MAX_GLOBAL_RESTARTS ]; then
            log "${YELLOW}🔄 Restarting in ${RESTART_DELAY} seconds...${NC}"
            sleep $RESTART_DELAY
        else
            log "${RED}💀 Maximum restart attempts reached. Manual intervention required.${NC}"
            break
        fi
    fi
done

log "${RED}🛑 Auto-restart manager stopped${NC}"
