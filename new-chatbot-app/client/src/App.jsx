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
  const { socketContextValues: scv } = useContext(SocketContext);
  const { messageContextValues: mcv } = useContext(MessageContext);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mcv.message]);

  useEffect(() => {
    if (!scv.isConnected && scv.attemptedConnection) {
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
  }, [scv.isConnected, scv.attemptedConnection, toast]);

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
