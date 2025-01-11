import csv
import io
import base64
import json
import asyncio
from dotenv import load_dotenv
import time

# Record start time

from get_user_data import get_user_data

load_dotenv()
from openai import AsyncOpenAI
from fastapi import FastAPI, WebSocket
from pydub import AudioSegment
from extract_palm_features import get_palm_details, ExtractEvent, ExtractStatus
from prompts import (
    EXTRACT_PROMPT,
    get_palm_astro_prompt,
    WELCOME_PROMPT,
    PHOTO_CAPTURE_PROMPT,
    PHOTO_RE_CAPTURE_PROMPT,
)

client = AsyncOpenAI()
app = FastAPI()

PALMIST_NAME = "Clara"

generate_image_based_on_the_prompt_tool = {
    "type": "function",
    "name": "generate_image_based_on_the_user_question",
    "description": "when user asks images/photo or regarding visualizing anything,  For example: 'photo of my future bike', 'image of my future partner', 'visualize my feature house', This function can be called and generates an image based on the user question.",
    "parameters": {
        "type": "object",
        "properties": {"user_question": {"type": "string"}},
        "required": ["user_question"],
    },
}

def convert_wav_to_pcm16(wav_bytes):
    """
    Converts WAV audio bytes to PCM16 raw bytes.

    Args:
        wav_bytes (bytes): Input WAV file data as bytes.

    Returns:
        bytes: PCM16 audio data as raw bytes.
    """
    audio = AudioSegment.from_file(io.BytesIO(wav_bytes), format="wav")
    audio = audio.set_frame_rate(24000).set_channels(1).set_sample_width(2)
    return audio.raw_data


