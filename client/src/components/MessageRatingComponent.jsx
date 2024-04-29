import { Box, Button, useToast } from '@chakra-ui/react';
import { FiThumbsUp } from 'react-icons/fi';
import { FiThumbsDown } from 'react-icons/fi';
import { SocketContext } from '../context/SocketContextProvider';
import { useContext, useRef, useState } from 'react';

const MessageRatingComponent = ({ message }) => {
  const toast = useToast();
  const [isDisabled, setIsDisabled] = useState(false);
  const isRated = useRef(false);
  const { socketContextValues } = useContext(SocketContext);

  const handleClick = (isPositiveRated) => {
    if (!isRated.current) {
      isRated.current = true;
      setIsDisabled(true);
      socketContextValues.sendMessageRating({
        messageId: message.messageId,
        isPositiveRated: isPositiveRated,
      });
      toast({
        title: 'Thank you for your feedback!',
        description: 'We will use this information to improve user experience.',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'bottom-left',
      });
    }
  };

  return (
    <Box marginTop='1'>
      <Button
        _hover={{
          color: 'white',
          bg: '#51a4f0',
        }}
        bg='gray.200'
        size='sm'
        marginRight='1'
        isDisabled={isDisabled}
        onClick={() => handleClick(true)}
      >
        <FiThumbsUp />
      </Button>
      <Button
        _hover={{
          color: 'white',
          bg: '#ff6b7f',
        }}
        bg='gray.200'
        size='sm'
        isDisabled={isDisabled}
        onClick={() => handleClick(false)}
      >
        <FiThumbsDown />
      </Button>
    </Box>
  );
};

export default MessageRatingComponent;
