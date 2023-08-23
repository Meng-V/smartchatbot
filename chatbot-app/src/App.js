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
  FormLabel,
} from "@chakra-ui/react";
import { ChatIcon } from "@chakra-ui/icons";
import "./App.css";
import MessageComponents from "./components/ParseLinks";

const App = () => {
  const chatRef = useRef();
  const [messages, setMessages] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [inputMessage, setInputMessage] = useState("");
  const [step, setStep] = useState("initial");
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [welcomeMessageShown, setWelcomeMessageShown] = useState(false);
  const socketRef = useRef();

  useEffect(() => {
    const storedMessages =
      JSON.parse(sessionStorage.getItem("chat_messages")) || [];
    setMessages(storedMessages);
  
    const url = `http://localhost:3602`;
    const socketIo = io(url, { transports: ["websocket"], upgrade: false });
  
    socketIo.on("connect", () => {
      setIsConnected(true);
      if (!welcomeMessageShown) {
        const welcomeMessage = {
          text: "Hi this is the Library Smart Chatbot. How may I help you?",
          sender: "chatbot",
        };
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages, welcomeMessage];
          sessionStorage.setItem("chat_messages", JSON.stringify(updatedMessages));
          return updatedMessages;
        });
        setWelcomeMessageShown(true); // Update the state to ensure the welcome message is shown only once
      }
      setIsTyping(false);
    });
    socketIo.on("message", function (message) {
      setIsTyping(false);
      addMessage(message, "chatbot");
    });

    socketIo.on("disconnect", function () {
      setIsConnected(false);
    });

    socketRef.current = socketIo;

    return () => {
      socketIo.off("message");
      socketIo.off("disconnect");
    };
  }, [welcomeMessageShown, setMessages]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (message, sender) => {
    console.log("Received message:", message); // To understand the structure of the received message
    console.log("Current messages:", messages); // To analyze the current messages array
    const messageText = typeof message === "object" && message.response ? message.response.join("\n") : message;
    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, { text: messageText, sender }];
      sessionStorage.setItem("chat_messages", JSON.stringify(updatedMessages));
      return updatedMessages;
    });
  };
  
  

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (inputMessage && socketRef.current) {
      addMessage(inputMessage, "user");
      setInputMessage("");
      setIsTyping(true);
      socketRef.current.emit("message", inputMessage, (response) => {
        console.log(response);
      });
    }
  };

  const handleClose = () => {
    setStep("initial");
    setWelcomeMessageShown(false);
    onClose();
  };

  const handleServicesClick = () => {
    setStep("services");
  };

  const handleLibrarianClick = () => {
    window.open(
      "https://www.lib.miamioh.edu/research/research-support/ask/",
      "_blank",
    );
  };

  const handleTicketClick = () => {
    setStep("ticket");
  };

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
        },
      );
    }
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
          <ModalBody py={5}>
            {step === "initial" && (
              <VStack>
                <Button onClick={handleServicesClick}>Library Chatbot</Button>
                <Button onClick={handleLibrarianClick}>
                  Talk to a human librarian
                </Button>
                <Button onClick={handleTicketClick}>
                  Create a ticket for offline help
                </Button>
              </VStack>
            )}

            {step === "services" && (
              <>
                <Box ref={chatRef} className="chat">
                  <VStack align="start" spacing={4}>
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
                                  message={adjustedMessage}
                                />
                              </div>
                            ) : (
                              <MessageComponents message={adjustedMessage} />
                            )}
                          </Box>
                        </Box>
                      );
                    })}

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
