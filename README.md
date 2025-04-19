**Conversation Visualizer:** https://prodigal.vercel.app/
**Profanity and Compliance Violation App:** https://profanity.streamlit.app/

## Steps to setup streamlit app

1. Make venv

```bash
python3 -m venv venv
```

2. Activate venv

```bash
source venv/bin/activate
```

3. Install requirements

```bash
pip install -r requirements.txt
```

4. Add .env file with GEMINI_KEY

5. Run streamlit app

```bash
streamlit run app.py
```

## Steps to setup conversation visualizer

1. Change directory to `conversation-visualizer`

```bash
cd conversation-visualizer
```

2. Install dependencies

```bash
pnpm install
```

3. Run the app

```bash
pnpm dev
```
