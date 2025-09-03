import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { retrieveEnvironmentVariable } from '../services/RetrieveEnvironmentVariable';
import { MessageContext } from './MessageContextProvider';
import { useMemo } from 'react';
import axios from 'axios';

const SocketContext = createContext();

const SocketContextProvider = ({ children }) => {
  const socket = useRef(null);
  const curSession = useRef(true);
  const [isConnected, setIsConnected] = useState(false);
  const [attemptedConnection, setAttemptedConnection] = useState(false);
  const [serviceHealthy, setServiceHealthy] = useState(true);
  const [connectionErrors, setConnectionErrors] = useState(0);
  const [showLibrarianWidget, setShowLibrarianWidget] = useState(false);
  const [healthCheckInterval, setHealthCheckInterval] = useState(null);
  const { messageContextValues } = useContext(MessageContext);

  useEffect(() => {
    if (!socket.current) {
      // Use environment variables for production-ready configuration
      // const backendUrl = retrieveEnvironmentVariable('VITE_BACKEND_URL');
      // const backendPort = retrieveEnvironmentVariable('VITE_BACKEND_PORT');
      // const socketUrl = `${backendUrl}:${backendPort}`;

      // socket.current = io(socketUrl, {
      socket.current = io('', {
        path: '/smartchatbot/socket.io',
        transports: ['websocket'],
        upgrade: false,
      });
    }

    socket.current.on('connect', () => {
      console.log('Socket connected');
      if (curSession.current) {
        const welcomeMessage = {
          text: 'Hi this is the Library Smart Chatbot. How may I help you?',
          sender: 'chatbot',
        };
        messageContextValues.setMessage((prevMessages) => {
          const updatedMessages = [...prevMessages, welcomeMessage];
          sessionStorage.setItem(
            'chat_messages',
            JSON.stringify(updatedMessages),
          );
          return updatedMessages;
        });
        curSession.current = false;
      }
      setIsConnected(true);
      setAttemptedConnection(true);
      messageContextValues.setIsTyping(false);
    });

    socket.current.on('message', ({ messageId, message }) => {
      console.log('Message received:', message);
      messageContextValues.setIsTyping(false);
      messageContextValues.addMessage(message, 'chatbot', messageId);
    });

    socket.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io client disconnect') {
        messageContextValues.resetState();
        curSession.current = true;
        socket.current.connect();
      } else {
        setIsConnected(false);
        setAttemptedConnection(true);
      }
    });

    socket.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
      setAttemptedConnection(true);
      setConnectionErrors((prev) => prev + 1);

      // Show librarian widget after 3 connection errors
      if (connectionErrors >= 2) {
        setShowLibrarianWidget(true);
      }
    });

    socket.current.on('connect_timeout', (timeout) => {
      console.warn('Connection timeout');
      setIsConnected(false);
      setAttemptedConnection(true);
      setConnectionErrors((prev) => prev + 1);

      // Show librarian widget after connection timeout
      if (connectionErrors >= 2) {
        setShowLibrarianWidget(true);
      }
    });

    return () => {
      socket.current.off('message');
      socket.current.off('disconnect');
      socket.current.off('connect_error');
      socket.current.off('connect_timeout');

      // Clear health check interval
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, [connectionErrors]);

  // Health check monitoring
  useEffect(() => {
    const checkServiceHealth = async () => {
      try {
        const response = await axios.get('/health', {
          timeout: 10000, // 10 second timeout
        });

        if (response.status === 200 && response.data.status === 'healthy') {
          setServiceHealthy(true);
          setConnectionErrors(0);
          // Hide librarian widget if service is healthy and connected
          if (isConnected) {
            setShowLibrarianWidget(false);
          }
        } else if (
          response.status === 503 ||
          response.data.status === 'degraded'
        ) {
          // Service is degraded/unhealthy
          setServiceHealthy(false);
          setShowLibrarianWidget(true);
          console.warn('Service is degraded:', response.data);
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setServiceHealthy(false);
        setConnectionErrors((prev) => prev + 1);

        // Show librarian widget if health check fails multiple times
        if (connectionErrors >= 2) {
          setShowLibrarianWidget(true);
        }
      }
    };

    // Initial health check
    checkServiceHealth();

    // Set up periodic health checks every 30 seconds
    const interval = setInterval(checkServiceHealth, 30000);
    setHealthCheckInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected, connectionErrors]);

  // Monitor for extended disconnection periods
  useEffect(() => {
    let disconnectionTimer;

    if (!isConnected && attemptedConnection) {
      // Show librarian widget after 30 seconds of disconnection
      disconnectionTimer = setTimeout(() => {
        setShowLibrarianWidget(true);
      }, 30000);
    } else if (isConnected) {
      // Clear timer if reconnected
      if (disconnectionTimer) {
        clearTimeout(disconnectionTimer);
      }
    }

    return () => {
      if (disconnectionTimer) {
        clearTimeout(disconnectionTimer);
      }
    };
  }, [isConnected, attemptedConnection]);

  const sendUserMessage = (message) => {
    if (socket.current) {
      socket.current.emit('message', message);
    }
  };

  const offlineTicketSubmit = (formData) => {
    if (socket.current) {
      socket.current.emit('createTicket', formData);
    }
  };

  const sendMessageRating = (messageRating) => {
    if (socket.current) {
      socket.current.emit('messageRating', messageRating);
    }
  };

  const sendUserFeedback = (userFeedback) => {
    if (socket.current) {
      socket.current.emit('userFeedback', userFeedback);
      socket.current.disconnect();
    }
  };

  const socketContextValues = useMemo(
    () => ({
      socket: socket.current,
      isConnected,
      setIsConnected,
      attemptedConnection,
      setAttemptedConnection,
      serviceHealthy,
      connectionErrors,
      showLibrarianWidget,
      setShowLibrarianWidget,
      sendUserMessage,
      offlineTicketSubmit,
      sendMessageRating,
      sendUserFeedback,
    }),
    [
      isConnected,
      attemptedConnection,
      serviceHealthy,
      connectionErrors,
      showLibrarianWidget,
    ],
  );

  return (
    <SocketContext.Provider value={{ socketContextValues }}>
      {children}
    </SocketContext.Provider>
  );
};

export { SocketContext, SocketContextProvider };
