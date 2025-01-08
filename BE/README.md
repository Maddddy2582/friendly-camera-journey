# Palm Read - AI Show - Soliton day

- The idea is to extract the info from the palm and based on the attributes, answer specifically to that person using LLM.
- There different Lines in our palm namely
  - Life Line
  - Head Line
  - Heart Line
  - Money Line
  - Career line
  - Line of Marriage
  - Child line
- These line comes with different attributes for different persons, like some people have head line straight, while some other have it bend towards down. Like this each one may have unique attributes with these lines.
- Palmistry is basically tells the characteristics, furture life ect, based on this attributes.
- We have referred [Palm reading](https://www.astroyogi.com/palmreading) this website to know about, what different attributes predicts.
- We made the prompt in such a way that, to the corresponding person with more positive and funny mode.

## How to run

- Install poetry

```text
poetry install
```

- run app

```text
poetry run streamlit run openai_realtime_streamlit\app.py
```
