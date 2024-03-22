import { useContext, useEffect, useRef, useState } from 'react';
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
import { SocketContext } from './context/SocketContextProvider';
import { MessageContext } from './context/MessageContextProvider';

const App = () => {

  const chatRef = useRef();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [step, setStep] = useState('initial');
  const toast = useToast();
  const firstSession = useRef(true);
  const { socket, isConnected, attemptedConnection, setIsConnected, setAttemptedConnection } = useContext(SocketContext);
  const { setMessage, message, addMessage, setIsTyping, } = useContext(MessageContext);

  useEffect(() => {
    socket.on('connect', () => {
      if (firstSession.current) {
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
        firstSession.current = false;
      }
      setIsConnected(true);
      setAttemptedConnection(true);
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
  }, [isConnected, setMessage]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [message]);

  useEffect(() => {
    if (!isConnected && attemptedConnection) {
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

  const handleClose = () => {
    setStep('initial');
    onClose();
  };

  return (
    <>
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

      <Modal isOpen={isOpen} onClose={handleClose}>
        <ModalOverlay />
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
            {step === 'services' && <ChatBotComponent />}
            {step === 'realLibrarian' && <RealLibrarianWidget />}
            {step === 'ticket' && <OfflineTicketWidget />}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default App;
