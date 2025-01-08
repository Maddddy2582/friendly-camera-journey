from dotenv import load_dotenv

load_dotenv()


import asyncio
from openai import AsyncOpenAI

async def main():
    client = AsyncOpenAI()

    async with client.beta.realtime.connect(model="gpt-4o-mini-realtime-preview") as connection:
        await connection.session.update(session={"instructions": "YOu are funny Assistant.", 'modalities': ['text', 'audio'], 'turn_detection': None})

        await connection.conversation.item.create(
            item={
                "type": "message",
                "role": "user",
                "content": [{"type": "input_text", "text": "Say hello!"}],
            }
        )
        await connection.response.create()

        async for event in connection:
            if event.type == 'response.text.delta':
                print(event.delta, flush=True, end="")

            elif event.type == 'response.text.done':
                print()

            elif event.type == "response.done":
                break

# asyncio.run(main())

import base64
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse

app = FastAPI()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            message = eval(data)
            if message["type"] == "audio":
                print("Received audio message")
                audio_bytes = base64.b64decode(message["content"])
                print("Audio length:", len(audio_bytes))

                # Respond with text
                # await websocket.send_text('{"type": "text", "content": "Audio received!"}')

                # Respond with an image
                # with open("example.png", "rb") as img:
                #     img_base64 = base64.b64encode(img.read()).decode()
                #     await websocket.send_text(f'{{"type": "image", "content": "{img_base64}"}}')

                # Respond with audio (echo back the audio)
                await websocket.send_bytes(audio_bytes)

    except Exception as e:
        print("WebSocket closed:", e)
    finally:
        await websocket.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
