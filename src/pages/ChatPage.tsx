import React, { useEffect, useState, useRef } from "react";
import styles from "./ChatPage.module.scss";
import { interpolateInferno } from "d3-scale-chromatic";
import { useMicVAD } from "@ricky0123/vad-react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff } from "lucide-react";
import image2 from "../../public/bot-talking.gif";
import image1 from "../../public/bot_not_talking.png";
import { set } from "date-fns";
import { Button } from "@/components/ui/button";

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

const ChatPage = () => {
  const [status, setStatus] = useState("LOADING");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [vadInstance, setVadInstance] = useState<VadInstance | null>(null);
  const [image, setImage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showGif, setShowGif] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const { socket, isConnecting } = useWebSocket();
  const location = useLocation();
  const { imageResponse } = location.state || {};
  const [transcriptSegments, setTranscriptSegments] = useState([]);

  console.log(transcriptSegments, "transcriptSegments");

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setShowGif(false);
  //   }, 8000);

  //   return () => clearTimeout(timer);
  // }, []);

  const stopCurrentAudio = () => {
    console.log("🔊 Stopping current audio playback");
    if (currentSourceNodeRef.current) {
      try {
        console.log("🔊 Disconnecting and cleaning up audio source node");
        currentSourceNodeRef.current.stop();
        currentSourceNodeRef.current.disconnect();
        currentSourceNodeRef.current = null;
        audioQueueRef.current = [];
      } catch (error) {
        console.error("❌ Error stopping current audio:", error);
      }
    }
    isPlayingRef.current = false;
    audioQueueRef.current = [];
  };

  const playAudioStream = () => {
    setShowGif(true);
    console.log("🔊 Starting audio stream playback");
    // setIsMuted(true);
    // vad.pause();
    if (
      !audioContextRef.current ||
      isPlayingRef.current ||
      audioQueueRef.current.length === 0
    ) {
      console.log("FINISHEDDDDD");
      console.log("⏸️ Audio playback conditions not met:", {
        hasAudioContext: !!audioContextRef.current,
        isPlaying: isPlayingRef.current,
        queueLength: audioQueueRef.current.length,
      });
      if (audioQueueRef.current.length === 0) {
        setIsMuted(false);
        setShowGif(false);
        vad.start();

        console.log("🔊❌❌❌ Audio playback ended");
      }
      return;
    }
    isPlayingRef.current = true;
    const audioBuffer = audioQueueRef.current.shift();
    if (!audioBuffer) return;
    console.log("🔊 Creating new audio source node");
    const sourceNode = audioContextRef.current.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContextRef.current.destination);
    currentSourceNodeRef.current = sourceNode;
    sourceNode.onended = () => {
      console.log("🔊❌❌❌ Audio playback ended");
      isPlayingRef.current = false;
      currentSourceNodeRef.current = null;
      playAudioStream();
    };
    console.log("▶️ Starting audio playback");
    sourceNode.start();
  };

  const resetAudioPlayer = () => {
    console.log("🔄 Resetting audio player");
    stopCurrentAudio();
    // setTranscript("");
  };

  const sendAudioToServer = async (wavBuffer: ArrayBuffer) => {
    try {
      console.log("📤 Preparing to send audio to server");
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
      console.log("✅ Audio successfully sent to server");
    } catch (error) {
      console.error("❌ Error sending audio to server:", error);
    }
  };

  const vad = useMicVAD({
    onFrameProcessed: (probs) => {
      const indicatorColor = interpolateInferno(probs.isSpeech / 2);
    },
    onSpeechStart: () => {
      if (!isMuted) {
        console.log("🎤 Speech detection started");
        console.log(
          "🎙️ Audio input detected - Speech probability:",
          Date.now()
        );
        resetAudioPlayer();
      }
    },
    onSpeechEnd: async (audio) => {
      if (!isMuted) {
        console.log("🎤 Speech detection ended");
        console.log(
          "📝 Processing speech segment - Duration:",
          audio.length / 16000,
          "seconds"
        );
        const wavBuffer = window.vad.utils.encodeWAV(audio);
        await sendAudioToServer(wavBuffer);
      }
    },
  });

  useEffect(() => {
    const loadVadScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (!audioContextRef.current) {
          console.log("🎵 Creating new AudioContext");
          audioContextRef.current = new (window.AudioContext ||
            window.webkitAudioContext)();
        }
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.13/dist/bundle.min.js";
        script.onload = () => {
          console.log("✅ VAD script loaded successfully");
          resolve();
        };
        script.onerror = () => {
          console.error("❌ Failed to load VAD script");
          reject("Failed to load VAD script");
        };
        document.head.appendChild(script);
      });
    };

    // const decodeAudioBuffer = async (
    //   arrayBuffer: ArrayBuffer
    // ): Promise<AudioBuffer | null> => {
    //   try {
    //     console.log("🎵 Decoding audio buffer");
    //     if (!audioContextRef.current) {
    //       audioContextRef.current = new (window.AudioContext ||
    //         window.webkitAudioContext)();
    //     }
    //     return await audioContextRef.current.decodeAudioData(arrayBuffer);
    //   } catch (error) {
    //     console.error("❌ Failed to decode audio data:", error);
    //     return null;
    //   }
    // };

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
    //       const message = JSON.parse(event.data);
    //       if (message.type === "transcript") {
    //         console.log("📝 Received transcript:", message.content);
    //         setTranscript((prev) => prev + " " + message.content);
    //       } else if (message.type === "currently_image_generating") {
    //         setGenerating(true);
    //         console.log("🎨 Image generation started");
    //       } else if (message.type === "image_generated") {
    //         console.log("✨ Image generation completed");
    //         const cleanedImage = message.content.replace(/^"|"$/g, "");
    //         setImage(cleanedImage);
    //         setGenerating(false);
    //       }
    //     } catch (error) {
    //       console.error("❌ Error parsing WebSocket message:", error);
    //     }
    //   } else if (event.data instanceof Blob) {
    //     console.log("EVENT DATA", event);
    //     console.log("📥 Received audio blob from server", event.data);
    //     const arrayBuffer = await event.data.arrayBuffer();
    //     const audioBuffer = await decodeAudioBuffer(arrayBuffer);
    //     if (audioBuffer) {
    //       console.log("🔊 Adding decoded audio to playback queue", audioBuffer);
    //       audioQueueRef.current.push(audioBuffer);
    //       playAudioStream();
    //     }
    //   }
    // };

    const handleWebSocketMessage = async (event: MessageEvent) => {
      if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "transcript") {
            console.log(
              "📝 Received transcript:",
              message.content.wav_audio_base64
            );
            console.log(message.content.reset_audio_buffer, "state");
            setTranscript(
              (prev) => prev + " " + message.content.wav_audio_base64
            );
            if (message.content.reset_audio_buffer) {
              console.log("121");
              // Start a new paragraph by appending an empty string
              setTranscriptSegments((prevSegments) => [
                ...prevSegments,
                message.content.wav_audio_base64,
              ]);
            } else {
              console.log("131");

              // Append to the last paragraph
              setTranscriptSegments((prevSegments) => {
                console.log(prevSegments, "1234");
                const updatedSegments = [...prevSegments];
                if (updatedSegments.length === 0) {
                  return [message.content.wav_audio_base64];
                }
                let lastSegment = updatedSegments[updatedSegments.length - 1];
                console.log(lastSegment, "lastSegment");
                console.log("message.content.wav_audio_base64", message.content.wav_audio_base64);
                lastSegment += message.content.wav_audio_base64;
                updatedSegments[updatedSegments.length - 1] = lastSegment;
                return updatedSegments;
              });
            }
          } else if (message.type === "currently_image_generating") {
            setGenerating(true);
            console.log("🎨 Image generation started");
          } else if (message.type === "image_generated") {
            console.log("✨ Image generation completed");
            const cleanedImage = message.content.replace(/^"|"$/g, "");
            setImage(cleanedImage);
            setGenerating(false);
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
          console.error("❌ Error processing WebSocket message:", error);
        }
      }
    };

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

    const initialize = async () => {
      console.log("🚀 Initializing application");
      await loadVadScript();
      if (socket) {
        socket.onmessage = handleWebSocketMessage;
        socket.onopen = () => {
          console.log("🌐 WebSocket connected");
          setStatus("CONNECTED");
        };
        socket.onerror = () => {
          console.error("❌ WebSocket error occurred");
          setStatus("ERROR");
        };
        socket.onclose = () => {
          console.log("🔌 WebSocket disconnected");
          setStatus("DISCONNECTED");
        };
      }
    };

    initialize();
    return () => {
      // stopCurrentAudio();
    };
  }, [socket]);

  const toggleMic = () => {
    console.log(`🎤 Microphone ${!isMuted ? "muted" : "unmuted"}`);
    setIsMuted(!isMuted);
    if (!isMuted) {
      console.log("⏸️ Pausing voice detection");
      vad.pause();
      setIsListening(false);
    } else {
      console.log("▶️ Starting voice detection");
      vad.start();
      setIsListening(true);
    }
  };

  const { name } = location.state || {};
  console.log("CHatPage: ", name);
  const navigate = useNavigate();

  useEffect(() => {
    resetAudioPlayer();
  }, []);

  return (
    <div className="flex h-screen">
      {/* Left Side */}
      <div className="w-2/5 bg-gradient-to-br from-purple-900 to-indigo-900 flex flex-col">
        {/* Avatar Section - Top Left */}
        <div className="h-2/5 relative flex items-center justify-center">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1614850715649-1d0106293bd1?q=80&w=1470&auto=format&fit=crop')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          ></div>
          <div className="relative w-80 h-80 flex items-center justify-center">
            <div
              className={`absolute transition-opacity duration-500 ${
                showGif ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={image2}
                alt="Clara AI Avatar Animated"
                className="w-100 h-100 object-contain"
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
                className="w-100 h-100 object-contain"
              />
            </div>
          </div>
        </div>

        {/* Image Section - Bottom Left */}
        <div className="h-3/5 flex items-center justify-center p-8">
          {imageResponse && (
            <img
              src={imageResponse}
              alt="Captured"
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      </div>

      {/* Right Side */}
      <div className="w-3/5 bg-gray-900 p-8 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-4">Hi {name},</h1>
          <div className="flex justify-between items-center mb-4">
            <p className="text-white">
              Start by asking clara about your Palm Details!!!
            </p>

            <button
              onClick={toggleMic}
              className="p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-red-500" />
              ) : (
                <Mic className="w-6 h-6 text-green-500" />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-800 rounded-lg p-6 overflow-auto">
          <p className="text-white text-lg leading-relaxed">
            {transcriptSegments.map((segment, index) => (
          <>
          {/* <img src={image1} alt="bot"/> */}
          <p key={index} className="text-white text-lg leading-relaxed">
            {segment}
            <span className="animate-pulse">|</span>
          </p>
            <br></br></>
        ))}
              {/* {transcript} */}
            <span className="animate-pulse">|</span>
          </p>
          {generating ? (
            <div className="loader">Loading...</div>
          ) : image ? (
            <img
              src={`data:image/png;base64,${image}`}
              alt="Generated Image"
              className="max-w-full max-h-full object-contain"
            />
          ) : null}
        </div>
        <Button
          onClick={() => {
            socket.send(JSON.stringify({ type: "end" }));
            resetAudioPlayer();
            console.log("RESETED AUDIO STREAM");
            socket.close();
            console.log("CLOSED SOCKET");
            navigate("/thankyou", { state: { name: name } });
          }}
          className="pr-9 pl-9 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors w-10 self-end"
        >
          Exit
        </Button>
      </div>
    </div>
  );
};

export default ChatPage;
