import { Box, VStack, HStack, Input, Button, Text } from "@chakra-ui/react";
import MessageComponents from './ParseLinks';
import { useState, useEffect } from "react";
import './ChatBotComponent.css';

const ChatBotComponent = () => {

  // TODO: Remove, only here for testing
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const isConnected = true;
  const isTyping = false;
  
  // TODO: Remove, only here for testing
  useEffect(() => {
    const welcomeMessage = {
      text: 'Hi this is the Library Smart Chatbot. How may I help you?',
      sender: 'chatbot',
    };
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, welcomeMessage];
      // Store the messages in the session storage
      sessionStorage.setItem(
        'chat_messages',
        JSON.stringify(updatedMessages),
      );
      return updatedMessages;
    });
  }, [])

  return (
    <>
      <Box className="chat">
        <VStack align="start" spacing={4}>
          {!isConnected && (
            <Box
              maxW="350px"
              px={5}
              py={3}
              rounded="md"
              bg={'gray.200'}
              alignSelf={'flex-start'}
            >
              <Text color={"black"}>Connecting to the chatbot</Text>
            </Box>
          )}

          {messages.map((message, index) => {
            const adjustedMessage =
              typeof message.text === 'object'
                ? message.text.response.join('')
                : message.text;
            return (
              <Box
                key={index}
                maxW="md"
                px={5}
                py={3}
                rounded="md"
                bg={message.sender === 'user' ? 'white' : 'gray.200'}
                border={message.sender === 'user' ? '1px' : '0px'}
                borderColor={
                  message.sender === 'user' ? 'red.400' : ' '
                }
                alignSelf={
                  message.sender === 'user'
                    ? 'flex-end'
                    : 'flex-start'
                }
              >
                <Box
                  color={
                    message.sender === 'user' ? 'red.600' : 'black'
                  }
                  whiteSpace="pre-line"
                >
                  {typeof message.text === 'object' ? (
                    <div className="half-line-height">
                      <MessageComponents msg={adjustedMessage} />
                    </div>
                  ) : (
                    <MessageComponents msg={adjustedMessage} />
                  )}
                </Box>
              </Box>
            );
          })}

          {isTyping && (
            <Box>
              <Text>
                Chatbot is thinking <span className="dots"></span>
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
      <form>
        <HStack spacing={3}>
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={!isConnected}
          />
          <Button
            colorScheme="red"
            type="submit"
            disabled={!isConnected}
          >
            Send
          </Button>
        </HStack>
      </form>
    </>
  );
  
}

export default ChatBotComponent;