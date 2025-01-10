import pandas as pd


def get_user_data(name: str, gender: str) -> tuple:
    # Read the data from the csv file and return name, age, designation
    data = pd.read_csv(
        "C:/sanjeev/friendly-camera-journey/BE/palmist/AI Team_Data.csv",
        encoding="ISO-8859-1",
    )
    data = data[data[" Name"] == name]
    if data.empty:
        return (name, gender, None, None, None, None)

    data = data.to_dict(orient="records")[0]
    return (
        name,
        gender,
        data.get("Age", None),
        data.get("Exp in Soliton (Years)", None),
        data.get("Current Designation", None),
        data.get("Present City", None),
    )
