from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Allow all origins by default for testing

@app.route('/hello', methods=['GET'])
def hello():
    return jsonify({"message": "Hello from Flask with CORS!"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) # <--- Changed this line