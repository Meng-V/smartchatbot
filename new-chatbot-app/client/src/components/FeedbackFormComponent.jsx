import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Radio,
  HStack,
  Box,
  FormControl,
  FormLabel,
  Textarea,
  Text,
} from '@chakra-ui/react';
import { FaStar } from 'react-icons/fa';
import { useContext, useState } from 'react';
import { SocketContext } from '../context/SocketContextProvider';
import { MessageContext } from '../context/MessageContextProvider';

const FeedbackFormComponent = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [hover, setHover] = useState(null);
  const [rating, setRating] = useState(0);
  const [details, setDetails] = useState(undefined);
  const { socketContextValues } = useContext(SocketContext);
  const { messageContextValues } = useContext(MessageContext);

  const handleFormOpen = () => {
    onOpen();
    setHover(null);
  };

  const handleRating = (curRating) => {
    setRating(curRating);
  };

  const handleFormSubmit = () => {
    socketContextValues.sendUserFeedback({
      userRating: rating,
      userComment: details,
    });
    setRating(0);
    setDetails(undefined);
    setHover(null);
    onClose();
  };

  return (
    <>
      <Button
        isDisabled={messageContextValues.message.length < 3}
        onClick={handleFormOpen}
        size='xs'
        mr={'7%'}
      >
        Rate this conversation
      </Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader display='flex' alignItems='center' ps={2}>
            <img
              src='https://libapps.s3.amazonaws.com/accounts/190074/images/0721_STier1_Libraries_HS_186KW_K_Digital.png'
              height={50}
              width={120}
              alt='library logo'
            />
            <Box ml={3}>Smart Chatbot</Box>
          </ModalHeader>
          <ModalBody>
            <form>
              <FormControl>
                <FormLabel>Rate this conversation</FormLabel>
                <HStack spacing={'2px'}>
                  {[...Array(5)].map((star, index) => {
                    const ratingValue = index + 1;
                    return (
                      <Box
                        as='label'
                        key={index}
                        color={
                          ratingValue <= (hover || rating)
                            ? '#ffc107'
                            : '#e4e5e9'
                        }
                        onMouseEnter={() => setHover(ratingValue)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <Radio
                          name='rating'
                          onChange={() => handleRating(ratingValue)}
                          value={ratingValue}
                          display='none'
                        />
                        <FaStar
                          cursor={'pointer'}
                          size={20}
                          transition='color 200ms'
                        />
                      </Box>
                    );
                  })}
                </HStack>
              </FormControl>
              <FormControl mt={4} mb={3}>
                <FormLabel>Details</FormLabel>
                <Textarea
                  placeholder='Enter details about your rating...'
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </FormControl>
              <Text color='red' fontSize={14} as='i'>
                * Submitting this form will restart your session!
              </Text>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              Close
            </Button>
            <Button colorScheme='red' onClick={handleFormSubmit}>
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default FeedbackFormComponent;
