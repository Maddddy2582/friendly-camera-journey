import wave
import struct

import wave
import struct
import io

def convert_wav_to_pcm16(wav_bytes):
    # Create an in-memory file-like object using BytesIO
    wav_file = io.BytesIO(wav_bytes)
    
    # Open the WAV file
    with wave.open(wav_file, 'rb') as wf:
        # Extract the audio parameters
        num_channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        framerate = wf.getframerate()
        num_frames = wf.getnframes()

        # Read the audio data (PCM16) as raw bytes
        pcm16_data = wf.readframes(num_frames)
        
        # Convert raw audio to PCM16 (16-bit samples)
        pcm16_values = struct.unpack('<' + 'h' * (len(pcm16_data) // 2), pcm16_data)  # '<' for little-endian, 'h' for signed short (16-bit)

    return pcm16_values



import wave
import struct
import io

def convert_pcm16_to_wav(pcm16_data, sample_rate=16000, num_channels=1):
    # Create a new in-memory buffer to hold the WAV data
    wav_buffer = io.BytesIO()

    # Prepare the audio parameters
    num_frames = len(pcm16_data)
    sampwidth = 2  # PCM16 is 2 bytes per sample

    # Create a wave object to write the WAV data
    wav_file = wave.open(wav_buffer, 'wb')
    wav_file.setnchannels(num_channels)  # Mono or stereo
    wav_file.setsampwidth(sampwidth)     # 2 bytes per sample (16-bit)
    wav_file.setframerate(sample_rate)   # Sample rate
    wav_file.setnframes(num_frames)

    # Pack PCM16 data into raw bytes and write to WAV
    pcm16_bytes = struct.pack('<' + 'h' * len(pcm16_data), *pcm16_data)
    wav_file.writeframes(pcm16_bytes)

    wav_file.close()

    # Return the WAV bytes
    wav_bytes = wav_buffer.getvalue()

    return wav_bytes


# Example: Convert WAV bytes to PCM16 and then back to WAV bytes

# Example: Load WAV file bytes (for example from a file)
with open('input.wav', 'rb') as f:
    wav_bytes = f.read()

# Convert WAV bytes to PCM16
pcm16_data = convert_wav_to_pcm16(wav_bytes)

# Convert PCM16 back to WAV bytes
new_wav_bytes = convert_pcm16_to_wav(pcm16_data)

# Save the new WAV bytes to a file
with open('output.wav', 'wb') as f:
    f.write(new_wav_bytes)
