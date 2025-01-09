import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import styles from "./CameraPage.module.scss";
import { interpolateInferno } from "d3-scale-chromatic";
import { useMicVAD } from "@ricky0123/vad-react";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    vad: {
      MicVAD: {
        new (config: {
          positiveSpeechThreshold: number;
          minSpeechFrames: number;
          preSpeechPadFrames: number;
          negativeSpeechThreshold: number;
          onFrameProcessed: (probs: { isSpeech: number }) => void;
          onSpeechStart: () => void;
          onSpeechEnd: (audio: Float32Array) => void;
        }): VadInstance;
      };
      utils: {
        encodeWAV(audio: Float32Array): ArrayBuffer;
      };
    };
  }
}
export type VadInstance = {
  listening: boolean;
  start: () => void;
  pause: () => void;
};

const CameraPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [serverResponse, setServerResponse] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState("LOADING");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showLiveVideo, setShowLiveVideo] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { name } = location.state || {};
  const { socket, isConnecting } = useWebSocket();
  const [vadInstance, setVadInstance] = useState<VadInstance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueue = [];
  let temp = "";
  let imageUrl = "";

  const stopCurrentAudio = () => {
    console.log("stopped");
    if (currentSourceNodeRef.current) {
      try {
        console.log("stopped try");
        currentSourceNodeRef.current.stop();
        currentSourceNodeRef.current.disconnect();
        currentSourceNodeRef.current = null;
        audioQueueRef.current = [];
      } catch (error) {
        console.error("Error stopping current audio:", error);
      }
    }
    isPlayingRef.current = false;
    audioQueueRef.current = [];
  };

  const playAudioStream = () => {
    if (
      !audioContextRef.current ||
      isPlayingRef.current ||
      audioQueueRef.current.length === 0
    )
      return;
    isPlayingRef.current = true;
    const audioBuffer = audioQueueRef.current.shift();
    if (!audioBuffer) return;
    const sourceNode = audioContextRef.current.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContextRef.current.destination);
    currentSourceNodeRef.current = sourceNode;
    sourceNode.onended = () => {
      isPlayingRef.current = false;
      currentSourceNodeRef.current = null;
      playAudioStream();
    };
    sourceNode.start();
  };

  const resetAudioPlayer = () => {
    stopCurrentAudio();
    setTranscript("");
    console.log("Audio player reset on speech start");
  };


  const vad = useMicVAD({
    onFrameProcessed: (probs) => {
      const indicatorColor = interpolateInferno(probs.isSpeech / 2);
      document.body.style.setProperty("--indicator-color", indicatorColor);
    },
    onSpeechStart: () => {
      console.log("Speech start detected");
      // resetAudioPlayer();
    },
    onSpeechEnd: async (audio) => {
      console.log("Speech end detected");
      const wavBuffer = window.vad.utils.encodeWAV(audio);
    },
  });

  useEffect(() => {
    const loadVadScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            window.webkitAudioContext)();
        }
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.13/dist/bundle.min.js";
        script.onload = () => {
          resolve();
          console.log("Successfully loaded VAD script");
        };
        script.onerror = () => {
          reject("Failed to load VAD script");
          console.log("Failed to load VAD script");
        };
        document.head.appendChild(script);
      });
    };
    const decodeAudioBuffer = async (
      arrayBuffer: ArrayBuffer
    ): Promise<AudioBuffer | null> => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            window.webkitAudioContext)();
        }
        return await audioContextRef.current.decodeAudioData(arrayBuffer);
      } catch (error) {
        console.error("Failed to decode audio data:", error);
        return null;
      }
    };
    const handleWebSocketMessage = async (event: MessageEvent) => {
      if (typeof event.data === "string") {
        try {
        
          const response = JSON.parse(event.data);
          setServerResponse(response.content.description);
          console.log(response);
          if (response.content.status === "Palm detected") {
            stopCurrentAudio();
            console.log("Palm image", capturedImage);
            console.log(temp);
            console.log("NAVIAGTED");
            console.log(imageUrl);
            console.log(response);
            navigate("/chat", {
              state: { imageResponse: response.content.image },
            });
          } else if (response.content.status === "No Palm detected") {
            setShowLiveVideo(true);
            toast.error("Palm not detected. Please try again.");
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      } else if (event.data instanceof Blob) {
        const arrayBuffer = await event.data.arrayBuffer();
        const audioBuffer = await decodeAudioBuffer(arrayBuffer);
        if (audioBuffer) {
          audioQueueRef.current.push(audioBuffer);
          playAudioStream();
        }
      }
    };
    const initialize = async () => {
      await loadVadScript();
      if (socket) {
        socket.onmessage = handleWebSocketMessage;
        socket.onopen = () => setStatus("CONNECTED");
        socket.onerror = () => setStatus("ERROR");
        socket.onclose = () => setStatus("DISCONNECTED");
      }
    };
    initialize();
    return () => {
      // stopCurrentAudio();
    };
  }, [socket]);

  const togglevad = () => {
    if (vadInstance) {
      if (!vadInstance.listening) {
        vadInstance.start();
        setIsListening(true);
        setStatus("running");
      } else {
        vadInstance.pause();
        setIsListening(false);
        setStatus("stopped");
      }
    }
  };

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

  const captureImage = () => {
    setShowLiveVideo(false);
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext("2d");

    if (context) {
      context.drawImage(videoRef.current, 0, 0);
      imageUrl = canvas.toDataURL("image/png");
      setCapturedImage(imageUrl);
      console.log(imageUrl);
      temp = imageUrl;
      toast.success("Image captured!");

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        toast.error("Connection lost. Please try again.");
        return;
      }

      const data = {
        type: "palm_image",
        content: {
          imageURL: imageUrl,
        },
      };
      console.log(socket);
      console.log(JSON.stringify(data));
      socket.send(JSON.stringify(data));
      // navigate("/chat");
    }
  };

  useEffect(() => {
    if (showLiveVideo && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [showLiveVideo, stream]);

  return (
    <div className="container mx-auto px-4 min-h-screen py-8 justify-center flex items-center bg-gradient-to-br from-purple-900 to-indigo-900" style={{width:"100%"}}>
      <Card className="w-full max-w-2xl mx-auto space-y-6 p-6">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Hi {name}, Let's Take Your Picture!
        </h1>

        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          {showLiveVideo ? (
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
          ) : (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            </div>
          )}
         
        </div>

        <Button
          onClick={captureImage}
          className="w-full flex items-center justify-center gap-2"
          disabled={isConnecting}
        >
          <Camera className="w-5 h-5" />
          {isConnecting ? "Uploading..." : "Capture Image"}
        </Button>

   
      </Card>
    </div>
  );
};

export default CameraPage;
