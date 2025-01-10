import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import HomePage from "./pages/HomePage/Homepage";
import CameraPage from "./pages/CameraPage";
import ChatPage from "./pages/ChatPage";
import InputPage from "./pages/InputPage";
import Thankyou from "./pages/ThankYou/ThankYou";
import FacePage from "./pages/FacePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WebSocketProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/input" element={<InputPage />} />
            <Route path="/camera" element={<CameraPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/thankyou" element={<Thankyou />} />
            <Route path="/face" element={<FacePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WebSocketProvider>
  </QueryClientProvider>
);

export default App;
