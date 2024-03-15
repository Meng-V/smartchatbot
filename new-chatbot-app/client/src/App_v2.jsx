import { useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import {
  Button,
  VStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  IconButton,
} from '@chakra-ui/react';
import { ArrowBackIcon, ChatIcon } from '@chakra-ui/icons';
import RealLibrarianWidget from './components/RealLibrarianWidget';
import OfflineTicketWidget from './components/OfflineTicketWidget';
import ChatBotComponent from './components/ChatBotComponent';
import { useToast } from '@chakra-ui/react';

import useSocket from './hooks/useSocket';
import { SocketContext } from './context/SocketContextProvider';
import { MessageContext } from './context/MessageContextProvider';

import './App.css';
import { retrieveEnvironmentVariable } from './services/RetrieveEnvironmentVariable';

const App_v2 = () => {

  const chatRef = useRef();
  const [messages, setMessages] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [inputMessage, setInputMessage] = useState('');
  const [step, setStep] = useState('initial');
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef();
  const toast = useToast();

  const { socket, isConnected, attemptedConnection, setIsConnected, setAttemptedConnection } = useContext(SocketContext);
  const { setIsWelcomeMessage, setMessage, isWelcomeMessage, addMessage } = useContext(MessageContext);
 
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

  /**
   * Hook to scroll to the bottom of the chat window
   */
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * Hook to display the toast message when the connection is not established
   */
  useEffect(() => {
    // Only show the toast if the connection has been attempted and the connection is not established
    if (!isConnected && attemptedConnection) {
      // Display the toast
      toast({
        title: 'Connection Error',
        description:
          'The Smart Chatbot is currently not available. Please talk to a human librarian or create a ticket for further help.',
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'bottom-left',
      });
    }
  }, [isConnected, attemptedConnection, toast]);

  /**
   * Function to handle the user message submission
   * @param {*} e event
   */
  

  /**
   * Function to handle the modal close
   */
  const handleClose = () => {
    setStep('initial');
    setIsWelcomeMessage(false);
    onClose();
  };

  return (
    <>
      {/* Chat icon starts here */}
      <IconButton
        boxSize={6}
        onClick={onOpen}
        icon={<ChatIcon />}
        position="fixed"
        bottom={10}
        right={10}
        width={30}
        height={30}
      />

      {/* Modal starts here. If icon above is clicked */}
      <Modal isOpen={isOpen} onClose={handleClose}>
        <ModalOverlay /> {/* Overlay to dim the background */}
        <ModalContent
          maxW="350px"
          position="fixed"
          bottom="60px"
          right="10"
          borderRadius="md"
        >
          <ModalHeader
            display="flex"
            alignItems="center"
            justifyContent={'space-evenly'}
            ps={0}
          >
            <img
              src="https://libapps.s3.amazonaws.com/accounts/190074/images/0721_STier1_Libraries_HS_186KW_K_Digital.png"
              height={50}
              width={120}
              alt="library logo"
            />
            Smart Chatbot
          </ModalHeader>
          <ModalCloseButton />

          {/* Modal body starts here */}
          {step !== 'initial' && (
            <Button
              leftIcon={<ArrowBackIcon />}
              colorScheme="red"
              variant="outline"
              width="20%"
              size="xs"
              ml={'7%'}
              onClick={() => setStep('initial')}
            >
              Back
            </Button>
          )}

          {/* 3 options */}
          <ModalBody py={5}>
            {step === 'initial' && (
              <VStack>
                <Button onClick={() => setStep('services')}>
                  Library Chatbot
                </Button>
                <Button onClick={() => setStep('realLibrarian')}>
                  Talk to a human librarian
                </Button>
                <Button onClick={() => setStep('ticket')}>
                  Create a ticket for offline help
                </Button>
              </VStack>
            )}

            {/* Option #1: Chatbot */}
            {step === 'services' && <ChatBotComponent />}

            {/* Option #2: Real Librarian */}
            {step === 'realLibrarian' && <RealLibrarianWidget />}

            {/* Option #3: Ticket */}
            {step === 'ticket' && <OfflineTicketWidget />}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default App_v2;
