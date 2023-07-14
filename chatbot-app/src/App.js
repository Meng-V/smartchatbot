import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import {
  HStack,
  Input,
  Button,
  Box,
  Text,
  VStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  IconButton,
  FormControl, 
  FormLabel
} from "@chakra-ui/react";
import { ChatIcon } from "@chakra-ui/icons";
import "./App.css";

const App = () => {
  const chatRef = useRef();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [inputMessage, setInputMessage] = useState('');
  const [step, setStep] = useState("initial");
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    const url = `http://localhost:${process.env.REACT_APP_PORT}`;
    const socketIo = io(url, { transports: ['websocket'], upgrade: false });
    socketIo.on('connection', () => {
      console.log('Connected');
      // addMessage("Hi this is the Library chatbot, how may I help you?", 'chatbot');
    });

    setSocket(socketIo);
  }, []);

  const addMessage = (message, sender) => {
    setMessages((prevMessages) => [...prevMessages, { text: message, sender }]);
  };

  useEffect(() => {
    if (socket) {
      
    addMessage("Hi this is the Library chatbot, how may I help you?", 'chatbot');
      socket.on('message', function (message) {
        addMessage(message, 'chatbot');
      });

      socket.on('disconnected', function () {
        addMessage('User disconnected....', 'chatbot');
      });

      return () => {
        socket.off('message');
        socket.off('disconnect');
      }
    }
  }, [socket]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (inputMessage) {
      addMessage(inputMessage, 'user');
      setInputMessage('');
      if (socket) {
        socket.emit("message", inputMessage, (response) => {
          console.log(response);
        });
      }
    }
  };

  const handleClose = () => {
    setStep('initial');
    setMessages([]);
    setInputMessage('');
    onClose();
  };

  const handleServicesClick = () => {
    setStep("services");
    // do any additional setup for this step
  };

  const handleLibrarianClick = () => {
    window.open(" https://www.lib.miamioh.edu/research/research-support/ask/", "_blank");
  };

  const handleTicketClick = () => {
    setStep("ticket");
    // do any additional setup for this step
  };

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    // handle the ticket creation logic here
    if (socket) {
      socket.emit(
        "createTicket",
        {
          question: question,
          email: email,
          name: name,
          details: details,
          ua: navigator.userAgent,
        },
        (responseMessage) => {
          console.log(responseMessage);
          setStep("initial")
        }
      );
    }
  };  

  return (
    <>
      <IconButton
        onClick={onOpen}
        icon={<ChatIcon />}
        position="fixed"
        bottom={10}
        right={10}
        width={50}
        height={50}
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
          <ModalHeader>LibChat Library Chatbot</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {step === "initial" && (
              <VStack>
                <Button onClick={handleServicesClick}>Services I provide</Button>
                <Button onClick={handleLibrarianClick}>Talk to a human librarian</Button>
                <Button onClick={handleTicketClick}>Create a ticket for offline help</Button>
              </VStack>
            )}
  
            {step === "services" && (
              <>
                <Box
                  ref={chatRef}
                  borderWidth={1}
                  borderRadius="md"
                  p={3}
                  mb={3}
                  overflowY="auto"
                  height="60vh"
                >
                  <VStack align="start" spacing={4}>
                    {messages.map((message, index) => (
                      <Box key={index} maxW="md" p={5} rounded="md" bg={message.sender === 'user' ? 'blue.500' : 'gray.200'} alignSelf={message.sender === 'user' ? 'flex-end' : 'flex-start'}>
                        <Text color={message.sender === 'user' ? 'white' : 'black'}>
                          {typeof message.text === 'object' ? message.text.response.join(', ') : message.text}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
                <form onSubmit={handleFormSubmit}>
                  <HStack spacing={3}>
                    <Input value={inputMessage} onChange={e => setInputMessage(e.target.value)} placeholder="Type your message..." />
                    <Button colorScheme="blue" type="submit">Send</Button>
                  </HStack>
                </form>
              </>
            )}
  
            {step === "ticket" && (
              <form onSubmit={handleTicketSubmit}>
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input placeholder="Enter your name..." value={name} onChange={e => setName(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Question</FormLabel>
                  <Input placeholder="Enter your question..." value={question} onChange={e => setQuestion(e.target.value)}/>
                </FormControl>
                <FormControl>
                  <FormLabel>Details</FormLabel>
                  <Input placeholder="Enter details about your question..." value={details} onChange={e => setDetails(e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input placeholder="Enter your email..." value={email} onChange={e => setEmail(e.target.value)} />
                </FormControl>
                <Button type="submit">Submit</Button>
              </form>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
  };

export default App;
