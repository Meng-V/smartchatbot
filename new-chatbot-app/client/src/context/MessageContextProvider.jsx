import { createContext, useState } from "react";

const MessageContext = createContext();

const MessageContextProvider = (props) => {

  const [message, setMessage] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

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
      addMessage,
    }}>
      {props.children}
    </MessageContext.Provider>
  )

}

export { MessageContext, MessageContextProvider};