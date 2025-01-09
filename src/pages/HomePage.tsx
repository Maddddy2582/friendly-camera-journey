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

// declare global {
//   interface Window {
//     webkitAudioContext?: typeof AudioContext;
//   }
// }

// declare global {
//   interface Window {
//     vad: {
//       MicVAD: {
//         new (config: {
//           positiveSpeechThreshold: number;
//           minSpeechFrames: number;
//           preSpeechPadFrames: number;
//           negativeSpeechThreshold: number;
//           onFrameProcessed: (probs: { isSpeech: number }) => void;
//           onSpeechStart: () => void;
//           onSpeechEnd: (audio: Float32Array) => void;
//         }): VadInstance;
//       };
//       utils: {
//         encodeWAV(audio: Float32Array): ArrayBuffer;
//       };
//     };
//   }
// }
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

  // const playAudioStream = () => {
  //   if (isPlaying || audioQueue.length === 0) return;

  //   isPlaying = true;
  //   const audioBuffer = audioQueue.shift();

  //   const sourceNode = audioContext.createBufferSource();
  //   sourceNode.buffer = audioBuffer;
  //   sourceNode.connect(audioContext.destination);

  //   sourceNode.onended = () => {
  //     isPlaying = false;
  //     playAudioStream();
  //   };

  //   sourceNode.start();
  // };

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

  // const resetAudioPlayer = () => {
  //   console.log(audioQueue);
  //   // audioQueue = [];
  //   setAudioQueue([]);
  //   console.log(audioQueue);
  //   isPlaying = false;
  //   playAudioStream();
  // };

  const resetAudioPlayer = () => {
    stopCurrentAudio();
    setTranscript("");
    console.log("Audio player reset on speech start");
  };

  // const sendAudioToServer = async (wavBuffer) => {
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
  //     console.log(socket);
  //     console.log(message);
  //     socket.send(JSON.stringify(message));
  //     console.log("Audio sent to server");
  //   } catch (error) {
  //     console.error("Error sending audio to server:", error);
  //   }
  // };
  const sendAudioToServer = async (wavBuffer: ArrayBuffer) => {
    try {
      const audioBase64 = btoa(
        new Uint8Array(wavBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
      const message = {
        type: "audio",
        content: audioBase64,
      };
      socket?.send(JSON.stringify(message));
      console.log("Audio sent to server");
    } catch (error) {
      console.error("Error sending audio to server:", error);
    }
  };
  // Use the VAD hook

  // const vad = useMicVAD({
  //   onFrameProcessed: (probs) => {
  //     const indicatorColor = interpolateInferno(probs.isSpeech / 2);
  //     document.body.style.setProperty("--indicator-color", indicatorColor);
  //   },
  //   onSpeechStart: () => {
  //     console.log(audioQueue);
  //     console.log("Speech start detected");
  //     resetAudioPlayer();
  //     setTranscript("");
  //   },
  //   onSpeechEnd: async (audio) => {
  //     console.log("Speech end detected");
  //     const wavBuffer = window.vad.utils.encodeWAV(audio);
  //     await sendAudioToServer(wavBuffer);
  //   },
  // });
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
      await sendAudioToServer(wavBuffer);
    },
  });
  // Using useEffect to initialize VAD and WebSocket
  // useEffect(() => {
  //   const loadVadScript = () => {
  //     console.log("Loading VAD script...");
  //     return new Promise<void>((resolve, reject) => {
  //       const script = document.createElement("script");
  //       script.src =
  //         "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.13/dist/bundle.min.js";
  //       script.onload = () => {
  //         resolve();
  //         console.log("Successfully loaded VAD script");
  //       };
  //       script.onerror = () => {
  //         reject("Failed to load VAD script");
  //         console.log("Failed to load VAD script");
  //       };
  //       document.head.appendChild(script);
  //     });
  //   };

  //   const connectWebSocket = async () => {
  //     await loadVadScript();

  //     socket.onopen = () => {
  //       setStatus("CONNECTED");
  //     };

  //     socket.onmessage = async (event) => {
  //       if (typeof event.data === "string") {
  //         try {
  //           console.log("STRIG");
  //           const message = JSON.parse(event.data);
  //           if (message.type === "transcript") {
  //             console.log("transcript");
  //             setTranscript((prev) => prev + " " + message.content);
  //           } else {
  //             console.warn("Unsupported message type:", message.type);
  //           }
  //         } catch (error) {
  //           console.error("Error parsing JSON:", error);
  //         }
  //       } else if (event.data instanceof Blob) {
  //         console.log("BLOB");
  //         const arrayBuffer = await event.data.arrayBuffer();
  //         const audioBuffer = await decodeAudioBuffer(arrayBuffer);
  //         if (audioBuffer) {
  //           audioQueue.push(audioBuffer);
  //           console.log("Audio queue length:", audioQueue);
  //           playAudioStream();
  //         }
  //       }
  //     };

  //     socket.onerror = () => {
  //       setStatus("ERROR");
  //     };

  //     socket.onclose = () => {
  //       setStatus("DISCONNECTED");
  //     };
  //   };

  //   const decodeAudioBuffer = async (arrayBuffer) => {
  //     try {
  //       console.log("Decoding audio data...", arrayBuffer);
  //       console.log(audioContext);
  //       // audioContext.current.pause();
  //       audioContext = new (window.AudioContext || window.webkitAudioContext)();
  //       return await audioContext.decodeAudioData(arrayBuffer);
  //     } catch (error) {
  //       console.error("Failed to decode audio data:", error);
  //       return null;
  //     }
  //   };

  //   const playAudioStream = () => {
  //     if (isPlaying || audioQueue.length === 0) return;

  //     isPlaying = true;
  //     const audioBuffer = audioQueue.shift();

  //     const sourceNode = audioContext.createBufferSource();
  //     sourceNode.buffer = audioBuffer;
  //     sourceNode.connect(audioContext.destination);

  //     sourceNode.onended = () => {
  //       isPlaying = false;
  //       playAudioStream();
  //     };

  //     sourceNode.start();
  //   };

  //   const initialize = () => {
  //     connectWebSocket();
  //     console.log("intlie");
  //   };

  //   initialize();
  // }, [socket]); // Empty dependency array ensures this runs once on mount
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
          const message = JSON.parse(event.data);
          if (message.type === "transcript") {
            setTranscript((prev) => prev + " " + message.content);
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
  // const togglevad = () => {
  //   if (vadInstance) {
  //     if (!vadInstance.listening) {
  //       vadInstance.start();
  //       setIsListening(true);
  //       setStatus("running");
  //     } else {
  //       vadInstance.pause();
  //       setIsListening(false);
  //       setStatus("stopped");
  //     }
  //   }
  // };
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

    //   // connectWebSocket("ws://localhost:8000/ws", (socket) => {
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
    <div style={{display: "flex"}}>
    <div style={{height: "100vh", width: "100vw"}}>

    </div>

    <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Welcome!
        </h1>
        <form className="space-y-6" onSubmit={handleSubmit}>
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
    </div>
  );
};

export default HomePage;
