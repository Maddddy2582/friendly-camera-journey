import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera } from "lucide-react";

const CameraPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { name } = location.state || {};

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
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [name, navigate]);

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext("2d");
    if (context) {
      context.drawImage(videoRef.current, 0, 0);
      const imageUrl = canvas.toDataURL("image/png");
      
      // Here you could save the image or do something with it
      toast.success("Image captured!");
    }
  };

  return (
    <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-2xl p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Hi {name}, Let's Take Your Picture!
        </h1>
        
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        <Button 
          onClick={captureImage}
          className="w-full flex items-center justify-center gap-2"
        >
          <Camera className="w-5 h-5" />
          Capture Image
        </Button>
      </Card>
    </div>
  );
};

export default CameraPage;