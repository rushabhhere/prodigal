import streamlit as st
import json
import re
from google import genai
import os

# Initialize the GenAI client
try:
    client = genai.Client(api_key=os.getenv("GEMINI_KEY"))
except Exception as e:
    st.error(f"Error initializing GenAI client: {str(e)}")

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


# Function to get conversation data from user input
def get_conversation_data():
    input_option = st.radio(
        "Choose input method:", ["Upload JSON File", "Paste JSON Content"]
    )

    conversation = None
    if input_option == "Upload JSON File":
        uploaded_file = st.file_uploader("Upload JSON File", type="json")
        if uploaded_file:
            try:
                conversation = json.load(uploaded_file)
            except json.JSONDecodeError:
                st.error("Invalid JSON file. Please check your file format.")
    elif input_option == "Paste JSON Content":
        json_content = st.text_area("Paste JSON Content")
        if json_content:
            try:
                conversation = json.loads(json_content)
            except json.JSONDecodeError:
                st.error("Invalid JSON content. Please check your input.")

    return conversation


# Function for regex-based profanity detection
def check_profanity_regex(conversation):
    pattern = r"\b(?:" + "|".join(re.escape(word) for word in profane_words) + r")\b"
    agent_profanity = False
    customer_profanity = False

    for message in conversation:
        role = message.get("role", "").lower()
        text = message.get("text", "")

        if re.search(pattern, text, re.IGNORECASE):
            if role == "agent":
                agent_profanity = True
            else:  # Assume any non-agent role is a customer
                customer_profanity = True

    return {
        "agent_profanity": agent_profanity,
        "customer_profanity": customer_profanity,
    }


# Function for GenAI-based profanity detection
def check_profanity_genai(conversation):
    prompt = f"""
    You are a helpful assistant. Your task is to determine if the following conversation contains any profane language.

    Check if the agent uses profanity, and check if the customer uses profanity.
    
    Respond with a JSON object containing only two boolean values:
    {{
        "agent_profanity": true/false,
        "customer_profanity": true/false
    }}

    Strictly follow the JSON format and do not include any other text or explanation.

    Conversation:
    {conversation}
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        result = json.loads(response.text.strip())
        return result
    except Exception as e:
        st.error(f"Error with GenAI profanity detection: {str(e)}")
        return {"agent_profanity": False, "customer_profanity": False}


# Function for privacy compliance violation detection
def check_privacy_compliance(conversation):
    prompt = f"""
    You are a compliance assistant. Your task is to determine if the following conversation violates privacy compliance.
    
    Flag the conversation as a violation if the agent reveals sensitive information (e.g., balance or account details) 
    before verifying at least one of the following:
    - date of birth
    - SSN 
    - address
    
    Respond with only a single boolean value: true if a violation is detected, false otherwise.

    Strictly follow the instrcutions and only respond with the boolean value.
    Do not include any other text or explanation.
    
    Conversation:
    {conversation}
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        result = response.text.strip().lower() == "true"
        return result
    except Exception as e:
        st.error(f"Error with GenAI privacy compliance detection: {str(e)}")
        return False


# Main app function
def main():
    st.set_page_config(page_title="Conversation Analysis App")

    # Sidebar for navigation
    st.sidebar.title("Navigation")
    page = st.sidebar.radio(
        "Go to", ["Profanity Detection", "Privacy Compliance Check"]
    )

    if page == "Profanity Detection":
        st.title("Profanity Detection")

        conversation = get_conversation_data()

        if conversation:
            with st.expander("Show conversation JSON"):
                st.json(conversation)

            # Analysis options
            analysis_method = st.radio(
                "Choose analysis method:",
                ["Regex-Based Detection", "GenAI-Based Detection"],
            )

            if st.button("Analyze"):
                with st.spinner("Analyzing..."):
                    if analysis_method == "Regex-Based Detection":
                        results = check_profanity_regex(conversation)

                        st.subheader("Results")
                        st.write(
                            f"Agent Profanity Detected: {results['agent_profanity']}"
                        )
                        st.write(
                            f"Customer Profanity Detected: {results['customer_profanity']}"
                        )

                    else:  # GenAI-Based Detection
                        results = check_profanity_genai(conversation)

                        st.subheader("Results")
                        st.write(
                            f"Agent Profanity Detected: {results.get('agent_profanity', False)}"
                        )
                        st.write(
                            f"Customer Profanity Detected: {results.get('customer_profanity', False)}"
                        )

    elif page == "Privacy Compliance Check":
        st.title("Privacy Compliance Check")

        conversation = get_conversation_data()

        if conversation:
            with st.expander("Show conversation JSON"):
                st.json(conversation)

            if st.button("Check Compliance"):
                with st.spinner("Analyzing..."):
                    violation_detected = check_privacy_compliance(conversation)

                    st.subheader("Results")
                    st.write(
                        f"Privacy Compliance Violation Detected: {violation_detected}"
                    )


if __name__ == "__main__":
    main()
