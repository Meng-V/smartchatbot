import { useState, useEffect, useCallback } from 'react';

const useServerHealth = (checkInterval = 30000) => {
  const [serverStatus, setServerStatus] = useState('checking');
  const [lastHealthCheck, setLastHealthCheck] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Check server health function
  const checkServerHealth = useCallback(async () => {
    // If browser is offline, don't attempt health check
    if (!navigator.onLine) {
      setServerStatus('offline');
      setErrorDetails({
        type: 'offline',
        message: 'No internet connection detected',
      });
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/health', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const healthData = await response.json();
      setServerStatus(healthData.status || 'healthy');
      setLastHealthCheck(new Date());
      setErrorDetails(null);
      setRetryCount(0);

      // Check for degraded services
      if (healthData.status === 'degraded') {
        setErrorDetails({
          type: 'degraded',
          message: 'Some services are experiencing issues',
          services: healthData.services,
        });
      }

      return healthData;
    } catch (error) {
      console.error('Health check failed:', error);
      
      let errorType = 'network';
      let errorMessage = 'Unable to connect to the server';

      if (error.name === 'AbortError') {
        errorType = 'timeout';
        errorMessage = 'Server is taking too long to respond';
      } else if (error.message.includes('400')) {
        errorType = '400';
        errorMessage = 'Bad request - invalid health check parameters';
      } else if (error.message.includes('404')) {
        errorType = '404';
        errorMessage = 'Health check endpoint not found';
      } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
        errorType = 'server_error';
        errorMessage = 'Server is experiencing internal issues';
      } else if (error.message.includes('Failed to fetch')) {
        errorType = 'connection';
        errorMessage = 'Cannot reach the server';
      }

      setServerStatus('unhealthy');
      setErrorDetails({
        type: errorType,
        message: errorMessage,
        fullError: error.message,
        timestamp: new Date(),
      });
      setLastHealthCheck(new Date());
      setRetryCount(prev => prev + 1);

      return null;
    }
  }, []);

  // Manual retry function
  const retryHealthCheck = useCallback(() => {
    setServerStatus('checking');
    checkServerHealth();
  }, [checkServerHealth]);

  // Trigger backend restart function
  const triggerBackendRestart = useCallback(async () => {
    try {
      console.log('🔄 Triggering backend restart...');
      setServerStatus('restarting');
      setErrorDetails({
        type: 'restarting',
        message: 'Attempting to restart the backend server...',
        timestamp: new Date(),
      });

      const response = await fetch('/health/restart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend restart initiated:', result);
        
        // Wait a moment for the server to restart, then check health
        setTimeout(() => {
          setServerStatus('checking');
          setErrorDetails({
            type: 'restart_checking',
            message: 'Server restart initiated, checking status...',
            timestamp: new Date(),
          });
          
          // Start checking health more frequently after restart
          const checkInterval = setInterval(() => {
            checkServerHealth().then((healthData) => {
              if (healthData && healthData.status === 'healthy') {
                clearInterval(checkInterval);
                console.log('✅ Backend successfully restarted and healthy');
              }
            });
          }, 2000); // Check every 2 seconds
          
          // Stop checking after 30 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
          }, 30000);
        }, 3000);
        
        return { success: true, message: result.message };
      } else {
        throw new Error(`Restart request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to trigger backend restart:', error);
      setServerStatus('unhealthy');
      setErrorDetails({
        type: 'restart_failed',
        message: 'Failed to trigger backend restart',
        fullError: error.message,
        timestamp: new Date(),
      });
      return { success: false, error: error.message };
    }
  }, [checkServerHealth]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (serverStatus === 'offline') {
        retryHealthCheck();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setServerStatus('offline');
      setErrorDetails({
        type: 'offline',
        message: 'No internet connection',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [serverStatus, retryHealthCheck]);

  // Initial health check and periodic checks
  useEffect(() => {
    checkServerHealth();
    
    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkServerHealth();
      }
    }, checkInterval);

    return () => clearInterval(interval);
  }, [checkServerHealth, checkInterval]);

  // Enhanced status determination
  const getHealthStatus = () => {
    if (!isOnline) return 'offline';
    return serverStatus;
  };

  const isHealthy = () => {
    return getHealthStatus() === 'healthy';
  };

  const needsAttention = () => {
    const status = getHealthStatus();
    return status === 'unhealthy' || status === 'degraded' || status === 'offline';
  };

  const canRestart = () => {
    const status = getHealthStatus();
    return status === 'unhealthy' || status === 'degraded';
  };

  const isRestarting = () => {
    return serverStatus === 'restarting';
  };

  return {
    serverStatus: getHealthStatus(),
    lastHealthCheck,
    errorDetails,
    retryCount,
    isOnline,
    checkServerHealth,
    retryHealthCheck,
    triggerBackendRestart,
    isHealthy: isHealthy(),
    needsAttention: needsAttention(),
    canRestart: canRestart(),
    isRestarting: isRestarting(),
  };
};

export default useServerHealth;
