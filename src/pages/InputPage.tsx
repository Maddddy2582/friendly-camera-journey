import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { interpolateInferno } from "d3-scale-chromatic";
import { useMicVAD } from "@ricky0123/vad-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useWebSocket } from "@/contexts/WebSocketContext";
import image from "../../public/bot-talking.gif";
import image1 from "../../public/bot_not_talking.png";

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

const InputPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const { socket, sendMessage, receivedMessage, isConnecting } = useWebSocket();
  const [status, setStatus] = useState("LOADING");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [vadInstance, setVadInstance] = useState<VadInstance | null>(null);
  const [audioQueue, setAudioQueue] = useState([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlaying = false;
  const audioContext = null;
  const [showGif, setShowGif] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGif(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

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

  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
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

    const handleWebSocketMessage = async (event: MessageEvent) => {
      if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "transcript") {
            setTranscript((prev) => prev + " " + message.content);
          } else if (message.type === "response_audio") {
            console.log("📥 Received audio response");
            const { reset_audio_buffer, wav_audio_base64 } = message.content;

            if (reset_audio_buffer) {
              console.log("🔄 Resetting audio buffer");
              resetAudioPlayer();
              stopCurrentAudio();
              console.log("RESETED AUDIO STREAM");
              return;
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
          console.error("Error parsing JSON:", error);
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
    return () => {};
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
    resetAudioPlayer();
  }, []);

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

    if (socket) {
      const data = {
        type: "user_details",
        role: "user",
        content: { name, gender },
      };
      socket.send(JSON.stringify(data));
      console.log("Dta sent:", data);

      stopCurrentAudio();
      navigate("/camera", { state: { name, gender } });
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-1/2 bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center relative">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1614850715649-1d0106293bd1?q=80&w=1470&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        ></div>
        <div className="relative w-64 h-64 flex items-center justify-center">
          <div
            className={`absolute transition-opacity duration-500 ${
              showGif ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={image}
              alt="Clara AI Avatar Animated"
              className="w-64 h-64 object-contain"
            />
          </div>
          <div
            className={`absolute transition-opacity duration-500 ${
              showGif ? "opacity-0" : "opacity-100"
            }`}
          >
            <img
              src={image1}
              alt="Clara AI Avatar Static"
              className="w-64 h-64 object-contain"
            />
          </div>
        </div>
        {/* Animated Transcript */}
        <div className="flex-1 relative">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-md">
            <p className="text-white text-lg leading-relaxed">
              {transcript}
              <span className="animate-pulse">|</span>
            </p>
          </div>
          {/* Chat Bubble Triangle */}
          <div
            className="absolute left-[-10px] top-4 w-0 h-0 
              border-t-[10px] border-t-transparent
              border-r-[10px] border-r-white/10
              border-b-[10px] border-b-transparent"
          ></div>
        </div>{" "}
      </div>

      <div className="w-1/2 bg-white flex items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=1632&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        ></div>

        <Card className="w-full max-w-md p-8 space-y-6 bg-white/90 backdrop-blur-sm shadow-xl m-4">
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Welcome to Clara!
          </h1>
          <p className="text-center text-gray-600">
            Let's discover what your palm reveals about you
          </p>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700">
                Your Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-purple-200 focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Gender</Label>
              <RadioGroup
                value={gender}
                onValueChange={setGender}
                className="gap-4"
              >
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

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Continue to Camera"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default InputPage;
