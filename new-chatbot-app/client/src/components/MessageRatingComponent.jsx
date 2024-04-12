import { Box, Button } from "@chakra-ui/react";
import { FiThumbsUp } from "react-icons/fi";
import { FiThumbsDown } from "react-icons/fi";

const MessageRatingComponent = (msg) => {

  const handleClick = () => {
    console.log(msg);
  }

  return (
    <Box marginTop="1">
      <Button
        _hover={{
          color: "white",
          bg: "#51a4f0"
        }}
        bg="gray.200"
        size="sm"
        marginRight="1"
        onClick={handleClick}
      >
        <FiThumbsUp/>
      </Button>
      <Button
        _hover={{
          color: "white",
          bg: "#ff6b7f"
        }}
        bg="gray.200"
        size="sm"
        onClick={handleClick}
      >
        <FiThumbsDown />
      </Button>
    </Box>
  );
}

export default MessageRatingComponent;