import io
import base64
from dotenv import load_dotenv
load_dotenv()
from openai import AsyncOpenAI
from fastapi import FastAPI, WebSocket
from scipy.io import wavfile
import numpy as np
import io


client = AsyncOpenAI()
app = FastAPI()


from scipy.io import wavfile
import numpy as np
import io
import struct

def convert_wav_to_pcm16(wav_bytes):
    """
    Converts WAV audio bytes to PCM16 raw bytes.

    Args:
        wav_bytes (bytes): Input WAV file data as bytes.

    Returns:
        bytes: PCM16 audio data as raw bytes.
    """
    # Create a BytesIO object for in-memory operations
    wav_file = io.BytesIO(wav_bytes)

    # Read WAV file using scipy
    sample_rate, audio_data = wavfile.read(wav_file)

    # Convert floating-point audio to PCM16 if necessary
    if audio_data.dtype == np.float32 or audio_data.dtype == np.float64:
        audio_data = np.int16(audio_data * 32767)  # Scale float to 16-bit PCM

    # If audio is stereo, convert to mono
    if len(audio_data.shape) > 1:
        audio_data = np.mean(audio_data, axis=1).astype(np.int16)

    # Pack PCM16 data into raw bytes
    pcm16_bytes = struct.pack('<' + 'h' * len(audio_data), *audio_data)

    return pcm16_bytes

from scipy.io import wavfile
import numpy as np
import io
import struct

def convert_pcm16_to_wav(pcm16_data, sample_rate=16000, num_channels=1):
    """
    Converts PCM16 raw bytes or integers to WAV bytes.

    Args:
        pcm16_data (bytes or list): PCM16 raw bytes or list of integers.
        sample_rate (int): Sample rate of the audio in Hz.
        num_channels (int): Number of audio channels.

    Returns:
        bytes: WAV file data as bytes.
    """
    if isinstance(pcm16_data, bytes):
        # Unpack raw PCM16 bytes into integers
        pcm16_data = struct.unpack('<' + 'h' * (len(pcm16_data) // 2), pcm16_data)
    
    # Ensure pcm16_data is a NumPy array of int16
    pcm16_array = np.array(pcm16_data, dtype=np.int16)
    
    # Handle stereo if necessary
    if num_channels == 2 and len(pcm16_array.shape) == 1:
        pcm16_array = np.stack((pcm16_array, pcm16_array), axis=-1)
    
    # Write to an in-memory buffer
    wav_buffer = io.BytesIO()
    wavfile.write(wav_buffer, sample_rate, pcm16_array)
    
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
