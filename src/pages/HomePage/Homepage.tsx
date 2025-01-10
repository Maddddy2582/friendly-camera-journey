import { ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";

// import { useNavigate } from "react-router-dom";
import { useWebSocket } from "@/contexts/WebSocketContext";
// import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
// import { Camera } from "lucide-react";
// import { useWebSocket } from "@/contexts/WebSocketContext";
import styles from "./CameraPage.module.scss";
import { interpolateInferno } from "d3-scale-chromatic";
import { useMicVAD } from "@ricky0123/vad-react";
import { Hand } from "lucide-react";

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

const HomePage = () => {
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
  // const navigate = useNavigate();
  const { name } = location.state || {};
  const { socket, isConnecting } = useWebSocket();
  const [vadInstance, setVadInstance] = useState<VadInstance | null>(null);
  // const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueue = [];
  const audioContextRef = useRef<AudioContext | null>(null);
  const navigate = useNavigate();
  // let temp = "";
  // let imageUrl = "";

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

  // const sendAudioToServer = async (wavBuffer: ArrayBuffer) => {
  //   try {
  //     const audioBase64 = btoa(
  //       new Uint8Array(wavBuffer).reduce(
  //         (data, byte) => data + String.fromCharCode(byte),
  //         ""
  //       )
  //     );
  //     const message = {
  //       type: "audio",
  //       content: audioBase64,
  //     };
  //     socket?.send(JSON.stringify(message));
  //     console.log("Audio sent to server");
  //   } catch (error) {
  //     console.error("Error sending audio to server:", error);
  //   }
  // };

  const vad = useMicVAD({
    onFrameProcessed: (probs) => {
      const indicatorColor = interpolateInferno(probs.isSpeech / 2);
    },
    onSpeechStart: () => {
      console.log("Speech start detected");
      resetAudioPlayer();
    },
    onSpeechEnd: async (audio) => {
      console.log("Speech end detected");
      const wavBuffer = window.vad.utils.encodeWAV(audio);
      // await sendAudioToServer(wavBuffer);
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
          // const message = JSON.parse(event.data);
          // if (message.type === "transcript") {
          //   setTranscript((prev) => prev + " " + message.content);
          // }
          console.log("STRIG");
          const response = JSON.parse(event.data);
          setServerResponse(response.content.description);
          console.log(response);
          if (response.content.status === "Palm detected") {
            stopCurrentAudio();
            console.log("Palm image", capturedImage);
            // console.log(temp);
            console.log("NAVIAGTED");
            // console.log(imageUrl);
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
        // stopCurrentAudio(); // Stop current audio before playing new one
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

  // if (!audioContextRef.current) {
  //   audioContextRef.current = new (window.AudioContext ||
  //     window.webkitAudioContext)();
  //   }
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-4 text-white">
      {/* Logo Section */}
      <div className="flex items-center justify-center mb-6">
        <div className="w-32 h-32 rounded-full bg-gradient-to-r from-orange-400 to-pink-400 p-1">
          <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
            <Hand className="w-16 h-16 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
          "Welcome to Clara Palmistry!"
        </h2>

        <p className="text-xl md:text-2xl mb-8 text-purple-200">
          Ready to Laugh and Discover Your Destiny?
        </p>
        <p className="text-xl md:text-2xl mb-8 text-purple-200">
          Press 'Start' and let Clara see what your palm says about you!
        </p>

        <button
          onClick={() => {
            navigate("/input");
            socket.send(JSON.stringify({ type: "started" }));
            console.log("data sent to BE");
          }}
          className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-purple-600 rounded-full overflow-hidden transition-all duration-300 ease-in-out hover:bg-purple-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-purple-900"
        >
          <span className="mr-2">Start</span>
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </button>

        <p className="mt-12 text-purple-300 text-sm">
          Powered by AI • Just for Fun • Not Financial Advice 😉
        </p>
      </div>
    </div>
  );
};

export default HomePage;
