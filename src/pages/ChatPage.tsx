import React, { useEffect, useState } from "react";
import styles from "./ChatPage.module.scss";
import { interpolateInferno } from "d3-scale-chromatic";
import { useMicVAD } from "@ricky0123/vad-react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

declare global {
  interface Window {
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

// Define the VadInstance type
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
//   const [audioContext, setAudioContext] = useState(null);
  let audioQueue = [];
  let isPlaying = false;
  let audioContext = null;
const { socket, isConnecting } = useWebSocket();

  const resetAudioPlayer = () => {
    audioQueue = [];
    isPlaying = false;
  };

  const sendAudioToServer = async (wavBuffer) => {
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
      console.log(socket)
      console.log(message)
      socket.send(JSON.stringify(message));
      console.log("Audio sent to server");
    } catch (error) {
      console.error("Error sending audio to server:", error);
    }
  };

  // Use the VAD hook
  
  const vad = useMicVAD({
    onFrameProcessed: (probs) => {
      const indicatorColor = interpolateInferno(probs.isSpeech / 2);
      document.body.style.setProperty("--indicator-color", indicatorColor);
    },
    onSpeechStart: () => {
      console.log("Speech start detected");
      resetAudioPlayer();
      setTranscript("");
    },
    onSpeechEnd: async (audio) => {
      console.log("Speech end detected");
      console.log(window.vad)
      const wavBuffer = window.vad.utils.encodeWAV(audio);
      await sendAudioToServer(wavBuffer);
    },
  });

  // Using useEffect to initialize VAD and WebSocket
  useEffect(() => {
    const loadVadScript = () => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.13/dist/bundle.min.js";
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

    const connectWebSocket = async () => {
        await loadVadScript();

      socket.onopen = () => {
        setStatus("CONNECTED");
        // initAudioContext();
      };

      socket.onmessage = async (event) => {
        if (typeof event.data === "string") {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "transcript") {
              setTranscript((prev) => prev + " " + message.content);
                          
            } else {
              console.warn("Unsupported message type:", message.type);
            }
          } catch (error) {
            console.error("Error parsing JSON:", error);
          }
        } else if (event.data instanceof Blob) {
            console.log("madav")
            // audioQueue = [];
          const arrayBuffer = await event.data.arrayBuffer();
          const audioBuffer = await decodeAudioBuffer(arrayBuffer);
          if (audioBuffer) {
            audioQueue.push(audioBuffer);
            playAudioStream();
          }
        }
      };

      socket.onerror = () => {
        setStatus("ERROR");
      };

      socket.onclose = () => {
        setStatus("DISCONNECTED");
      };
    };

    // const initAudioContext = () => {
    //     if (!audioContext) {
    //         setAudioContext(new (window.AudioContext || window.webkitAudioContext)());
    //         console.log("Audio context initialized");
    //       }
    // };

    const decodeAudioBuffer = async (arrayBuffer) => {
      try {
        console.log("Decoding audio data...", arrayBuffer);
        console.log(audioContext)
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return await audioContext.decodeAudioData(arrayBuffer);
      } catch (error) {
        console.error("Failed to decode audio data:", error);
        return null;
      }
    };

    const playAudioStream = () => {
      if (isPlaying || audioQueue.length === 0) return;

      isPlaying = true;
      const audioBuffer = audioQueue.shift();

      const sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioContext.destination);

      sourceNode.onended = () => {
        isPlaying = false;
        playAudioStream();
      };

      sourceNode.start();
    };

    const initialize = async () => {
      await connectWebSocket();
    console.log("initialize")
    };

    initialize();
  }, []);  // Empty dependency array ensures this runs once on mount

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

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>Voice Assistant Demo</h1>
        <div className={styles.controlRow}>
          <div
            id="indicator"
            style={{ color: status === "CONNECTED" ? "green" : "red" }}
          >
            {status}
          </div>
          <button
            id="toggle_vad_button"
            onClick={togglevad}
            disabled={status === "LOADING"}
          >
            {isListening ? "STOP" : "START VAD"}
          </button>
        </div>
        <div id="transcript">{transcript}</div>
      </div>
    </div>
  );
};

export default ChatPage;
