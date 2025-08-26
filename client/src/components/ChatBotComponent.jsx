import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import MessageComponents from './ParseLinks';
import { useContext, useRef, useEffect, useState } from 'react';
import { SocketContext } from '../context/SocketContextProvider';
import { MessageContext } from '../context/MessageContextProvider';
import MessageRatingComponent from './MessageRatingComponent';
import HumanLibrarianWidget from './HumanLibrarianWidget';
import './ChatBotComponent.css';

const ChatBotComponent = () => {
  const { socketContextValues } = useContext(SocketContext);
  const { messageContextValues } = useContext(MessageContext);
  const chatRef = useRef();
  const [widgetVisible, setWidgetVisible] = useState(false);

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

  // Determine if we should show service issues alert
  const shouldShowServiceAlert =
    !socketContextValues.serviceHealthy ||
    socketContextValues.connectionErrors >= 3 ||
    (!socketContextValues.isConnected &&
      socketContextValues.attemptedConnection);

  // Auto-show librarian widget based on service status
  useEffect(() => {
    if (socketContextValues.showLibrarianWidget && !widgetVisible) {
      setWidgetVisible(true);
    }
  }, [socketContextValues.showLibrarianWidget, widgetVisible]);

  return (
    <>
      {/* Service Status Alert */}
      {shouldShowServiceAlert && (
        <Alert status='warning' mb={4}>
          <AlertIcon />
          <Box>
            <AlertTitle>Service Issue Detected!</AlertTitle>
            <AlertDescription>
              {!socketContextValues.serviceHealthy
                ? 'The chatbot service is experiencing technical difficulties. '
                : 'Unable to connect to the chatbot service. '}
              Please contect to a human librarian for immediate assistance.
            </AlertDescription>
          </Box>
          <Spacer />
          <Button
            size='sm'
            colorScheme='blue'
            onClick={() => setWidgetVisible(!widgetVisible)}
          >
            {widgetVisible ? 'Hide' : 'Chat with Human Librarian'}
          </Button>
        </Alert>
      )}

      {/* Human Librarian Widget */}
      {widgetVisible && (
        <Box
          mb={4}
          p={4}
          border='1px'
          borderColor='blue.200'
          borderRadius='md'
          bg='blue.50'
        >
          <Flex justify='space-between' align='center' mb={2}>
            <Text fontWeight='bold' color='blue.700'>
              Chat with a Human Librarian
            </Text>
            <Button size='xs' onClick={() => setWidgetVisible(false)}>
              ✕
            </Button>
          </Flex>
          <HumanLibrarianWidget />
        </Box>
      )}

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
