import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai

app = Flask(__name__, static_folder='.')
CORS(app)

API_KEY = os.environ.get("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY environment variable is required")
genai.configure(api_key=API_KEY)

def open_youtube(query: str):
    """Opens YouTube and searches for a specific song or video."""
    return {"status": "requesting_youtube_search", "query": query}

def search_web(query: str):
    """Searches Google for real-time information."""
    return {"status": "requesting_google_search", "query": query}

def open_terminal():
    """Opens the local system terminal environment."""
    return {"status": "opening_terminal"}

model = genai.GenerativeModel(
    model_name='gemini-2.0-flash',
    tools=[open_youtube, search_web, open_terminal],
    system_instruction="""You are Aura, an elite AI Automation Agent. Use tools when appropriate."""
)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message')
    history = data.get('history', [])
    
    try:
        gemini_history = [
            {"role": "user" if h["role"] == "user" else "model", "parts": [{"text": h["content"]}]}
            for h in history
        ]
        
        chat_session = model.start_chat(history=gemini_history, enable_automatic_function_calling=True)
        response = chat_session.send_message(message)
        
        directives = []
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'function_call') and part.function_call:
                directives.append({"name": part.function_call.name, "args": dict(part.function_call.args)})
        
        return jsonify({"text": response.text, "directives": directives})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
