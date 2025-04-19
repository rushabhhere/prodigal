import streamlit as st
import json
import re
from google import genai
import os

# Initialize the GenAI client
client = genai.Client(api_key=os.getenv("GEMINI_KEY"))

# List of profane words for regex-based detection
profane_words = [
    "BS",
    "crap",
    "fuck",
    "dead",
    "joke",
    "idiots",
    "goddamn",
    "screwed",
    "ass",
    "jerking",
    "sick",
    "damn",
    "shit",
    "idiot",
    "bullshit",
    "hell",
    "pissing",
    "shove",
    "stupid",
    "assholes",
    "fucking",
    "screw",
    "freaking",
    "shitload",
    "dumbass",
]


# Function for regex-based profanity detection
def check_profanity_regex(conversation):
    pattern = r"\b(?:" + "|".join(re.escape(word) for word in profane_words) + r")\b"
    for message in conversation:
        if re.search(pattern, message["text"], re.IGNORECASE):
            return True
    return False


# Function for GenAI-based profanity detection
def check_profanity_genai(conversation):
    prompt = f"""
    You are a helpful assistant. Your task is to determine if the following conversation contains any profane language.
    Respond with "True" if profanity is detected, otherwise respond with "False".

    Conversation:
    {conversation}
    """
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    return response.text.strip().lower() == "true"


# Function for GenAI-based privacy compliance violation detection
def check_privacy_compliance(conversation):
    prompt = f"""
    You are a compliance assistant. Your task is to determine if the following conversation violates privacy compliance.
    Flag the conversation if sensitive information (e.g., balance or account details) is shared before verifying one of the following:
    - date of birth
    - SSN
    - address

    Respond with "True" if a violation is detected, otherwise respond with "False".

    Conversation:
    {conversation}
    """
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    return response.text.strip().lower() == "true"


# Streamlit UI
st.title("Conversation Analysis App")
st.write(
    "Upload a JSON file or paste JSON content to analyze for profanity and privacy compliance violations."
)

# Input options
input_option = st.radio(
    "Choose input method:", ["Upload JSON File", "Paste JSON Content"]
)

if input_option == "Upload JSON File":
    uploaded_file = st.file_uploader("Upload JSON File", type="json")
    if uploaded_file:
        conversation = json.load(uploaded_file)
elif input_option == "Paste JSON Content":
    json_content = st.text_area("Paste JSON Content")
    if json_content:
        try:
            conversation = json.loads(json_content)
        except json.JSONDecodeError:
            st.error("Invalid JSON content. Please check your input.")

if "conversation" in locals():
    st.write("### Conversation Preview")
    st.json(conversation)

    # Profanity Detection
    st.write("## Profanity Detection")
    regex_result = check_profanity_regex(conversation)
    genai_result = check_profanity_genai(conversation)

    st.write("### Regex-Based Detection")
    st.write("Profanity Detected:" if regex_result else "No Profanity Detected.")

    st.write("### GenAI-Based Detection")
    st.write("Profanity Detected:" if genai_result else "No Profanity Detected.")

    # Privacy Compliance Violation Detection
    st.write("## Privacy Compliance Violation Detection")
    compliance_result = check_privacy_compliance(conversation)
    st.write(
        "Privacy Compliance Violation Detected:"
        if compliance_result
        else "No Privacy Compliance Violation Detected."
    )
