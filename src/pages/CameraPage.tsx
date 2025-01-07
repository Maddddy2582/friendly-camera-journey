import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import styles from "./CameraPage.module.scss";

const CameraPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [serverResponse, setServerResponse] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { name } = location.state || {};
  const { socket, isConnecting } = useWebSocket();

  useEffect(() => {
    if (!name) {
      navigate("/");
      return;
    }

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        toast.error("Unable to access camera");
        console.error("Error accessing camera:", error);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [name, navigate]);

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        const response = JSON.parse(event.data);
        setServerResponse(response.content.description);
        console.log(response);
        console.log("websocket response", serverResponse);
        if (response.success) {
          toast.success("Image uploaded successfully!");
        } else {
          toast.error(response.message || "Failed to upload image");
        }
      };
    }
  }, [socket]);

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext("2d");

    if (context) {
      context.drawImage(videoRef.current, 0, 0);
      const imageUrl = canvas.toDataURL("image/png");
      setCapturedImage(imageUrl);
      toast.success("Image captured!");

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        toast.error("Connection lost. Please try again.");
        return;
      }

      const data = { type: "image", content: imageUrl };
      console.log(socket);
      console.log(JSON.stringify(data));
      socket.send(JSON.stringify(data));
      navigate("/chat");
    }
  };

  return (
    // <div className={styles.scanner}>
    <div className="container mx-auto px-4 min-h-screen py-8">
      <Card className="w-full max-w-2xl mx-auto space-y-6 p-6">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Hi {name}, Let's Take Your Picture!
        </h1>

        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          <div className={styles.scanner}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover1 ${styles.scanner}`}
            />
          </div>
        </div>

        <Button
          onClick={captureImage}
          className="w-full flex items-center justify-center gap-2"
          disabled={isConnecting}
        >
          <Camera className="w-5 h-5" />
          {isConnecting ? "Uploading..." : "Capture Image"}
        </Button>

        {capturedImage && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Captured Image
            </h2>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            </div>
            <h1>{serverResponse}</h1>
          </div>
        )}
      </Card>
    </div>
    // </div>
  );
};

export default CameraPage;
