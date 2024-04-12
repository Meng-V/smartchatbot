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
} from '@chakra-ui/react';
import { FaStar } from 'react-icons/fa';
import { useState } from 'react';

const FeedbackFormComponent = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [hover, setHover] = useState(null);
  const [rating, setRating] = useState(0);
  const [details, setDetails] = useState("");

  const handleFormOpen = () => {
    onOpen();
    setHover(null);
    setRating(0);
  }

  const handleRating = (curRating) => {
    setRating(curRating);
    console.log(curRating);
  }

  return (
    <>
      <Button
        onClick={handleFormOpen}
        size="xs"
        mr={'7%'}
      >
        Rate this conversation
      </Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader
            display="flex"
            alignItems="center"
            ps={2}
          >
            <img
              src="https://libapps.s3.amazonaws.com/accounts/190074/images/0721_STier1_Libraries_HS_186KW_K_Digital.png"
              height={50}
              width={120}
              alt="library logo"
            />
            <Box ml={3}>
              Smart Chatbot
            </Box>
          </ModalHeader>
          <ModalBody>
            <form>
              <FormControl>
                <FormLabel>
                  Rate this conversation
                </FormLabel>
                <HStack spacing={"2px"}>
                  {[...Array(5)].map((star, index) => {
                    const ratingValue = index + 1;
                    return (
                      <Box
                        as="label"
                        key={index}
                        color={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
                        onMouseEnter={() => setHover(ratingValue)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <Radio
                          name="rating"
                          onChange={() => handleRating(ratingValue)}
                          value={ratingValue}
                          display="none"
                        />
                        <FaStar
                          cursor={"pointer"}
                          size={20}
                          transition="color 200ms"
                        />
                      </Box>
                    );
                  })}
                </HStack>
              </FormControl>
              <FormControl mt={4}>
                <FormLabel>Details</FormLabel>
                <Textarea
                  placeholder="Enter details about your rating..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </FormControl>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button
              mr={3}
              onClick={onClose}
            >
              Close
            </Button>
            <Button colorScheme="red">
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default FeedbackFormComponent;