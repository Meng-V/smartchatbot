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
  Link,
  List,
  ListItem,
  Heading,
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
              Please contact a human librarian for immediate assistance.
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

            // Split out References block if present to render nicer citations
            const parts = adjustedMessage.split(/\nReferences:\n/i);
            const bodyText = parts[0] || '';
            const refsBlock = parts[1] || '';
            const references = refsBlock
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => l.length > 0)
              .slice(0, 5);

            const lowConfidenceHint = /No strong matches found|Institutional knowledge service is temporarily unavailable|ask a clarifying question/i.test(
              adjustedMessage,
            );
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
                        <MessageComponents msg={bodyText} />
                      </div>
                    ) : (
                      <MessageComponents msg={bodyText} />
                    )}
                  </Box>
                </Box>
                {/* Render nicely formatted citations when available */}
                {message.sender !== 'user' && references.length > 0 && (
                  <Box
                    maxW='md'
                    mt={2}
                    px={4}
                    py={3}
                    border='1px'
                    borderColor='gray.300'
                    rounded='md'
                    bg='gray.50'
                  >
                    <Heading as='h4' size='xs' mb={2} color='gray.700'>
                      Sources
                    </Heading>
                    <List spacing={1} styleType='disc' pl={4}>
                      {references.map((line, i) => {
                        const urlMatch = line.match(/https?:\/\/\S+/);
                        const url = urlMatch ? urlMatch[0] : undefined;
                        return (
                          <ListItem key={i} color='gray.700'>
                            {url ? (
                              <Link href={url} isExternal color='blue.600'>
                                {url}
                              </Link>
                            ) : (
                              <Text as='span'>{line}</Text>
                            )}
                          </ListItem>
                        );
                      })}
                    </List>
                  </Box>
                )}
                {/* Suggest human librarian when confidence appears low */}
                {message.sender !== 'user' && lowConfidenceHint && (
                  <Box mt={2}>
                    <Alert status='info' variant='left-accent'>
                      <AlertIcon />
                      <Text fontSize='sm'>
                        This answer may be uncertain. You can chat with a human librarian for faster help.
                      </Text>
                      <Spacer />
                      <Button
                        size='xs'
                        colorScheme='blue'
                        onClick={() => setWidgetVisible(true)}
                      >
                        Chat with Human Librarian
                      </Button>
                    </Alert>
                  </Box>
                )}
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
