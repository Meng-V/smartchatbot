import { FormControl, FormLabel, Input, Button } from "@chakra-ui/react";
import { useState } from "react";

const OfflineTicketWidget = () => {

  const [question, setQuestion] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');

  return (
    <form>
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
      <Button type="submit" mt={2}>
        Submit
      </Button>
    </form>
  )
}

export default OfflineTicketWidget;