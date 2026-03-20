# 🤖 Robot Control System (Full-Stack)

This project provides a simple way to control a Raspberry Pi robot from any browser using a secure ngrok tunnel.

## 📁 System Architecture
- **Backend**: Python Flask server running on the Raspberry Pi (Port 5000).
- **Frontend**: HTML/JS dashboard accessible from any browser.
- **Tunneling**: `ngrok` exposes the local server to the public URL:
  `https://nonportentous-kellen-noncoherently.ngrok-free.dev`

---

## ⚡ Setup & Run Instructions

### 1️⃣ On Raspberry Pi (Backend)
1. **Install Requirements**:
   ```bash
   pip install flask flask-cors
   ```

2. **Run the Flask Server**:
   ```bash
   python app.py
   ```

3. **Start the ngrok Tunnel** (in a new terminal):
   ```bash
   ngrok http 5000 --domain=nonportentous-kellen-noncoherently.ngrok-free.dev
   ```

### 2️⃣ On your Browser (Frontend)
1. Open `index.html` in any web browser.
2. Click **START ROBOT** or **STOP ROBOT**.
3. You should see a success alert and the browser console will log the status.

---

## 🛠 Troubleshooting Guide

| Issue | Check |
| :--- | :--- |
| **"Cannot connect to Raspberry Pi"** | Is `ngrok` running and shows "online"? |
| **Alert pops up but no log** | Open Browser Console (F12) to see specific network errors. |
| **Flask shows 404** | Ensure you are calling `POST /start` and `POST /stop` (not GET). |
| **CORS Error** | Ensure `CORS(app)` is in `app.py`. |
| **Timeout Error** | Ensure the Raspberry Pi is connected to the internet. |

---

## ⚠️ Important Note
**NEVER** change the `SERVER_URL` to localhost if you want to control the robot from a different network. Always use the provided ngrok URL.
