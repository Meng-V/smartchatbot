import { createContext, useState, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { retrieveEnvironmentVariable } from "../services/RetrieveEnvironmentVariable";
import { MessageContext } from "./MessageContextProvider";
import { useMemo } from "react";

const url = `${retrieveEnvironmentVariable('VITE_BACKEND_URL')}:${retrieveEnvironmentVariable(
  'VITE_BACKEND_PORT',
)}`;
const SocketContext = createContext();

const SocketContextProvider = ({children}) => {
  
  const socket = useRef(null);
  const curSession = useRef(true);
  const [isConnected, setIsConnected] = useState(false);
  const [attemptedConnection, setAttemptedConnection] = useState(false);
  const { messageContextValues } = useContext(MessageContext);

  useEffect(() => {
    if (!socket.current) {
      socket.current = io(url, { transports: ['websocket'], upgrade: false });
    } else {
      socket.current.on('connect', () => {
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
  
      socket.current.on('message', ({messageId, message}) => {
        messageContextValues.setIsTyping(false);
        messageContextValues.addMessage(message, 'chatbot', messageId);
      });
  
      socket.current.on('disconnect', (reason) => {
        if (reason === "io client disconnect") {
          messageContextValues.resetState();
          curSession.current = true;
          socket.current.connect();
        } else {
          setIsConnected(false);
          setAttemptedConnection(true);
        }
      });
  
      socket.current.on('connect_error', (error) => {
        setIsConnected(false);
        setAttemptedConnection(true);
      });
  
      socket.current.on('connect_timeout', (timeout) => {
        setIsConnected(false);
        setAttemptedConnection(true);
      });
  
      return () => {
        socket.current.off('message');
        socket.current.off('disconnect');
        socket.current.off('connect_error');
        socket.current.off('connect_timeout');
      };
    }
  }, []);

  const sendUserMessage = (message) => {
    if (socket.current) {
      socket.current.emit("message", message);
    }
  }

  const offlineTicketSubmit = (formData) => {
    if (socket.current) {
      socket.current.emit(
        "createTicket",
        formData,
      )
    }
  };

  const sendMessageRating = (messageRating) => {
    if (socket.current) {
      socket.current.emit(
        "messageRating",
        messageRating,
      )
    }
  }

  const sendUserFeedback = (userFeedback) => {
    if (socket.current) {
      socket.current.emit(
        "userFeedback",
        userFeedback,
      );
      socket.current.disconnect();
    }
  }

  const socketContextValues = useMemo(() => ({
    socket: socket.current,
    isConnected,
    setIsConnected,
    attemptedConnection,
    setAttemptedConnection,
    sendUserMessage,
    offlineTicketSubmit,
    sendMessageRating,
    sendUserFeedback,
  }), [isConnected, attemptedConnection])

  return (
    <SocketContext.Provider value={{socketContextValues}}>
      {children}
    </SocketContext.Provider>
  );
}

export { SocketContext, SocketContextProvider };