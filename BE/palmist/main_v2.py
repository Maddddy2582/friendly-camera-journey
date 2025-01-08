import io
import base64
from dotenv import load_dotenv
load_dotenv()
from openai import AsyncOpenAI
from fastapi import FastAPI, WebSocket
from pydub import AudioSegment
import struct

client = AsyncOpenAI()
app = FastAPI()

def convert_wav_to_pcm16(wav_bytes):
    """
    Converts WAV audio bytes to PCM16 raw bytes.

    Args:
        wav_bytes (bytes): Input WAV file data as bytes.

    Returns:
        bytes: PCM16 audio data as raw bytes.
    """
    # Load audio with pydub
    audio = AudioSegment.from_file(io.BytesIO(wav_bytes), format="wav")
    
    # Ensure audio is in PCM16 format
    audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
    
    return audio.raw_data

def convert_pcm16_to_wav(pcm16_data, sample_rate=16000, num_channels=1):
    """
    Converts PCM16 raw bytes to WAV bytes.

    Args:
        pcm16_data (bytes): PCM16 raw bytes.
        sample_rate (int): Sample rate of the audio in Hz.
        num_channels (int): Number of audio channels.

    Returns:
        bytes: WAV file data as bytes.
    """
    audio = AudioSegment(
        data=pcm16_data,
        sample_width=2,
        frame_rate=sample_rate,
        channels=num_channels
    )
    
    wav_buffer = io.BytesIO()
    audio.export(wav_buffer, format="wav")
    return wav_buffer.getvalue()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        async with client.beta.realtime.connect(
            model="gpt-4o-mini-realtime-preview"
        ) as connection:
            await connection.session.update(
                session={
                    "instructions": "You are a funny assistant. You will talk to Indians.",
                    "modalities": ["text", "audio"],
                    "output_audio_format": "pcm16",
                    "input_audio_format": "pcm16",
                    "turn_detection": None,
                }
            )
            while True:
                data = await websocket.receive_text()
                message = eval(data)

                if message["type"] == "audio":
                    print("Received audio message")

                    # Convert received audio to PCM 16-bit
                    pcm16_audio = convert_wav_to_pcm16(
                        base64.b64decode(message["content"])
                    )
                    pcm16_audio_base64 = base64.b64encode(pcm16_audio).decode("utf-8")

                    # Send the PCM 16-bit audio to OpenAI
                    await connection.conversation.item.create(
                        item={
                            "type": "message",
                            "role": "user",
                            "content": [
                                {
                                    "type": "input_audio",
                                    "audio": pcm16_audio_base64,
                                }
                            ],
                        }
                    )
                    await connection.response.create()

                    async for event in connection:
                        if event.type == "response.text.delta":
                            print(event.delta, flush=True, end="")

                        if event.type == "response.audio.delta":
                            print("Received audio delta from OpenAI")

                            audio_bytes = base64.b64decode(event.delta)
                            print(audio_bytes)
                            # Convert the PCM 16-bit response to WAV
                            wav_audio = convert_pcm16_to_wav(
                                audio_bytes
                            )

                            # Send back the WAV audio
                            await websocket.send_bytes(wav_audio)

                        elif event.type == "response.text.done":
                            print()

                        elif event.type == "response.done":
                            break

    except Exception as e:
        print(f"Error: {e}")
        raise e
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
