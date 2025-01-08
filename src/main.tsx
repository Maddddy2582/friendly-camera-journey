import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { WebSocketProvider } from "./contexts/WebSocketContext.tsx";

createRoot(document.getElementById("root")!).render(<App />);
