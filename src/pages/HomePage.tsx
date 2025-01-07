import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useWebSocket } from "@/contexts/WebSocketContext";

const HomePage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const { socket, isConnecting, connectWebSocket } = useWebSocket();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!gender) {
      toast.error("Please select your gender");
      return;
    }

    if (isConnecting) {
      toast.error("Please wait, connecting to server...");
      return;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      return;
    }

    const data = { name, gender };
    socket.send(JSON.stringify(data));
    navigate("/camera", { state: { name, gender } });
  };

  useEffect(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      const data = { name, gender };
      socket.send(JSON.stringify(data));
      navigate("/camera", { state: { name, gender } });
    }
  }, [socket, name, gender, navigate]);

  return (
    <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-900">Welcome!</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <RadioGroup value={gender} onValueChange={setGender}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male">Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female">Female</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">Other</Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Continue to Camera"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default HomePage;