import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import io from 'socket.io-client';
import App from './App';

// Mock the socket.io-client module.
jest.mock('socket.io-client');

describe('<App />', () => {
  let mockSocket;
  let socketSpy;

  beforeEach(() => {
    // Create a new mock socket object before each test case.
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      off: jest.fn(),
    };

    // Make socket.io-client return the mock socket object.
    socketSpy = jest.spyOn(io, 'default');
    socketSpy.mockImplementation(() => mockSocket);
  });

  afterEach(() => {
    // Cleanup after each test case.
    socketSpy.mockRestore();
  });

  test('renders without crashing', () => {
    render(<App />);
  });

  test('opens chat on clicking the chat icon', () => {
    render(<App />);

    // Find the chat icon and click it.
    const chatIconButton = screen.getByRole('button');
    fireEvent.click(chatIconButton);

    // Expect the chat modal to be in the document.
    const modalHeader = screen.getByText('Chat with Chatbot');
    expect(modalHeader).toBeInTheDocument();
  });

  test('sends message when send button is clicked', async () => {
    render(<App />);

    const chatIconButton = screen.getByRole('button');
    fireEvent.click(chatIconButton);

    const input = screen.getByPlaceholderText('Type your message...');
    const button = screen.getByText('Send');

    // Type into the chat input and click the send button.
    fireEvent.change(input, { target: { value: 'Hello chatbot!' } });
    fireEvent.click(button);

    // Wait for the chatbot to respond.
    await waitFor(() => expect(mockSocket.emit).toHaveBeenCalledTimes(1));
  });

  // Add more tests as necessary.
});
