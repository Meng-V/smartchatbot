import { createContext, useState, useMemo } from "react";

const MessageContext = createContext();

const MessageContextProvider = ({children}) => {

  const [message, setMessage] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const addMessage = (message, sender, id = undefined) => {
    const messageText =
      typeof message === 'object' && message.response
        ? message.response.join('\n')
        : message;
    setMessage((prevMessages) => {
      const updatedMessages = [...prevMessages, { text: messageText, sender, messageId: id }];
      sessionStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
      return updatedMessages;
    });
  };

  const messageContextValues = useMemo(() => ({
    message,
    setMessage,
    inputMessage,
    setInputMessage,
    isTyping,
    setIsTyping,
    addMessage,
  }), [message, inputMessage, isTyping]);

  return (
    <MessageContext.Provider value={{messageContextValues}}>
      {children}
    </MessageContext.Provider>
  )

}

export { MessageContext, MessageContextProvider};