def convert_pcm16_to_wav(pcm16_data, sample_rate=24000, num_channels=1):
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
        channels=num_channels,
    )
    wav_buffer = io.BytesIO()
    audio.export(wav_buffer, format="wav")
    return wav_buffer.getvalue()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        user_info = {}
        name = None
        gender = None
        age = None
        exp = None
        designation = None
        city = None
        extracted_palm_details = ExtractEvent(
            status=ExtractStatus.NO_PALM_DETECTED,
            palm_not_detected_reason="Palm not captured",
        )

        async with client.beta.realtime.connect(
            model="gpt-4o-mini-realtime-preview"
        ) as connection:
            past_response_id = None
            transcript_past_response_id = None
            instructions = ""

            async def handle_openai_events():
                """
                Handles events from the OpenAI connection asynchronously.
                """
                nonlocal past_response_id
                nonlocal transcript_past_response_id
                try:
                    async for event in connection:
                        if event.type == "response.audio_transcript.delta":
                            message_dict = {
                                "type": "transcript",
                                "content": {
                                    "reset_audio_buffer": not (
                                        transcript_past_response_id == event.response_id
                                    ),
                                    "wav_audio_base64": event.delta,
                                },
                            }
                            transcript_past_response_id = event.response_id
                            await websocket.send_text(json.dumps(message_dict))

                        elif event.type == "response.audio.delta":
                            print(event.item_id, event.response_id)
                            print("Received audio delta from OpenAI")
                            audio_bytes = base64.b64decode(event.delta)
                            wav_audio = convert_pcm16_to_wav(audio_bytes)
                            # await websocket.send_bytes(wav_audio)
                            wav_audio_base64 = base64.b64encode(wav_audio).decode(
                                "utf-8"
                            )
                            audio_message_dict = {
                                "type": "response_audio",
                                "content": {
                                    "reset_audio_buffer": not (
                                        past_response_id == event.response_id
                                    ),
                                    "wav_audio_base64": wav_audio_base64,
                                },
                            }
                            past_response_id = event.response_id
                            print(audio_message_dict["content"]["reset_audio_buffer"])
                            await websocket.send_text(json.dumps(audio_message_dict))

                        if event.type == "response.created":
                            if not past_response_id:
                                past_response_id = event.response.id
                            if not transcript_past_response_id:
                                transcript_past_response_id = event.response.id
                            print("response created", event.response.id)

                        elif event.type == "response.done":
                            print("Conversation response done")
                            if extracted_palm_details.status == ExtractStatus.PALM_DETECTED:
                                await connection.session.update(
                                    session={
                                        "instructions": instructions,
                                    }
                                )

                        elif event.type == "session.updated":
                            print(event)

                except Exception as e:
                    print(f"Error in OpenAI event handler: {e}")

            # Start OpenAI event handler as a background task
            event_task = asyncio.create_task(handle_openai_events())
            # await connection.response.create()

            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                # print(f"Received message: {message}")
                if message["type"] == "started":
                    await connection.session.update(
                        session={
                            "instructions": WELCOME_PROMPT.format(
                                palmist_name=PALMIST_NAME
                            ),
                            "modalities": ["text", "audio"],
                            "output_audio_format": "pcm16",
                            "input_audio_format": "pcm16",
                            "input_audio_transcription": {"model": "whisper-1"},
                            "turn_detection": None,
                            "voice": "coral",
                        }
                    )
                    await connection.response.create()

                elif message["type"] == "user_details":
                    user_info = message["content"]
                    print(f"Received user info: {user_info}")
                    # await connection.session.update(
                    #     session={"instructions": ""}
                    # )
                    print(user_info["name"])

                    name, gender, age, exp, designation, city = get_user_data(
                        user_info["name"], user_info["gender"]
                    )
                    print(name, gender, age, exp, designation, city)
                    await connection.session.update(
                        session={
                            "instructions": PHOTO_CAPTURE_PROMPT.format(
                                palmist_name=PALMIST_NAME,
                                user_name=user_info["name"],
                                designation=designation,
                            ),
                        }
                    )
                    await connection.response.create()
                elif message["type"] == "palm_image":
                    image_content: str = message["content"]
                    extracted_palm_details = get_palm_details(
                        image_content["imageURL"],
                        EXTRACT_PROMPT.format(
                            designation=designation,
                        ),
                        "palm",
                    )
                    print(f"status: {extracted_palm_details.status}")
                    if extracted_palm_details.status == ExtractStatus.PALM_DETECTED:
                        message_dict = {
                            "type": "palm_detected_status",
                            "content": {
                                "status": extracted_palm_details.status,
                                "description": extracted_palm_details.palm_future_predictions,
                                "image": image_content["imageURL"].strip('"'),
                            },
                        }
                        await websocket.send_text(json.dumps(message_dict))
                        print(f"Extracted palm details: {extracted_palm_details}")
                        instructions = get_palm_astro_prompt(
                                    extracted_palm_details.palm_future_predictions,
                                    name=name,
                                    gender=gender,
                                    age=age,
                                    exp=exp,
                                    designation=designation,
                                    city=city,
                                    palmist_name=PALMIST_NAME,
                        )
                        await connection.session.update(
                            session={
                                "instructions": instructions,
                            }
                        )
                        await connection.response.create()
                    else:
                        message_dict = {
                            "type": "palm_detected_status",
                            "content": {
                                "status": extracted_palm_details.status,
                                "description": extracted_palm_details.palm_not_detected_reason,
                                "image": image_content["imageURL"].strip('"'),
                            },
                        }
                        await websocket.send_text(json.dumps(message_dict))
                        print(f"Extracted palm details: {extracted_palm_details}")
                        await connection.session.update(
                            session={
                                "instructions": PHOTO_RE_CAPTURE_PROMPT.format(
                                    palmist_name=PALMIST_NAME,
                                    user_name=user_info["name"],
                                ),
                            }
                        )
                        await connection.response.create()

                elif message["type"] == "audio":
                    print("Received audio message")

                    # Convert received audio to PCM 16-bit
                    pcm16_audio = convert_wav_to_pcm16(
                        base64.b64decode(message["content"])
                    )
                    pcm16_audio_base64 = base64.b64encode(pcm16_audio).decode("utf-8")


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
                elif message["type"] == "end":
                    print("Ended")

                if event_task.done():
                    event_task = asyncio.create_task(handle_openai_events())

    except Exception as e:
        print(f"Error: {e}")
        raise e
    finally:
        await websocket.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
