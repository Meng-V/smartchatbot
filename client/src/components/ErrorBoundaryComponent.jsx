import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  HStack,
  Text,
  useToast,
  Spinner,
  Badge,
} from '@chakra-ui/react';
import { WarningIcon, RepeatIcon, ChatIcon } from '@chakra-ui/icons';

const ErrorBoundaryComponent = ({ children, onLibrarianHelp }) => {
  const [serverStatus, setServerStatus] = useState('checking');
  const [lastHealthCheck, setLastHealthCheck] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const toast = useToast();

  // Health check function
  const checkServerHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/health', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`,
        );
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
        errorMessage = 'Service endpoint not found';
      } else if (
        error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503')
      ) {
        errorType = 'server_error';
        errorMessage = 'Server is experiencing internal issues';
      }

      setServerStatus('unhealthy');
      setErrorDetails({
        type: errorType,
        message: errorMessage,
        fullError: error.message,
      });
      setLastHealthCheck(new Date());
      setRetryCount((prev) => prev + 1);

      return null;
    }
  };

  // Periodic health checks - start with a delay to not block initial render
  useEffect(() => {
    // Initial health check after a short delay to not block UI
    const initialTimeout = setTimeout(() => {
      checkServerHealth();
    }, 2000);

    const interval = setInterval(() => {
      checkServerHealth();
    }, 60000); // Check every 60 seconds (less frequent to reduce load)

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  // Note: Toast notifications are handled by the main App.jsx component

  const handleRetryConnection = () => {
    // Try health check first, if it fails multiple times, suggest refresh
    if (retryCount >= 2) {
      // After 2 failed attempts, refresh the page to reset everything
      window.location.reload();
    } else {
      // Simple retry for first few attempts
      setServerStatus('checking');
      checkServerHealth();
    }
  };

  const getStatusColor = () => {
    switch (serverStatus) {
      case 'healthy':
        return 'green';
      case 'degraded':
        return 'yellow';
      case 'unhealthy':
        return 'red';
      case 'checking':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getErrorIcon = () => {
    if (errorDetails?.type === 'timeout') return <Spinner size='sm' />;
    return <WarningIcon />;
  };

  const renderErrorAlert = () => {
    // Only show alerts for actual errors, not during checking
    if (serverStatus === 'healthy' || serverStatus === 'checking') return null;

    return (
      <Alert status='warning' mb={4} borderRadius='md' size='sm'>
        <AlertIcon as={WarningIcon} />
        <Box flex='1'>
          <AlertTitle fontSize='sm'>Service Notice</AlertTitle>
          <AlertDescription fontSize='sm'>
            {errorDetails?.message ||
              'Health check failed - but you can still use the chatbot.'}
          </AlertDescription>

          <HStack mt={2} spacing={2}>
            <Button
              size='xs'
              leftIcon={<RepeatIcon />}
              onClick={handleRetryConnection}
              colorScheme='blue'
              variant='outline'
            >
              {retryCount >= 2 ? 'Refresh Page' : 'Try Again'}
            </Button>
            <Button
              size='xs'
              leftIcon={<ChatIcon />}
              onClick={onLibrarianHelp}
              colorScheme='green'
              variant='outline'
            >
              Talk to Librarian
            </Button>
          </HStack>
        </Box>
      </Alert>
    );
  };

  const renderStatusBadge = () => {
    if (serverStatus === 'healthy') return null;

    return (
      <Box position='fixed' top={4} right={4} zIndex={1000}>
        <Badge
          colorScheme={getStatusColor()}
          variant='solid'
          px={3}
          py={1}
          borderRadius='full'
          fontSize='xs'
        >
          {serverStatus === 'checking' && <Spinner size='xs' mr={2} />}
          {serverStatus.toUpperCase()}
        </Badge>
      </Box>
    );
  };

  return (
    <>
      {renderStatusBadge()}

      <Box>
        {renderErrorAlert()}

        {/* Render children normally - never block UI */}
        <Box>{children}</Box>
      </Box>
    </>
  );
};

export default ErrorBoundaryComponent;
