import React, { useEffect, useState, useRef } from "react";
import styles from "./ChatPage.module.scss";
import { interpolateInferno } from "d3-scale-chromatic";
import { useMicVAD } from "@ricky0123/vad-react";
import { useWebSocket } from "@/contexts/WebSocketContext";
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const { socket, isConnecting } = useWebSocket();
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
  const vad = useMicVAD({
    onFrameProcessed: (probs) => {
      const indicatorColor = interpolateInferno(probs.isSpeech / 2);
      document.body.style.setProperty("--indicator-color", indicatorColor);
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
          } else if (message.type === "currently_image_generating") {
            setGenerating(true);
            console.log("surrently_image_generating", message.content);
          } else if (message.type === "image_generated") {
            console.log("image_generated", message.content);
            const cleanedImage = message.content.replace(/^"|"$/g, "");
            console.log(cleanedImage);
            setImage(cleanedImage);
            setGenerating(false);
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
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>Voice Assistant Demo</h1>
        <div className={styles.controlRow}>
          <div>
          <p>Start by asking clara about your Palm Details!!!</p>
          </div>
          {/* <div
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
          </button> */}
        </div>
        <div id="transcript">{transcript}</div>
        <div>
          {generating ? (
            <div className={styles.loader}>Loading...</div>
          ) : ( image ? (
            <img src={`data:image/png;base64,${image}`} alt="Generated Image" />
          ): null)}
        </div>
      </div>
    </div>
  );
};
export default ChatPage;
