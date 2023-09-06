import { Box, Button, FormControl, FormLabel, Input } from "@chakra-ui/react";
import { useEffect, useState } from "react";

const UserInfoForm = ({ onFormSubmit }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
  
    const handleSubmit = (e) => {
      e.preventDefault();
      onFormSubmit(name, email);
    };
  
    return (
      <form onSubmit={handleSubmit}>
      <FormControl>
        <FormLabel>Name</FormLabel>
        <Input
          placeholder="Enter your name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
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
    );
  };

const RealLibrarianWidget = () => {
    const [showForm, setShowForm] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [formURL, setFormURL] = useState('');

    const handleFormSubmit = (name, email) => {
        setName(name);
        setEmail(email);
        setShowForm(false);
    }

    useEffect(()=> {
        const baseURL = "https://libanswers.lib.miamioh.edu/chat/widget/a24a929728c7ee2cfdef2df20cbbc2ee";
        if (email !== '' && name !== '') {
            setFormURL(`${baseURL}?patron_name=${encodeURIComponent(name)}&patron_email=${encodeURIComponent(email)}`);
        }   else if (email !== '') {
            setFormURL(`${baseURL}?patron_email=${encodeURIComponent(email)}`);
        }   else if (name !== '') {
            setFormURL(`${baseURL}?patron_name=${encodeURIComponent(name)}`);
        }   else {
            setFormURL(baseURL);
        }
    }, [showForm])

    return (
        <div>
            {
                showForm ? (
                    <UserInfoForm onFormSubmit={handleFormSubmit} />
                ) : (
                <Box height="60vh" overflowY="auto">
                    <iframe src={formURL} title="Chat Widget" onScroll={false} height="100%"/>
                </Box>
                )
            }
        </div>
        
    )
}

export default RealLibrarianWidget;