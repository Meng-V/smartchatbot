import { createContext, useState, useRef, useEffect } from "react";

const MessageContext = createContext();

const MessageContextProvider = (props) => {

  const [message, setMessage] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState(false);
  const newSession = useRef(true);

  useEffect(() => {
    if (newSession.current && !welcomeMessage) {
      const welcomeMessage = {
        text: 'Hi this is the Library Smart Chatbot. How may I help you?',
        sender: 'chatbot',
      };
      setMessage((prevMessages) => {
        const updatedMessages = [...prevMessages, welcomeMessage];
        sessionStorage.setItem(
          'chat_messages',
          JSON.stringify(updatedMessages),
        );
        return updatedMessages;
      });
      newSession.current = false;
      setWelcomeMessage(true);
    }
  }, [welcomeMessage]);

  const closeSession = () => {
    newSession.current = true;
  }

  const addMessage = (message, sender) => {
    const messageText =
      typeof message === 'object' && message.response
        ? message.response.join('\n')
        : message;
    setMessage((prevMessages) => {
      const updatedMessages = [...prevMessages, { text: messageText, sender }];
      sessionStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
      return updatedMessages;
    });
  };

  return (
    <MessageContext.Provider value={{
      message,
      setMessage,
      inputMessage,
      setInputMessage,
      isTyping,
      setIsTyping,
      welcomeMessage,
      setWelcomeMessage,
      closeSession,
      addMessage,
    }}>
      {props.children}
    </MessageContext.Provider>
  )

}

export { MessageContext, MessageContextProvider};