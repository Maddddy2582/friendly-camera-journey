import os
import logging

logging.basicConfig(filename="app_user.log", level="INFO")
logger = logging.getLogger(__name__)
import pandas as pd

from pathlib import Path

csv_file_path = os.path.join(Path(__file__).parent, "AI Team_Data.csv")
print(csv_file_path)

def get_user_data(name: str, gender: str) -> tuple:
    # Read the data from the csv file and return name, age, designation
    data = pd.read_csv(
        csv_file_path,
        encoding="ISO-8859-1",
    )
    data = data[data[" Name"] == name]
    try:
        logger.info(str(data))
    except Exception:
        print("Something went wrong in logging")
    if data.empty:
        return (name, gender, None, None, None, None)

    data = data.to_dict(orient="records")[0]
    return (
        name,
        gender,
        data.get("Age", 30),
        data.get("Exp in Soliton (Years)", 7),
        data.get("Current Designation", "Software Engineer"),
        data.get("Present City", "Bangalore"),
    )
