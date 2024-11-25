import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  useClipboard,
} from '@chakra-ui/react';
import { useContext, useEffect, useState } from 'react';
import { SocketContext } from '../context/SocketContextProvider';

/**
 * Functional component that renders a form to collect user info
 */
const UserInfoForm = ({ onFormSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { socketContextValues } = useContext(SocketContext);
  const { hasCopied, onCopy } = useClipboard(
    socketContextValues.conversationHistory,
  );

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onFormSubmit(name, email);
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormControl>
        <FormLabel>Name</FormLabel>
        <Input
          placeholder='Enter your name...'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormControl>
      <FormControl mt={2}>
        <FormLabel>Email</FormLabel>
        <Input
          placeholder='Enter your email...'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormControl>
      <FormControl mt={2}>
        <FormLabel>Chat History</FormLabel>
        <InputGroup>
          <Input
            value={socketContextValues.conversationHistory}
            isReadOnly={true}
          />
          <InputRightElement width='4.5rem'>
            <Button h='1.75rem' size='sm' onClick={onCopy}>
              {hasCopied ? 'Copied' : 'Copy'}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>
      <Button type='submit' mt={2}>
        Submit
      </Button>
    </form>
  );
};

/**
 * Functional component that renders the LibAnswers chat widget
 * @returns
 */
const RealLibrarianWidget = () => {
  // State to determine whether to show the form or the widget
  const [showForm, setShowForm] = useState(true);
  // User info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [formURL, setFormURL] = useState('');
  // Chat context values
  const { socketContextValues } = useContext(SocketContext);

  // Handle form submission
  const handleFormSubmit = (name, email) => {
    setName(name);
    setEmail(email);
    setShowForm(false); // Hide the form
  };

  useEffect(() => {
    const baseURL =
      'https://libanswers.lib.miamioh.edu/chat/widget/a24a929728c7ee2cfdef2df20cbbc2ee';
    // If the user has entered their name and email, add them to the URL
    // Before that, encode the name variable so that it can be safely included in a URL
    if (email !== '' && name !== '') {
      setFormURL(
        `${baseURL}?patron_name=${encodeURIComponent(name)}&patron_email=${encodeURIComponent(email)}&question=${encodeURIComponent(socketContextValues.conversationHistory)}`,
      );
    } else if (email !== '') {
      setFormURL(
        `${baseURL}?patron_email=${encodeURIComponent(email)}&question=${encodeURIComponent(socketContextValues.conversationHistory)}`,
      );
    } else if (name !== '') {
      setFormURL(
        `${baseURL}?patron_name=${encodeURIComponent(name)}&question=${encodeURIComponent(socketContextValues.conversationHistory)}`,
      );
    } else {
      setFormURL(
        `${baseURL}?question=${socketContextValues.conversationHistory}`,
      );
    }
  }, [showForm]);

  return (
    <div>
      {showForm ? (
        <UserInfoForm onFormSubmit={handleFormSubmit} />
      ) : (
        <Box height='60vh' overflowY='auto'>
          <iframe
            src={formURL}
            title='Chat Widget'
            onScroll={false}
            height='100%'
          />
        </Box>
      )}
    </div>
  );
};

export default RealLibrarianWidget;
