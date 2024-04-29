import { FormControl, FormLabel, Input, Button } from '@chakra-ui/react';
import { useState, useContext } from 'react';
import { SocketContext } from '../context/SocketContextProvider';

const OfflineTicketWidget = () => {
  const [question, setQuestion] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');

  const { socketContextValues } = useContext(SocketContext);

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('question', question);
    formData.append('email', email);
    formData.append('name', name);
    formData.append('details', details);
    formData.append('ua', navigator.userAgent);
    socketContextValues.offlineTicketSubmit(formData);
  };

  return (
    <form onSubmit={handleTicketSubmit}>
      <FormControl>
        <FormLabel>Name</FormLabel>
        <Input
          placeholder='Enter your name...'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormControl>
      <FormControl>
        <FormLabel>Question</FormLabel>
        <Input
          placeholder='Enter your question...'
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </FormControl>
      <FormControl>
        <FormLabel>Details</FormLabel>
        <Input
          placeholder='Enter details about your question...'
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </FormControl>
      <FormControl>
        <FormLabel>Email</FormLabel>
        <Input
          placeholder='Enter your email...'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormControl>
      <Button type='submit' mt={2}>
        Submit
      </Button>
    </form>
  );
};

export default OfflineTicketWidget;
