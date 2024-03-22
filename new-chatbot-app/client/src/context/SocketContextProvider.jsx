import { createContext, useState} from "react";
import { io } from "socket.io-client";
import { retrieveEnvironmentVariable } from "../services/RetrieveEnvironmentVariable";

const url = `${retrieveEnvironmentVariable('VITE_BACKEND_URL')}:${retrieveEnvironmentVariable(
  'VITE_BACKEND_PORT',
)}`;
const SocketContext = createContext();

const SocketContextProvider = (props) => {
  
  const socket = io(url, { transports: ['websocket'], upgrade: false });
  const [isConnected, setIsConnected] = useState(false);
  const [attemptedConnection, setAttemptedConnection] = useState(false);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      setIsConnected,
      attemptedConnection,
      setAttemptedConnection,
    }}>
      {props.children}
    </SocketContext.Provider>
  );
}

export { SocketContext, SocketContextProvider };