import { Box, VStack, HStack, Input, Button, Text, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import MessageComponents from './ParseLinks';
import { useContext, useRef, useEffect, useState } from 'react';
import { SocketContext } from '../context/SocketContextProvider';
import { MessageContext } from '../context/MessageContextProvider';
import MessageRatingComponent from './MessageRatingComponent';
import RealLibrarianWidget from './RealLibrarianWidget';
import './ChatBotComponent.css';

const ChatBotComponent = () => {
  const { socketContextValues } = useContext(SocketContext);
  const { messageContextValues } = useContext(MessageContext);
  const chatRef = useRef();
  const [showLibrarianWidget, setShowLibrarianWidget] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [connectionErrors, setConnectionErrors] = useState(0);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (messageContextValues.inputMessage && socketContextValues.socket) {
      messageContextValues.addMessage(
        messageContextValues.inputMessage,
        'user',
      );
      messageContextValues.setInputMessage('');
      messageContextValues.setIsTyping(true);
      socketContextValues.sendUserMessage(messageContextValues.inputMessage);
    }
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messageContextValues.message]);

  // Monitor connection status and errors
  useEffect(() => {
    if (!socketContextValues.isConnected) {
      setConnectionErrors(prev => prev + 1);
      
      // Show librarian widget after 3 connection failures or 30 seconds of disconnection
      const timer = setTimeout(() => {
        if (!socketContextValues.isConnected) {
          setErrorMessage('The SmartChatbot is currently experiencing technical difficulties. Please use the Real Librarian chat below for immediate assistance.');
          setShowLibrarianWidget(true);
        }
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    } else {
      // Reset error count when connected
      if (connectionErrors > 0) {
        setConnectionErrors(0);
      }
    }
  }, [socketContextValues.isConnected, connectionErrors]);

  // Monitor for error messages from the server
  useEffect(() => {
    const lastMessage = messageContextValues.message[messageContextValues.message.length - 1];
    if (lastMessage && lastMessage.sender !== 'user') {
      const messageText = typeof lastMessage.text === 'object' 
        ? lastMessage.text.response?.join('') || ''
        : lastMessage.text || '';
      
      // Check if the message indicates an error or suggests talking to a librarian
      if (messageText.toLowerCase().includes('talk to a real librarian') ||
          messageText.toLowerCase().includes('technical difficulties') ||
          messageText.toLowerCase().includes('system issue') ||
          messageText.toLowerCase().includes('unable to process')) {
        
        setErrorMessage('The SmartChatbot encountered an issue with your request. Please use the Real Librarian chat below for immediate assistance.');
        setShowLibrarianWidget(true);
      }
    }
  }, [messageContextValues.message]);

  // Show widget immediately if too many connection errors
  useEffect(() => {
    if (connectionErrors >= 3) {
      setErrorMessage('The SmartChatbot is having connection issues. Please use the Real Librarian chat below for immediate assistance.');
      setShowLibrarianWidget(true);
    }
  }, [connectionErrors]);

  return (
    <>
      <Box ref={chatRef} className='chat'>
        <VStack align='start' spacing={4}>
          {messageContextValues.message.map((message, index) => {
            const adjustedMessage =
              typeof message.text === 'object'
                ? message.text.response.join('')
                : message.text;
            return (
              <Box
                key={index}
                alignSelf={
                  message.sender === 'user' ? 'flex-end' : 'flex-start'
                }
              >
                <Box
                  maxW='md'
                  px={5}
                  py={3}
                  rounded='md'
                  bg={message.sender === 'user' ? 'white' : 'gray.200'}
                  border={message.sender === 'user' ? '1px' : '0px'}
                  borderColor={message.sender === 'user' ? 'red.400' : ' '}
                >
                  <Box
                    color={message.sender === 'user' ? 'red.600' : 'black'}
                    whiteSpace='pre-line'
                  >
                    {typeof message.text === 'object' ? (
                      <div className='half-line-height'>
                        <MessageComponents msg={adjustedMessage} />
                      </div>
                    ) : (
                      <MessageComponents msg={adjustedMessage} />
                    )}
                  </Box>
                </Box>
                {message.sender !== 'user' && index !== 0 && (
                  <MessageRatingComponent message={message} />
                )}
              </Box>
            );
          })}
          {messageContextValues.isTyping && (
            <Box
              maxW='md'
              px={5}
              py={3}
              rounded='md'
              bg={'gray.200'}
              border={'0px'}
            >
              <Text>
                Chatbot is thinking <span className='dots'></span>
              </Text>
            </Box>
          )}
          {!socketContextValues.isConnected && (
            <Box
              maxW='350px'
              px={5}
              py={3}
              rounded='md'
              bg={'gray.200'}
              alignSelf={'flex-start'}
            >
              <Text color={'black'}>
                Connecting to the chatbot <span className='dots'></span>
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
      
      {/* Show Real Librarian Widget when errors occur */}
      {showLibrarianWidget && (
        <Box mt={4} p={4} border="2px" borderColor="red.200" borderRadius="md" bg="red.50">
          <Alert status="warning" mb={3}>
            <AlertIcon />
            <Box>
              <AlertTitle>SmartChatbot Issue Detected!</AlertTitle>
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Box>
          </Alert>
          <Text fontSize="md" fontWeight="bold" mb={3} color="red.700">
            🧑‍💼 Talk to a Real Librarian
          </Text>
          <RealLibrarianWidget />
          <Button 
            mt={3} 
            size="sm" 
            colorScheme="gray" 
            onClick={() => setShowLibrarianWidget(false)}
          >
            Hide Librarian Chat
          </Button>
        </Box>
      )}

      <form onSubmit={handleFormSubmit}>
        <HStack spacing={3}>
          <Input
            value={messageContextValues.inputMessage}
            onChange={(e) =>
              messageContextValues.setInputMessage(e.target.value)
            }
            placeholder='Type your message...'
            disabled={!socketContextValues.isConnected}
          />
          <Button
            colorScheme='red'
            type='submit'
            disabled={!socketContextValues.isConnected}
          >
            Send
          </Button>
        </HStack>
      </form>
      <Text fontSize='xs' pt={2} color='gray.500'>
        Chatbot can make mistakes, please contact librarians if needed.
      </Text>
    </>
  );
};

export default ChatBotComponent;
