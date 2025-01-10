# imports
from openai import OpenAI  # OpenAI Python library to make API calls
import requests  # used to download images
import os  # used to access filepaths
from PIL import Image  # used to print and edit images
from prompts import prompt_to_generate_image_template, create_user_query_to_generate_image_template
import openai

# initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", "<your OpenAI API key if not set as env var>"))

def generate_image_based_on_the_prompt(user_query:str, gender: str):
    prompt = create_user_query_to_generate_image_template()
    response = openai.chat.completions.create(
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
                        "text": f"user_query: {user_query}"
                        },
                    ]
                },
            ]
    )
    new_user_query = response.choices[0].message.content
    generation_response = client.images.generate(
        model = "dall-e-3",
        prompt= prompt_to_generate_image_template(new_user_query, gender),
        n=1,
        size="1024x1024",
        response_format="b64_json",
    )
    generated_image_url = generation_response.data[0].b64_json  # extract image URL from response
    return generated_image_url



async def generate_avatar(image_file: bytes):
    generation_response = client.images.edit(
        image=image_file,
        model = "dall-e-3",
        prompt="Modify into a South Indian Anime Character",
        n=1,
        size="1024x1024",
        response_format="b64_json",
    )
    generated_image_url = generation_response.data[0].b64_json  # extract image URL from response
    return generated_image_url
