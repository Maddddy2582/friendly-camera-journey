import { createContext, useContext, useState, useEffect } from 'react';

// Create a WebSocket context
const WebSocketContext = createContext(null);

// Custom hook to access WebSocket context
export const useWebSocket = () => {
  return useContext(WebSocketContext);
};

// WebSocket provider component
export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [receivedMessage, setReceivedMessage] = useState('');
  let audioContext;
  // const audioQueue = [];
  // const isPlaying = false;

  useEffect(() => {
    // Create a WebSocket connection when the component mounts
    const ws = new WebSocket("ws://localhost:8000/ws"); // Replace with your WebSocket server URL

    setSocket(ws);

    // Listen for messages from the server
    ws.onmessage = (event) => {
      // console.log('Message from server:', event.data);
      setReceivedMessage(event.data); // Store the received message
    };

    // Handle WebSocket connection open
    ws.onopen = () => {
      console.log('WebSocket connection established');
      console.log(ws.readyState)
      initAudioContext(); 
    };

    // Handle WebSocket close
    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Handle WebSocket error
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Clean up WebSocket connection on component unmount
    return () => {
      ws.close();
    };
  }, []);

  // Function to send a message
  const sendMessage = (msg) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(msg);
      console.log('Message sent to server:', msg);
    } else {
      console.log('WebSocket connection is not open');
    }
  };

  function initAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
        console.log("Audio context initialized");
    }
  }

  return (
    <WebSocketContext.Provider value={{ socket, sendMessage, receivedMessage, audioContext }}>
      {children}
    </WebSocketContext.Provider>
  );
};