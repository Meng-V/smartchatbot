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

  return {
    serverStatus: getHealthStatus(),
    lastHealthCheck,
    errorDetails,
    retryCount,
    isOnline,
    checkServerHealth,
    retryHealthCheck,
    isHealthy: isHealthy(),
    needsAttention: needsAttention(),
  };
};

export default useServerHealth;
