import time
import requests
import RPi.GPIO as GPIO
import os
import serial
import math

try:
    from roboflow import Roboflow
except ImportError:
    print("roboflow package missing. Run: pip install roboflow")

# ================= Configuration =================
SERVER_URL = "http://192.168.1.100:5000"
POLL_INTERVAL = 2.0  # seconds

# Roboflow Config
ROBOFLOW_API_KEY = "YOUR_ROBOFLOW_API_KEY"
PROJECT_NAME = "your-project-name"
VERSION = 1

# Motor GPIO Pins (L298N)
IN1 = 17
IN2 = 27
IN3 = 22
IN4 = 23
ENA = 25
ENB = 24

# Setup Serial for GPS (NEO-6M typically uses /dev/ttyS0 or /dev/ttyAMA0)
try:
    gps_serial = serial.Serial('/dev/ttyS0', baudrate=9600, timeout=1)
except Exception as e:
    print(f"Failed to connect to GPS module: {e}")
    gps_serial = None

# Setup GPIO
try:
    GPIO.setmode(GPIO.BCM)
    GPIO.setup([IN1, IN2, IN3, IN4, ENA, ENB], GPIO.OUT)

    # PWM for speed control
    pwm_a = GPIO.PWM(ENA, 100)
    pwm_b = GPIO.PWM(ENB, 100)
    pwm_a.start(50) # 50% speed
    pwm_b.start(50)
except Exception as e:
    print("GPIO Setup failed:", e)

# Initialize Roboflow
try:
    rf = Roboflow(api_key=ROBOFLOW_API_KEY)
    project = rf.workspace().project(PROJECT_NAME)
    model = project.version(VERSION).model
except Exception as e:
    print("Roboflow setup failed:", e)
    model = None

def forward():
    GPIO.output(IN1, GPIO.HIGH)
    GPIO.output(IN2, GPIO.LOW)
    GPIO.output(IN3, GPIO.HIGH)
    GPIO.output(IN4, GPIO.LOW)

def left():
    GPIO.output(IN1, GPIO.LOW)
    GPIO.output(IN2, GPIO.HIGH)
    GPIO.output(IN3, GPIO.HIGH)
    GPIO.output(IN4, GPIO.LOW)

def right(): # Turn right
    GPIO.output(IN1, GPIO.HIGH)
    GPIO.output(IN2, GPIO.LOW)
    GPIO.output(IN3, GPIO.LOW)
    GPIO.output(IN4, GPIO.HIGH)

def stop():
    GPIO.output(IN1, GPIO.LOW)
    GPIO.output(IN2, GPIO.LOW)
    GPIO.output(IN3, GPIO.LOW)
    GPIO.output(IN4, GPIO.LOW)

def check_obstacle():
    os.system("libcamera-still -o frame.jpg -t 100 --nopreview")
    if model:
        try:
            prediction = model.predict("frame.jpg", confidence=40, overlap=30).json()
            for pred in prediction['predictions']:
                if pred['class'] == 'obstacle': 
                    return True
        except Exception as e:
            print(f"Vision error: {e}")
    return False

# Utility to parse NMEA sentences
def parse_gps(data):
    if data.startswith('$GPRMC'):
        parts = data.split(',')
        if len(parts) > 6 and parts[2] == 'A':  # Data is valid
            raw_lat = parts[3]
            lat_dir = parts[4]
            raw_lng = parts[5]
            lng_dir = parts[6]

            if not raw_lat or not raw_lng: return None
            
            lat = float(raw_lat[:2]) + float(raw_lat[2:]) / 60.0
            lng = float(raw_lng[:3]) + float(raw_lng[3:]) / 60.0
            
            if lat_dir == 'S': lat = -lat
            if lng_dir == 'W': lng = -lng
            
            return lat, lng
    return None

def get_current_gps():
    # If no real GPS, we can fallback to mock or last known
    # Just for demo purposes we will return a mock if gps_serial is none
    if not gps_serial:
        return 9.9252, 78.1198

    while True:
        try:
            line = gps_serial.readline().decode('utf-8', errors='ignore').strip()
            res = parse_gps(line)
            if res: return res
        except:
            pass

def calculate_distance(lat1, lon1, lat2, lon2):
    # Haversine formula to find distance between two lat/lngs in meters
    R = 6371e3
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi/2) * math.sin(delta_phi/2) + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda/2) * math.sin(delta_lambda/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c

def report_status(lat, lng, status, move_state=None):
    payload = {"lat": lat, "lng": lng}
    print(f"Reporting: Lat={lat:.5f}, Lng={lng:.5f}, Status={status}")
    try:
        requests.post(f"{SERVER_URL}/robot-location", json=payload, timeout=2)
        status_payload = {"status": status}
        if move_state is not None:
            status_payload["move"] = move_state
        requests.post(f"{SERVER_URL}/robot-status", json=status_payload, timeout=2)
    except Exception as e:
        print("Failed to report status:", e)

def navigate_path(path):
    print(f"Starting navigation with {len(path)} waypoints")
    for idx, point in enumerate(path):
        target_lat = point['lat']
        target_lng = point['lng']
        
        while True:
            current_lat, current_lng = get_current_gps()
            
            if check_obstacle():
                print("Obstacle detected! Stopping motors.")
                stop()
                report_status(current_lat, current_lng, "Obstacle detected", False)
                return 
            
            distance = calculate_distance(current_lat, current_lng, target_lat, target_lng)
            
            # If within 2 meters of the waypoint, move to next
            if distance < 2.0:
                print(f"Reached waypoint {idx+1}/{len(path)}")
                stop()
                break
            
            # Simple navigation mock (in reality needs compass heading)
            print(f"Moving towards {target_lat}, {target_lng}. Distance: {distance:.2f}m")
            forward()
            
            report_status(current_lat, current_lng, "Moving")
            time.sleep(1.0)
            
    print("Destination reached.")
    stop()
    report_status(target_lat, target_lng, "Destination reached", False)

def main():
    print("Robot GPS Client Started. Polling server...")
    # Initial status update
    lat, lng = get_current_gps()
    report_status(lat, lng, "Idle", False)

    try:
        while True:
            try:
                response = requests.get(f"{SERVER_URL}/robot-command", timeout=2)
                if response.status_code == 200:
                    data = response.json()
                    move = data.get("move", False)
                    path = data.get("path", [])
                    
                    if move and len(path) > 0:
                        navigate_path(path)
                        
            except requests.ConnectionError:
                pass
            except Exception as e:
                print("Error polling server:", e)
                
            time.sleep(POLL_INTERVAL)
            
    except KeyboardInterrupt:
        print("\nStopping robot...")
    finally:
        try:
            stop()
            if 'pwm_a' in globals(): pwm_a.stop()
            if 'pwm_b' in globals(): pwm_b.stop()
            GPIO.cleanup()
        except:
            pass

if __name__ == "__main__":
    main()
