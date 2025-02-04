import csv
import io
import base64
import json
import asyncio
from dotenv import load_dotenv
import time
from send_mail import send_mail_to_user 

# Record start time

 
load_dotenv()
from openai import AsyncOpenAI
from fastapi import FastAPI, WebSocket
from pydub import AudioSegment
from extract_palm_features import get_palm_details, ExtractEvent, ExtractStatus
from prompts import get_palm_astro_prompt, WELCOME_PROMPT, PHOTO_CAPTURE_PROMPT, PHOTO_RE_CAPTURE_PROMPT
from image_generation import generate_image_based_on_the_prompt
 
client = AsyncOpenAI()
app = FastAPI()

PALMIST_NAME = "Clara"

generate_image_based_on_the_prompt_tool = {
    "type": "function",
    "name": "generate_image_based_on_the_user_question",
    "description": "when user asks images/photo or regarding visualizing anything,  For example: 'photo of my future bike', 'image of my future partner', 'visualize my feature house', This function can be called and generates an image based on the user question.",
    "parameters": {
        "type": "object",
        "properties": {
            "user_question": { "type": "string" }
        },
        "required": ["user_question"]
    }
}
# stop_generate_image_based_on_the_prompt_tool = {
#     "type": "function",
#     "name": "stop_generate_image_based_on_the_user_question",
#     "description": "when user asks to stop image generation, this function can be called and stop image generation.",
#     "parameters": {
#         "type": "object",
#         "properties": {
#             "user_input": { "type": "string" }
#         },
#         "required": ["user_question"]
#     }
# }
 
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
    conversation = []
    try: 
        user_info = {}
        extracted_palm_details = ExtractEvent(status=ExtractStatus.NO_PALM_DETECTED, description="Palm not captured")

        async with client.beta.realtime.connect(
            model="gpt-4o-mini-realtime-preview"
        ) as connection:
            past_response_id = None 

            async def handle_generate_image_event(arguments):
                print("image generation task created")
                await websocket.send_text(json.dumps({"type": "image_generated", "content": generate_image_based_on_the_prompt(arguments["user_question"], user_info["gender"])}))

            async def handle_openai_events():
                """
                Handles events from the OpenAI connection asynchronously.
                """
                nonlocal past_response_id
                try:
                        
                        async for event in connection:
                            # print(event)
                            if event.type == "response.audio_transcript.delta":
                                message_dict = {
                                    "type": "transcript",
                                    "content": event.delta,
                                }
                                await websocket.send_text(json.dumps(message_dict))
                            
                            elif event.type == "conversation.item.input_audio_transcription.completed":
                                    print("response -- add to dictionary")
                                    print(event)
                                    # conversation.append({"user": content[0]["transcript"]})
                                    # print(conversation)
        
                            elif event.type == "response.audio.delta":
                                print(event.item_id, event.response_id)
                                print("Received audio delta from OpenAI")
                                audio_bytes = base64.b64decode(event.delta)
                                wav_audio = convert_pcm16_to_wav(audio_bytes)
                                await websocket.send_bytes(wav_audio)
                                # wav_audio_base64 = base64.b64encode(wav_audio).decode("utf-8")
                                # audio_message_dict = {
                                #     "type": "response_audio",
                                #     "content": {
                                #         "reset_audio_buffer": not (past_response_id == event.response_id),
                                #         "wav_audio_base64": wav_audio_base64,
                                #     },
                                # }
                                # past_response_id = event.response_id
                                # print(audio_message_dict["content"]["reset_audio_buffer"])
                                # await websocket.send_text(json.dumps(audio_message_dict))
                                
                            elif event.type == "response.text.done":
                                print("Text response done")
                            elif event.type == "response.created":
                                if not past_response_id:
                                    past_response_id = event.response.id
                                print("response created", event.response.id)
    
                            elif event.type == "response.function_call_arguments.done":
                                # check tool whether generate image or stop image
                                image_task: asyncio.Task
                                if list(json.loads(event.arguments).keys())[0] == "user_question":
                                    # await connection.session.update(
                                    #     session={
                                    #         "instructions": "You are an English assistant to respond if user asks stop image generation or you ask about your palm",
                                    #         "tools": [stop_generate_image_based_on_the_prompt_tool],
                                    #     }
                                    # )
                                    await websocket.send_text(json.dumps({"type": "currently_image_generating", "content": "please wait"}))
                                    if user_info and extracted_palm_details.status == ExtractStatus.PALM_DETECTED:
                                        arguments = json.loads(event.arguments)
                                        image_task = asyncio.create_task(handle_generate_image_event(arguments))

                                else:
                                    await connection.session.update(
                                        session={
                                            "instructions": get_palm_astro_prompt(extracted_palm_details.description, user_info["name"], palmist_name=PALMIST_NAME),
                                            "tools": [generate_image_based_on_the_prompt_tool],
                                        }
                                    )
                                    image_task.cancel()  # Cancel the task
                                    try:
                                        await image_task  # Wait for the task to handle the cancellation
                                    except asyncio.CancelledError:
                                        print("Task cancellation acknowledged.")
                                    await websocket.send_text(json.dumps({"type": "image_cancelled", "content": "image generation stopped"}))

                            elif event.type == "response.done":
                                print("Conversation response done")
                                break

                            elif event.type == "session.updated":
                                print(event)

                            else:
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
                        "instructions": WELCOME_PROMPT.format(palmist_name=PALMIST_NAME),
                        "modalities": ["text", "audio"],
                        "output_audio_format": "pcm16",
                        "input_audio_format": "pcm16",
                        "turn_detection": None,
                        "voice": "coral",
                        }
                    )
                    await connection.response.create()

                elif message["type"] == "user_details":
                    user_info = message["content"]
                    print(f"Received user info: {user_info}")
                    print(user_info['name'])
                
                    await connection.session.update(
                        session={
                            "instructions": PHOTO_CAPTURE_PROMPT.format(palmist_name=PALMIST_NAME, user_name=user_info["name"]),
                        }
                    )
                    await connection.response.create()
                elif message["type"] == "palm_image":
                    image_content: str = message["content"]
                    extracted_palm_details = get_palm_details(image_content["imageURL"])
                    print(f"Extracted palm details: {extracted_palm_details}")
                    message_dict = {
                        "type": "palm_detected_status",
                        "content": {
                            "status": extracted_palm_details.status,
                            "description": extracted_palm_details.description,
                            "image": image_content["imageURL"].strip('"')
                        },
                    }
                    await websocket.send_text(json.dumps(message_dict))
                    print(f"status: {extracted_palm_details.status}")
                    if extracted_palm_details.status == ExtractStatus.PALM_DETECTED:
                        await connection.session.update(
                            session={
                                "instructions": get_palm_astro_prompt(extracted_palm_details.description, user_info["name"], user_info["gender"], palmist_name=PALMIST_NAME),
                                "voice": "coral",
                            }
                        )
                        await connection.response.create()
                    else:
                        await connection.session.update(
                            session={
                                "instructions": PHOTO_RE_CAPTURE_PROMPT.format(palmist_name=PALMIST_NAME, user_name=user_info["name"]),
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
                    # end_time = time.time()
                    # total_spent_time = end_time - start_time
                    # with open('log.csv', mode='a', newline='') as file:
                    #     writer = csv.writer(file)
                    #     if file.tell() == 0:
                    #         writer.writerow(["Name", "Time (seconds)"])
                    # writer.writerow([user_info["name"], str(total_spent_time)])
                    # await connection.session.update(
                    #         session={
                    #             "instructions": get_palm_astro_prompt(extracted_palm_details.description, user_info["name"], user_info["gender"], palmist_name=PALMIST_NAME),
                    #             "voice": "coral",
                    #         }
                    #     )
                    # await connection.response.create()
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