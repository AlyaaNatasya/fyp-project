from flask import Flask, request, jsonify
from transformers import pipeline
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from your Node.js frontend

# Path to your saved model
MODEL_DIR = "../models/studybloom_model"

# Load the summarization pipeline
print("🚀 Loading your StudyBloom AI model...")
try:
    summarizer = pipeline(
        "summarization",
        model=MODEL_DIR,
        tokenizer=MODEL_DIR,
        max_length=150,
        min_length=30,
        truncation=True,
        device=-1  # Use -1 for CPU, 0 for GPU (if you have PyTorch with CUDA)
    )
    print("✅ Model loaded successfully!")
except Exception as e:
    print("❌ Error loading model:", str(e))
    exit(1)

@app.route("/summarize", methods=["POST"])
def summarize():
    data = request.get_json()
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        result = summarizer(text)
        summary = result[0]["summary_text"]
        return jsonify({"summary": summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)