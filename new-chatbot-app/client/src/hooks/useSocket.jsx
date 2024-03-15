import { SocketContext } from "../context/SocketContextProvider";
import { MessageContext } from "../context/MessageContextProvider";
import { useContext, useEffect } from "react";

const useSocket = () => {

  const { socket, setIsConnected, setAttemptedConnection } = useContext(SocketContext);
  const { setMessage, setIsTyping, isWelcomeMessage, setIsWelcomeMessage, addMessage } = useContext(MessageContext);
  
  const storedMessages = 
    JSON.parse(sessionStorage.getItem('chat_messages')) || [];
  setMessage(storedMessages);

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true); // Update the state to indicate that the connection is established
      setAttemptedConnection(true); // Update the state to indicate that the connection has been attempted
      if (!isWelcomeMessage) {
        // Send the welcome message only once per session
        const welcomeMessage = {
          text: 'Hi this is the Library Smart Chatbot. How may I help you?',
          sender: 'chatbot',
        };
        setMessage((prevMessages) => {
          const updatedMessages = [...prevMessages, welcomeMessage];
          // Store the messages in the session storage
          sessionStorage.setItem(
            'chat_messages',
            JSON.stringify(updatedMessages),
          );
          return updatedMessages;
        });
        setIsWelcomeMessage(true); // Update the state to ensure the welcome message is shown only once
      }
      setIsTyping(false);
    });

    socket.on('message', function (message) {
      setIsTyping(false);
      addMessage(message, 'chatbot');
    });

    socket.on('disconnect', function () {
      setIsConnected(false);
      setAttemptedConnection(true);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection Error:', error);
      setIsConnected(false);
      setAttemptedConnection(true);
    });

    socket.on('connect_timeout', (timeout) => {
      console.error('Connection Timeout:', timeout);
      setIsConnected(false);
      setAttemptedConnection(true);
    });

    return () => {
      socket.off('message');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('connect_timeout');
    };
  }, [isWelcomeMessage, setMessage]);

}

export default useSocket;