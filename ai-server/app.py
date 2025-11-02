from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from your Node.js frontend

# This server can still be used for other AI-related endpoints if needed
# For now, it provides a simple health check endpoint

@app.route("/", methods=["GET"])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({"status": "AI server is running", "message": "Ready to process requests"})


@app.route("/summarize", methods=["POST"])
def summarize():
    """
    Handle both PDF upload and text JSON requests and return summary
    """
    try:
        # Since we're now using the DeepSeek API directly from the backend,
        # this server is no longer used for summarization. 
        # This endpoint is maintained for compatibility if needed.
        return jsonify({
            "error": "This server no longer handles summarization. Please configure your backend to use the DeepSeek API directly."
        }), 400

    except Exception as e:
        print(f"Error in summarize endpoint: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(port=5000, debug=True)