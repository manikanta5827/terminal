# Web Terminal

A web-based terminal application built with React, Node.js, and WebSocket.

## Project Structure

```
terminal/
├── client/           # React frontend
│   ├── src/         # Source files
│   ├── public/      # Static files
│   └── package.json # Frontend dependencies
└── server/          # Node.js backend
    ├── con.js       # Server implementation
    └── package.json # Backend dependencies
```

## Setup Instructions

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

The server will run on http://localhost:3000

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on http://localhost:5173

## Features

- Real-time terminal emulation
- WebSocket communication
- Responsive design
- Dark theme
- Terminal resizing support 