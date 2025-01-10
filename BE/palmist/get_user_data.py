import pandas as pd


def get_user_data(name: str, gender: str) -> tuple:
    # Read the data from the csv file and return name, age, designation
    data = pd.read_csv(
        "D:/friendly-camera-journey/BE/palmist/AI Team_Data.csv", encoding="ISO-8859-1"
    )
    data = data[data[" Name"] == name].to_dict(orient="records")[0]

    return (
        data[" Name"],
        gender,
        data["Age"],
        data["Exp in Soliton (Years)"],
        data["Current Designation"],
        data["Present City"],
    )
