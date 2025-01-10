import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import styles from "./CameraPage.module.scss";
import {  Sparkles, Hand } from "lucide-react";

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

  const resetAudioPlayer = () => {
    console.log("🔄 Resetting audio player");
    stopCurrentAudio();
    // setTranscript("");
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
    // const decodeAudioBuffer = async (
    //   arrayBuffer: ArrayBuffer
    // ): Promise<AudioBuffer | null> => {
    //   try {
    //     if (!audioContextRef.current) {
    //       audioContextRef.current = new (window.AudioContext ||
    //         window.webkitAudioContext)();
    //     }
    //     return await audioContextRef.current.decodeAudioData(arrayBuffer);
    //   } catch (error) {
    //     console.error("Failed to decode audio data:", error);
    //     return null;
    //   }
    // };

    const decodeAudioBuffer = async (
      arrayBuffer: ArrayBuffer
    ): Promise<AudioBuffer | null> => {
      try {
        console.log("🎵 Decoding audio buffer");
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            window.webkitAudioContext)();
        }
        return await audioContextRef.current.decodeAudioData(arrayBuffer);
      } catch (error) {
        console.error("❌ Failed to decode audio data:", error);
        return null;
      }
    };

    const base64ToArrayBuffer = (base64: string) => {
      const binaryString = window.atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    };

    // const handleWebSocketMessage = async (event: MessageEvent) => {
    //   if (typeof event.data === "string") {
    //     try {
        
    //       const response = JSON.parse(event.data);
    //       setServerResponse(response.content.description);
    //       console.log(response);
    //       if (response.content.status === "Palm detected") {
    //         stopCurrentAudio();
    //         console.log("Palm image", capturedImage);
    //         console.log(temp);
    //         console.log("NAVIAGTED");
    //         console.log(imageUrl);
    //         console.log(response);
    //         navigate("/chat", {
    //           state: { imageResponse: response.content.image, name:name },
    //         });
    //       } else if (response.content.status === "No Palm detected") {
    //         setShowLiveVideo(true);
    //         toast.error("Palm not detected. Please try again.");
    //       }
    //     } catch (error) {
    //       console.error("Error parsing JSON:", error);
    //     }
    //   } 
    // 
    // else if (event.data instanceof Blob) {
    //     const arrayBuffer = await event.data.arrayBuffer();
    //     const audioBuffer = await decodeAudioBuffer(arrayBuffer);
    //     if (audioBuffer) {
    //       audioQueueRef.current.push(audioBuffer);
    //       playAudioStream();
    //     }
    //   }
    // };

    const handleWebSocketMessage = async (event: MessageEvent) => {
      if (typeof event.data === "string") {
        try {
          // const message = JSON.parse(event.data);
          // if (message.type === "transcript") {
          //   console.log("📝 Received transcript:", message.content);
          // }
          const message = JSON.parse(event.data);
          setServerResponse(message.content.description);
          console.log(message);
          if (message.content.status === "Palm detected") {
            stopCurrentAudio();
            console.log("Palm image", capturedImage);
            console.log(temp);
            console.log("NAVIAGTED");
            console.log(imageUrl);
            console.log(message);
            navigate("/chat", {
              state: { imageResponse: message.content.image, name:name },
            });
          } else if (message.content.status === "No Palm detected") {
            setShowLiveVideo(true);
            toast.error("Palm not detected. Please try again.");
          }
            else if (message.type === "response_audio") {
            console.log("📥 Received audio response");
            const { reset_audio_buffer, wav_audio_base64 } = message.content;
  
            if (reset_audio_buffer) {
              console.log("🔄 Resetting audio buffer");
              resetAudioPlayer();
              stopCurrentAudio();
              console.log("RESETED AUDIO STREAM")
              return
            }
  
            if (wav_audio_base64) {
              console.log("🎵 Processing audio data");
              const arrayBuffer = base64ToArrayBuffer(wav_audio_base64);
              const audioBuffer = await decodeAudioBuffer(arrayBuffer);
              
              if (audioBuffer) {
                console.log("🔊 Adding decoded audio to playback queue");
                audioQueueRef.current.push(audioBuffer);
                playAudioStream();
              }
            }
          }
        } catch (error) {
          console.error("❌ Error processing WebSocket message:", error);
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
    }
  };

  useEffect(() => {
    if (showLiveVideo && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [showLiveVideo, stream]);

    useEffect(() => {
      resetAudioPlayer();
    }, []);

  return (
    <div className={`min-h-screen py-12 px-4 ${styles.mysticGlow}`}>
      <Card className="w-full max-w-2xl mx-auto bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-2 space-y-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Hand className="w-8 h-8 text-purple-400" />
            <h1 className="mystical-text text-3xl font-semibold text-center bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              AI Palm Reading Portal
            </h1>
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          
          <p className="text-center text-gray-300 max-w-md mx-auto">
            Greetings {name}, let the ancient wisdom meet modern technology. 
            Position your palm facing up the camera for your digital reading.
          </p>

        <div className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-black/40 ${styles.palmFrame}`} style={{height: "400px", width:"100%"}}>
                  {showLiveVideo ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black" style={{height: "100%"}}>
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
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black" style={{height: "100%"}}>
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
        </div>
      </Card>
    </div>
  );
};

export default CameraPage;
