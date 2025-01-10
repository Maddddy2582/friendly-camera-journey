import base64
import openai
from pydantic import BaseModel, Field
from prompts import EXTRACT_PROMPT    
import enum


class ExtractStatus(str, enum.Enum):
    PALM_DETECTED = "Palm detected"
    NO_PALM_DETECTED = "No Palm detected"

class ExtractStatusFace(str, enum.Enum):
    FACE_DETECTED = "Face detected"
    NO_FACE_DETECTED = "No Face detected"


class ExtractEvent(BaseModel):
        status: ExtractStatus = Field(description="The status of the extraction")
        description: str = Field(description="The extracted details from the palm image")

class ExtractEventFace(BaseModel):
        status: ExtractStatusFace = Field(description="The status of the extraction")
        description: str = Field(description="The extracted details from the face image")

def get_palm_details(base64_image: str, prompt: str, name: str):
    # with open(image_file, "rb") as image_file:
    # with open("received_image.png", "wb") as file:                         
    #      file.write(base64.b64decode(image_binary))
    # with open("sample.txt", "w") as file:
    #     file.write(base64.b64decode(base64_image, validate=True))
    response_format = None
    if name  == "face":
         response_format = ExtractEventFace
    else:
         response_format = ExtractEvent
    response = openai.beta.chat.completions.parse(
        model="gpt-4o",
        messages= [
            {
                "role": "system",
                "content": [
                    {
                    "type": "text",
                    "text": prompt
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                    "type": "text",
                    "text": ""
                    },
                    {
                    "type": "image_url",
                    "image_url": {
                        # "url": f"data:image/jpeg;base64,{base64.b64encode(image_file.read()).decode()}"
                        "url": base64_image.strip('"')
                    }
                    }
                ]
            },
        ],
        response_format=response_format
    )
    return response_format.model_validate_json(response.choices[0].message.content)

if __name__ == "__main__":
    with open("palm_images/face.jpeg", "rb") as image_file:
        print(get_palm_details(base64.b64encode(image_file.read())))