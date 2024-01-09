import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";  // Socket client to communicate with the backend
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
  FormLabel,
} from "@chakra-ui/react";  // Chakra UI components
import { ArrowBackIcon, ChatIcon } from "@chakra-ui/icons";
import MessageComponents from "./components/ParseLinks";  // Component to parse links in the chat messages
import RealLibrarianWidget from "./components/RealLibrarianWidget"; // Component to display the real librarian widget
import { useToast } from "@chakra-ui/react"; // Component to display the toast message
// Styles
import "./App.css";

/**
 * Main App component
 */
const App = () => {
  // To scroll to the bottom of the chat window
  const chatRef = useRef();
  // To store the messages on both user and chatbot sides
  const [messages, setMessages] = useState([]);
  // To control the modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  // To store the input message
  const [inputMessage, setInputMessage] = useState("");
  // To store the current step
  const [step, setStep] = useState("initial");
  // To store the ticket details
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  // To track the connection status
  const [isConnected, setIsConnected] = useState(false);
  // To track if the chatbot is typing
  const [isTyping, setIsTyping] = useState(false);
  // To track if the welcome message has been shown
  const [welcomeMessageShown, setWelcomeMessageShown] = useState(false);
  // To store the socket reference
  const socketRef = useRef();
  // To display the toast
  const toast = useToast();
  // To track if the connection has been attempted
  const [attemptedConnection, setAttemptedConnection] = useState(false);


  /**
   * Hook to connect to the socket and listen for messages
   */
  useEffect(() => {
    // Will return empty array if there are no messages in the session storage
    const storedMessages =
      JSON.parse(sessionStorage.getItem("chat_messages")) || [];
    setMessages(storedMessages);
  
    // Set up URL from environment variables
    const url = `${process.env.REACT_APP_BACKEND_URL}:${process.env.REACT_APP_BACKEND_PORT}`;
    // Connect to the socket server with option to use websocket and disable upgrade
    const socketIo = io(url, { transports: ["websocket"], upgrade: false });
  
    socketIo.on("connect", () => {
      setIsConnected(true); // Update the state to indicate that the connection is established
      setAttemptedConnection(true); // Update the state to indicate that the connection has been attempted
      if (!welcomeMessageShown) {
        // Send the welcome message only once per session
        const welcomeMessage = {
          text: "Hi this is the Library Smart Chatbot. How may I help you?",
          sender: "chatbot",
        };
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages, welcomeMessage];
          // Store the messages in the session storage
          sessionStorage.setItem("chat_messages", JSON.stringify(updatedMessages));
          return updatedMessages;
        });
        setWelcomeMessageShown(true); // Update the state to ensure the welcome message is shown only once
      }
      setIsTyping(false);
    });

    // Listen from the server
    socketIo.on("message", function (message) {
      setIsTyping(false);
      addMessage(message, "chatbot");
    });

    socketIo.on("disconnect", function () {
      setIsConnected(false);
      setAttemptedConnection(true);
    });

    socketIo.on("connect_error", (error) => {
      console.error("Connection Error:", error);
      setIsConnected(false);
      setAttemptedConnection(true);
    });
    
    socketIo.on("connect_timeout", (timeout) => {
      console.error("Connection Timeout:", timeout);
      setIsConnected(false);
      setAttemptedConnection(true);
    });

    // Refer the current socket client to WebSocket connection
    socketRef.current = socketIo;

    return () => {
      socketIo.off("message");
      socketIo.off("disconnect");
      socketIo.off("connect_error");
      socketIo.off("connect_timeout");
    };
  }, [welcomeMessageShown, setMessages]);


  /**
   * Hook to scroll to the bottom of the chat window
   */
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);


  /**
   * Function to add the message to the messages array
   * @param {*} message 
   * @param {*} sender 
   */
  const addMessage = (message, sender) => {
    console.log("Received message:", message); // To understand the structure of the received message
    console.log("Current messages:", messages); // To analyze the current messages array
    const messageText = typeof message === "object" && message.response ? message.response.join("\n") : message;
    // Add the new message
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, { text: messageText, sender }];
      sessionStorage.setItem("chat_messages", JSON.stringify(updatedMessages));
      return updatedMessages;
    });
  };


  /**
   * Hook to display the toast message when the connection is not established
   */
  useEffect(() => {
    // Only show the toast if the connection has been attempted and the connection is not established
    if (!isConnected && attemptedConnection) {
      // Display the toast
      toast({
        title: "Connection Error",
        description: "The Smart Chatbot is currently not available. Please talk to a human librarian or create a ticket for further help.",
        status: "error",
        duration: 9000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  }, [isConnected, attemptedConnection, toast]);


  /**
   * Function to handle the user message submission
   * @param {*} e event
   */
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (inputMessage && socketRef.current) {
      addMessage(inputMessage, "user");
      setInputMessage("");  // Clear the input message
      setIsTyping(true);  // Chatbot is typing
      // Send the message to the server
      socketRef.current.emit("message", inputMessage, (response) => {
        console.log(response);
      });
    }
  };


  /**
   * Function to handle the modal close
   */
  const handleClose = () => {
    setStep("initial");
    setWelcomeMessageShown(false);
    onClose();
  };

  const handleServicesClick = () => {
    setStep("services");
    // do any additional setup for this step
  };

  const handleLibrarianClick = () => {
    window.open(
      " https://www.lib.miamioh.edu/research/research-support/ask/",
      "_blank",
    );
  };

  const handleTicketClick = () => {
    setStep("ticket");
    // do any additional setup for this step
  };

  /**
   * Function to handle the ticket submission
   * @param {*} e 
   */
  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (socketRef.current) {
      socketRef.current.emit(
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
          setStep("initial");
        }
      );
    }
  };

  /****************************************************************************************/
  /****************************************************************************************/
  /**************************** RETURN INTERFACE FROM HERE ********************************/
  /****************************************************************************************/
  /****************************************************************************************/
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
        <ModalOverlay />  {/* Overlay to dim the background */}
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
            justifyContent={"space-evenly"}
            ps={0}
          >
            <img
              src="https://libapps.s3.amazonaws.com/accounts/190074/images/0721_STier1_Libraries_HS_186KW_K_Digital.png"
              heigh={50}
              width={120}
              alt="library logo"
            />
            Smart Chatbot
          </ModalHeader>
          <ModalCloseButton />

          {/* Modal body starts here */}
          {step !== "initial" && (
            <Button
              leftIcon={<ArrowBackIcon />}
              colorScheme="red"
              variant="outline"
              width="20%"
              size="xs"
              ml={"7%"}
              onClick={() => setStep("initial")}
            >
              Back
            </Button>
          )}

          {/* 3 options */}
          <ModalBody py={5}>
            {step === "initial" && (
              <VStack>
                <Button onClick={() => setStep("services")}>
                  Library Chatbot
                </Button>
                <Button onClick={() => setStep("realLibrarian")}>
                  Talk to a human librarian
                </Button>
                <Button onClick={() => setStep("ticket")}>
                  Create a ticket for offline help
                </Button>
              </VStack>
            )}

            {/* Option #1: Chatbot */}
            {step === "services" && (
              <>
                {/* Chat window */}
                <Box ref={chatRef} className="chat">
                  <VStack align="start" spacing={4}>
                    {/* Display the connecting message and grey out the chat window
                        if the connection is not established
                      */}
                    {!isConnected && (
                      <Box
                        maxW="350px"
                        px={5}
                        py={3}
                        rounded="md"
                        bg={"gray.200"}
                        alignSelf={"flex-start"}
                      >
                        <Text color={"black"}>Connecting to the chatbot</Text>
                      </Box>
                    )}  
                    {/* Display the messages */}
                    {messages.map((message, index) => {
                      // console.log("Message Sender:", message.sender); // Log the sender
                      // console.log("Message Text:", message.text); // Log the text
                      const adjustedMessage = typeof message.text === "object" ? message.text.response.join("") : message.text;
                      return (
                        <Box
                          key={index}
                          maxW="md"
                          px={5}
                          py={3}
                          rounded="md"
                          bg={message.sender === "user" ? "white" : "gray.200"}
                          border={message.sender === "user" ? "1px" : "0px"}
                          borderColor={
                            message.sender === "user" ? "red.400" : " "
                          }
                          alignSelf={
                            message.sender === "user"
                              ? "flex-end"
                              : "flex-start"
                          }
                        >
                          <Box
                            color={
                              message.sender === "user" ? "red.600" : "black"
                            }
                            whiteSpace="pre-line"
                          >
                            {typeof message.text === "object" ? (
                              <div className="half-line-height">
                                <MessageComponents
                                  msg={adjustedMessage}
                                />
                              </div>
                            ) : (
                              <MessageComponents msg={adjustedMessage} />
                            )}
                          </Box>
                        </Box>
                      );
                    })}

                    {/* Display the chatbot is typing message */}
                    {isTyping && (
                      <Box
                        maxW="350px"
                        px={5}
                        py={3}
                        rounded="md"
                        bg={"gray.200"}
                        alignSelf={"flex-start"}
                      >
                        <Text>
                          Chatbot is thinking <span className="dots"></span>
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </Box>
                <form onSubmit={handleFormSubmit}>
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
            )}

            {/* Option #2: Real Librarian */}
            {step === "realLibrarian" && <RealLibrarianWidget />}

            {/* Option #3: Ticket */}
            {step === "ticket" && (
              <form onSubmit={handleTicketSubmit}>
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input
                    placeholder="Enter your name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Question</FormLabel>
                  <Input
                    placeholder="Enter your question..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Details</FormLabel>
                  <Input
                    placeholder="Enter details about your question..."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    placeholder="Enter your email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
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
