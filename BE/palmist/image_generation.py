# imports
from openai import OpenAI  # OpenAI Python library to make API calls
import requests  # used to download images
import os  # used to access filepaths
from PIL import Image  # used to print and edit images
from prompts import prompt_to_generate_image_template

# initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", "<your OpenAI API key if not set as env var>"))

def generate_image_based_on_the_prompt(prompt:str, palm_features: str, gender: str):
    generation_response = client.images.generate(
        model = "dall-e-3",
        prompt= prompt_to_generate_image_template(prompt, palm_features, gender),
        n=1,
        size="1024x1024",
        response_format="b64_json",
    )
    generated_image_url = generation_response.data[0].b64_json  # extract image URL from response
    return generated_image_url
