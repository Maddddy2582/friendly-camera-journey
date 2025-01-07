import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from "sonner";

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnecting: boolean;
  connectWebSocket: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWebSocket = () => {
    if (socket?.readyState === WebSocket.OPEN) return;
    
    const ws = new WebSocket("ws://localhost:8080");
    setIsConnecting(true);
    
    ws.onopen = () => {
      console.log("WebSocket Connected");
      setIsConnecting(false);
    };

    ws.onclose = () => {
      console.log("WebSocket Disconnected");
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast.error("Connection error. Please try again.");
      setIsConnecting(false);
    };

    setSocket(ws);
    return ws;
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnecting, connectWebSocket }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};