from dotenv import load_dotenv

load_dotenv()

import base64

from openai import AsyncOpenAI
from fastapi import FastAPI, WebSocket

client = AsyncOpenAI()
app = FastAPI()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        async with client.beta.realtime.connect(
            model="gpt-4o-mini-realtime-preview"
        ) as connection:
            await connection.session.update(
                session={
                    "instructions": "YOu are funny Assistant.",
                    "modalities": ["text", "audio"],
                    "output_audio_format": "pcm16",
                    "turn_detection": None,
                }
            )
            while True:
                data = await websocket.receive_text()
                message = eval(data)
                if message["type"] == "audio":
                    print("Received audio message")
                    # await websocket.send_text(
                    #     '{"type": "text", "content": "Audio received!"}'
                    # )   
                    # Respond with text
                    await connection.conversation.item.create(
                        item={
                            "type": "message",
                            "role": "user",
                            "content": [
                                {"type": "input_audio", "audio": message["content"]}
                            ],
                        }
                    )
                    await connection.response.create()
                    # await connection.input_audio_buffer.append(audio=message["content"])
                    # await connection.input_audio_buffer.commit()

                    async for event in connection:
                        if event.type == "response.text.delta":
                            print(event.delta, flush=True, end="")
                        if event.type == "response.audio.delta":
                            print("Recieved audio delta from openai")
                            await websocket.send_bytes(base64.b64decode(event.delta))

                        elif event.type == "response.text.done":
                            print()

                        elif event.type == "response.done":
                            break
                    # Respond with an image
                    # with open("example.png", "rb") as img:
                    #     img_base64 = base64.b64encode(img.read()).decode()
                    #     await websocket.send_text(
                    #         f'{{"type": "image", "content": "{img_base64}"}}'
                    #     )

    except Exception as e:
        raise e
    finally:
        await websocket.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
