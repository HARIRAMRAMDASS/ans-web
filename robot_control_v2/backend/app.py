from flask import Flask, jsonify, Response
import cv2

from flask_cors import CORS

app = Flask(__name__)
# Enable CORS for all routes (CRITICAL for frontend to connect)
CORS(app)

# Existing camera/capture logic
camera = cv2.VideoCapture(0)

def capture_frame():
    success, frame = camera.read()
    if not success:
        return None
    return frame

def generate_frames():
    while True:
        frame = capture_frame()

        if frame is None:
            continue

        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


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
