// import { Socket } from "dgram";
// import React, { createContext, useContext, useEffect, useState } from "react";

// type WebSocketContextType = {
//   socket: WebSocket | null;
//   connectWebSocket: (url: string, onOpenCallback?: () => void) => void;
// };

// const WebSocketContext = createContext<WebSocketContextType | undefined>(
//   undefined
// );

// export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
//   children,
// }) => {
//   const [socket, setSocket] = useState<WebSocket | null>(null);

//   const connectWebSocket = (url: string, onOpenCallback?: () => void) => {
//     if (socket) return;

//     const ws = new WebSocket(url);

//     ws.onopen = () => {
//       console.log("WebSocket Connected");
//       console.log(onOpenCallback);
//       if (onOpenCallback) {
//         console.log("callback");
//         onOpenCallback();
//       } else {
//         console.log("No callback");
//       }
//     };

//     // ws.onclose = () => {
//     //   console.log("WebSocket Disconnected");
//     // //   setSocket(null);
//     // };

//     ws.onerror = (error) => {
//       console.error("WebSocket Error:", error);
//     };

//     setSocket(ws);
//     console.log(socket);
//   };

//   //   useEffect(() => {
//   //     return () => {
//   //       if (socket) {
//   //         socket.close();
//   //       }
//   //     };
//   //   }, [socket]);

//   return (
//     <WebSocketContext.Provider value={{ socket, connectWebSocket }}>
//       {children}
//     </WebSocketContext.Provider>
//   );
// };

// export const useWebSocket = () => {
//   const context = useContext(WebSocketContext);
//   if (!context) {
//     throw new Error("useWebSocket must be used within a WebSocketProvider");
//   }
//   return context;
// };
