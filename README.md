# ♿ AccessApp — Inclusive Communication & Assistance Platform

A voice-first, fully adaptive web application for users who are blind, deaf, mute,
or any combination. The app detects capabilities (`canSee`, `canHear`, `canSpeak`)
and dynamically reconfigures its entire UI, interaction modes, and feedback channels.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Modern browser (Chrome recommended for full Web Speech API support)

### 1. Install & Run Backend
```bash
cd backend
npm install
cp .env .env.local   # edit MONGODB_URI and JWT_SECRET
npm run dev          # starts on http://localhost:5000
```

### 2. Open the App
Visit **http://localhost:5000** in your browser.
The frontend is served directly by the Express backend.

---

## 📁 Project Structure

```
accessapp/
├── backend/
│   ├── server.js              # Express + Socket.io entry point
│   ├── .env                   # Environment variables
│   ├── models/
│   │   ├── User.js            # User with abilities (canSee/canHear/canSpeak)
│   │   ├── SOS.js             # Emergency alert logs
│   │   └── Message.js         # Real-time messages
│   ├── routes/
│   │   ├── auth.js            # POST /register, POST /login, GET /me
│   │   ├── sos.js             # POST /sos, GET /sos
│   │   ├── bus.js             # GET /bus/location (simulated live tracking)
│   │   ├── ocr.js             # POST /ocr (image upload)
│   │   └── messages.js        # GET/POST /messages
│   └── middleware/
│       └── auth.js            # JWT verification middleware
│
└── frontend/
    ├── index.html             # Single-page app — all views
    ├── css/
    │   └── main.css           # Full adaptive CSS + disability mode overrides
    └── js/
        ├── app.js             # Entry point: routing, onboarding, auth
        ├── modules/
        │   ├── capabilityStore.js   # Central state (canSee/canHear/canSpeak)
        │   ├── voiceAssistant.js    # Web Speech API: TTS + STT
        │   ├── hapticEngine.js      # Vibration API: all patterns
        │   ├── adaptiveUI.js        # Auto-configures UI from abilities
        │   ├── sos.js               # SOS trigger: button/voice/gesture
        │   ├── navigation.js        # Leaflet maps + voice/vibration guidance
        │   ├── busTracker.js        # Real-time bus with Socket.io
        │   └── ocrScanner.js        # Tesseract.js image-to-text
        └── ml/
            ├── gestureDetector.js   # MediaPipe Hands gesture recognition
            └── objectDetector.js    # TensorFlow COCO-SSD obstacle detection
```

---

## 🧠 Adaptive Mode Logic

| Abilities           | Mode Applied                                  |
|---------------------|-----------------------------------------------|
| !canSee             | Voice-driven UI, audio feedback, vibration    |
| !canHear            | Visual alerts, high contrast, text-only       |
| !canSpeak           | Text input, TTS output, no mic button         |
| !canSee + !canHear  | Deaf-blind: vibration patterns + gestures     |
| !canSee + !canSpeak | Audio guidance + touch input                  |
| !canHear + !canSpeak| Full visual + text UI                         |
| All false           | Tactile-only: vibration + gesture input       |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| POST   | /api/auth/register   | Register with abilities profile|
| POST   | /api/auth/login      | Login, returns JWT token       |
| GET    | /api/auth/me         | Get current user (auth req'd)  |
| PUT    | /api/auth/abilities  | Update ability flags           |

### SOS
| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| POST   | /api/sos             | Trigger SOS with location      |
| GET    | /api/sos             | List all active SOS alerts     |
| PUT    | /api/sos/:id/resolve | Resolve an SOS alert           |

### Bus
| Method | Endpoint                  | Description                |
|--------|---------------------------|----------------------------|
| GET    | /api/bus/location         | All bus locations          |
| GET    | /api/bus/location/:busId  | Specific bus               |
| POST   | /api/bus/update           | Driver updates location    |

### OCR
| Method | Endpoint     | Description                |
|--------|--------------|----------------------------|
| POST   | /api/ocr     | Upload image (multipart)   |

### Messages
| Method | Endpoint         | Description              |
|--------|------------------|--------------------------|
| GET    | /api/messages    | Get last 50 messages     |
| POST   | /api/messages    | Save a message           |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action        |
|----------|---------------|
| Alt + H  | Dashboard     |
| Alt + N  | Navigation    |
| Alt + B  | Bus Tracker   |
| Alt + O  | OCR Scanner   |
| Alt + S  | SOS Emergency |
| Alt + M  | Toggle Mic    |

---

## 🛠️ Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | Vanilla JS (ES6 modules), HTML5, CSS3   |
| Backend  | Node.js, Express.js                     |
| Database | MongoDB + Mongoose                      |
| Realtime | Socket.io                               |
| Maps     | Leaflet.js + OpenStreetMap              |
| ML/AI    | TensorFlow.js COCO-SSD, MediaPipe Hands |
| OCR      | Tesseract.js                            |
| Speech   | Web Speech API (built-in browser)       |
| Haptics  | Vibration API (built-in browser)        |

---

## 📱 Browser Support

| Feature          | Chrome | Firefox | Safari | Edge |
|------------------|--------|---------|--------|------|
| Speech (TTS/STT) | ✅      | ⚠️ partial | ✅  | ✅   |
| Vibration API    | ✅ (Android) | ✅   | ❌     | ✅   |
| Camera/MediaPipe | ✅      | ✅       | ✅     | ✅   |

> **Recommended**: Chrome on Android for full feature support including vibration.

---

## 🧪 Testing with Postman

Import the following base URL: `http://localhost:5000`

**Register a blind user:**
```json
POST /api/auth/register
{
  "name": "Arjun K",
  "email": "arjun@test.com",
  "password": "test123",
  "abilities": { "canSee": false, "canHear": true, "canSpeak": true }
}
```

**Trigger SOS:**
```json
POST /api/sos
{
  "userName": "Arjun K",
  "location": { "lat": 12.9716, "lng": 80.2209 },
  "triggerMethod": "voice"
}
```

**Get all buses:**
```
GET /api/bus/location
```
