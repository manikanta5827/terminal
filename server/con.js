const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Home page endpoint
app.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

// Track active connections
let activeConnections = 0;

io.on('connection', (socket) => {
  activeConnections++;
  console.log(`Client connected. Active connections: ${activeConnections}`);

  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  });

  ptyProcess.on('data', (data) => {
    socket.emit('output', data);
  });

  socket.on('input', (data) => {
    ptyProcess.write(data);
  });

  socket.on('resize', ({ cols, rows }) => {
    ptyProcess.resize(cols, rows);
  });

  socket.on('disconnect', () => {
    activeConnections--;
    console.log(`Client disconnected. Active connections: ${activeConnections}`);
    ptyProcess.kill();
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ Terminal server running at http://localhost:${PORT}`);
  console.log('📡 Health check endpoint available at /health');
});
