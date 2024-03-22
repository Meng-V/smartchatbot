import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ChakraProvider } from '@chakra-ui/react';
import { SocketContextProvider } from './context/SocketContextProvider.jsx';
import { MessageContextProvider } from './context/MessageContextProvider.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider>
      <SocketContextProvider>
        <MessageContextProvider>
          <App />
        </MessageContextProvider>
      </SocketContextProvider>
    </ChakraProvider>
  </React.StrictMode>,
);
