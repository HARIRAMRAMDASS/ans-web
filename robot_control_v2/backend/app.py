from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Enable CORS for all routes (CRITICAL for frontend to connect)
CORS(app)

@app.route('/start', methods=['POST'])
def start_robot():
    print(">>> Robot START command received")
    return jsonify({ "status": "started" })

@app.route('/stop', methods=['POST'])
def stop_robot():
    print(">>> Robot STOP command received")
    return jsonify({ "status": "stopped" })

if __name__ == '__main__':
    # Run on all available network interfaces at port 5000
    print("Robot Backend Control Server starting on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=True)
