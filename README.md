# Fake Product Review Detection System

An ML-powered application to detect fake product reviews.

## Manual Run Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- MongoDB (Optional - App runs in No-DB mode if missing)

### 1. Backend Setup

The backend is built with FastAPI and Python.

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (if not already created):
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate
     ```
   - **Unix/MacOS**:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Start the server:
   ```bash
   python run_backend.py
   ```
   The backend will start at `http://localhost:8002`.

### 2. Frontend Setup

The frontend is built with React.

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install --legacy-peer-deps
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   The application will open at `http://localhost:3000`.

### Troubleshooting

- **Database**: If you don't have MongoDB installed, the app automatically switches to "No-DB Mode" (In-Memory Storage). Data persists only while the backend server is running.
- **Port Conflicts**: If port 3000 or 8000 is in use, verify no other processes are running or kill them using `taskkill /F /IM python.exe` (Windows) or `pkill python` (Unix).
