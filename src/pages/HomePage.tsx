import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const HomePage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Initialize WebSocket connection
  const connectWebSocket = () => {
    const ws = new WebSocket("ws://localhost:8080"); // Replace with your WebSocket server URL
    
    ws.onopen = () => {
      console.log("WebSocket Connected");
    };

    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.success) {
        toast.success("Form submitted successfully!");
        navigate("/camera", { state: { name, gender } });
      } else {
        toast.error(response.message || "Failed to submit form");
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast.error("Connection error. Please try again.");
    };

    setSocket(ws);
    return ws;
  };

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

    let ws = socket;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      ws = connectWebSocket();
    }

    // Send data through WebSocket
    const data = {
      name,
      gender,
    };

    try {
      ws.send(JSON.stringify(data));
    } catch (error) {
      console.error("Error sending data:", error);
      toast.error("Failed to send data. Please try again.");
    }
  };

  // Cleanup WebSocket connection on component unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

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

          <Button type="submit" className="w-full">
            Continue to Camera
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default HomePage;