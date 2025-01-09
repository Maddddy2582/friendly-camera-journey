import React, { useEffect, useState, useRef } from "react";
import styles from "./ChatPage.module.scss";
import { interpolateInferno } from "d3-scale-chromatic";
import { useMicVAD } from "@ricky0123/vad-react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useLocation } from "react-router-dom";
import { Mic, MicOff } from "lucide-react";

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
  const [isMuted, setIsMuted] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const { socket, isConnecting } = useWebSocket();
  const location = useLocation();
  const { imageResponse } = location.state || {};

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
    console.log("🔊 Starting audio stream playback");
    setIsMuted(true)
    vad.pause();
    if (
      !audioContextRef.current ||
      isPlayingRef.current ||
      audioQueueRef.current.length === 0
    ) {
      console.log("FINISHEDDDDD")
      console.log("⏸️ Audio playback conditions not met:", {
        hasAudioContext: !!audioContextRef.current,
        isPlaying: isPlayingRef.current,
        queueLength: audioQueueRef.current.length
      });
      if(audioQueueRef.current.length === 0) {
        setIsMuted(false)
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
    setTranscript("");
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
      document.body.style.setProperty("--indicator-color", indicatorColor);
    },
    onSpeechStart: () => {
      if (!isMuted) {
        console.log("🎤 Speech detection started");
        console.log("🎙️ Audio input detected - Speech probability:", Date.now());
        resetAudioPlayer();
      }
    },
    onSpeechEnd: async (audio) => {
      if (!isMuted) {
        console.log("🎤 Speech detection ended");
        console.log("📝 Processing speech segment - Duration:", audio.length / 16000, "seconds");
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
            console.log("📝 Received transcript:", message.content);
            setTranscript((prev) => prev + " " + message.content);
          } else if (message.type === "currently_image_generating") {
            setGenerating(true);
            console.log("🎨 Image generation started");
          } else if (message.type === "image_generated") {
            console.log("✨ Image generation completed");
            const cleanedImage = message.content.replace(/^"|"$/g, "");
            setImage(cleanedImage);
            setGenerating(false);
          }
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      } else if (event.data instanceof Blob) {
        console.log("📥 Received audio blob from server");
        const arrayBuffer = await event.data.arrayBuffer();
        const audioBuffer = await decodeAudioBuffer(arrayBuffer);
        if (audioBuffer) {
          console.log("🔊 Adding decoded audio to playback queue");
          audioQueueRef.current.push(audioBuffer);
          playAudioStream();
        }
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
    console.log(`🎤 Microphone ${!isMuted ? 'muted' : 'unmuted'}`);
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

  useEffect(() => {
    resetAudioPlayer();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>Voice Assistant Demo</h1>
        <div className={styles.controlRow}>
          <div>
            <p>Start by asking clara about your Palm Details!!!</p>
          </div>
          <button
            onClick={toggleMic}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-red-500" />
            ) : (
              <Mic className="w-6 h-6 text-green-500" />
            )}
          </button>
        </div>
        <div id="transcript">{transcript}</div>
        <div>
          {generating ? (
            <div className={styles.loader}>Loading...</div>
          ) : image ? (
            <img src={`data:image/png;base64,${image}`} alt="Generated Image" />
          ) : null}
        </div>
        <img src={imageResponse} alt="Captured" />
      </div>
    </div>
  );
};

export default ChatPage;