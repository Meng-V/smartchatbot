import { useContext, useEffect, useState } from 'react';
import {
  Box,
  Button,
  VStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Flex,
  Text,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import RealLibrarianWidget from './components/RealLibrarianWidget';
import OfflineTicketWidget from './components/OfflineTicketWidget';
import ChatBotComponent from './components/ChatBotComponent';
import ErrorBoundaryComponent from './components/ErrorBoundaryComponent';
import { useToast } from '@chakra-ui/react';
import { SocketContext } from './context/SocketContextProvider';
import FeedbackFormComponent from './components/FeedbackFormComponent';
import useServerHealth from './hooks/useServerHealth';

const App = () => {
  const { isOpen, onOpen, onClose } = useDisclosure({ defaultIsOpen: true }); // Open by default
  const [step, setStep] = useState('initial');
  const toast = useToast();
  const { socketContextValues } = useContext(SocketContext);
  const { serverStatus, needsAttention, retryHealthCheck } = useServerHealth();

  useEffect(() => {
    if (
      !socketContextValues.isConnected &&
      socketContextValues.attemptedConnection
    ) {
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
  }, [
    socketContextValues.isConnected,
    socketContextValues.attemptedConnection,
    toast,
  ]);

  // Auto-redirect to librarian if server is critically unhealthy
  useEffect(() => {
    if (serverStatus === 'unhealthy' && isOpen && step === 'services') {
      toast({
        title: 'Service Unavailable',
        description: 'Redirecting you to a human librarian for assistance.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      setStep('realLibrarian');
    }
  }, [serverStatus, isOpen, step, toast]);

  // Handler for when user clicks "Talk to Librarian" from error boundary
  const handleLibrarianHelp = () => {
    if (!isOpen) {
      onOpen(); // Open the modal if it's not already open
    }
    setStep('realLibrarian'); // Navigate to the librarian step
    
    toast({
      title: 'Connecting to Librarian',
      description: 'Redirecting you to chat with a real librarian.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleClose = () => {
    setStep('initial');
    onClose();
  };

  return (
    <ErrorBoundaryComponent onLibrarianHelp={handleLibrarianHelp}>
      {/* Welcome background */}
      <Box
        minH="100vh"
        bg="gray.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
      >
        <Box
          textAlign="center"
          mb={8}
          opacity={isOpen ? 0.3 : 1}
          transition="opacity 0.3s ease"
          cursor={!isOpen ? "pointer" : "default"}
          onClick={!isOpen ? onOpen : undefined}
          _hover={!isOpen ? { opacity: 0.8 } : {}}
        >
          <img
            src="https://libapps.s3.amazonaws.com/accounts/190074/images/0721_STier1_Libraries_HS_186KW_K_Digital.png"
            height={80}
            width={200}
            alt="library logo"
            style={{ margin: '0 auto 20px' }}
          />
          <Text fontSize="2xl" fontWeight="bold" color="gray.700" mb={2}>
            Welcome to Smart Chatbot
          </Text>
          <Text fontSize="md" color="gray.600">
            Get help with research, ask questions, or talk to a librarian
          </Text>
          {!isOpen && (
            <Text fontSize="sm" color="blue.500" mt={3} fontWeight="semibold">
              Get Started
            </Text>
          )}
        </Box>
      </Box>

      <Modal isOpen={isOpen} onClose={handleClose} isCentered>
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent
          maxW='450px'
          mx={4}
          borderRadius='lg'
          boxShadow='xl'
        >
          <ModalHeader
            display='flex'
            alignItems='center'
            justifyContent={'space-evenly'}
            ps={0}
          >
            <img
              src='https://libapps.s3.amazonaws.com/accounts/190074/images/0721_STier1_Libraries_HS_186KW_K_Digital.png'
              height={50}
              width={120}
              alt='library logo'
            />
            Smart Chatbot
          </ModalHeader>
          <ModalCloseButton />
          <Flex justify='space-between'>
            {step !== 'initial' && (
              <Button
                leftIcon={<ArrowBackIcon />}
                colorScheme='red'
                variant='outline'
                width='20%'
                size='xs'
                ml={'7%'}
                onClick={() => setStep('initial')}
              >
                Back
              </Button>
            )}
            {step === 'services' && <FeedbackFormComponent />}
          </Flex>
          <ModalBody py={5}>
            {step === 'initial' && (
              <VStack>
                <Button 
                  onClick={() => setStep('services')}
                  isDisabled={serverStatus === 'unhealthy'}
                  opacity={serverStatus === 'unhealthy' ? 0.6 : 1}
                >
                  Library Chatbot {needsAttention && '(Unavailable)'}
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
          {step == 'services' && (
            <Button
              size='sm'
              colorScheme='red'
              position='fixed'
              bottom={10}
              right={20}
              mr={4}
              onClick={() => setStep('realLibrarian')}
            >
              Chat with a real librarian
            </Button>
          )}
        </ModalContent>
      </Modal>
    </ErrorBoundaryComponent>
  );
};

export default App;
