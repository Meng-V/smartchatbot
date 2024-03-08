import { retrieveEnvironmentVariable } from '../services/RetrieveEnvironmentVariable';
import { createContext, useEffect, useState, useRef } from "react";
import { io } from 'socket.io-client';

const SocketContext = createContext();

const SocketContextProvider = (props) => {

  const [isConnected, setIsConnected] = useState(false);

  // Set up URL from environment variables
  const url = `${retrieveEnvironmentVariable('VITE_BACKEND_URL')}:${retrieveEnvironmentVariable(
    'VITE_BACKEND_PORT',
  )}`;
  // Connect to the socket server with option to use websocket and disable upgrade
  const socketIo = useRef(null);

  useEffect(() => {
    if (!isConnected) {
      socketIo.current = io(url, { transports: ['websocket'], upgrade: false });

      socketIo.current.on('connect', () => {
        console.info('Successfully connected to socket!');
        setIsConnected(true);
      });

      socketIo.current.on('disconnect', function () {
        console.info('Successfully disconnected');
        setIsConnected(false);
      });
  
      socketIo.current.on('connect_error', (error) => {
        console.error('Connection Error:', error);
        setIsConnected(false);
      });
  
      socketIo.current.on('connect_timeout', (timeout) => {
        console.error('Connection Timeout:', timeout);
        setIsConnected(false);
      });
    }

    return () => {
      if (socketIo.current && socketIo.current.connected) {
        socketIo.current.disconnect()
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socketIo.current}>
      {props.children}
    </SocketContext.Provider>
  )

}

export { SocketContext, SocketContextProvider };