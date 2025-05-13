const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);

// Configure socket.io with more resilient settings
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowUpgrades: true,
  perMessageDeflate: false,
  maxHttpBufferSize: 1e8,
  path: '/socket.io/',
  serveClient: false,
  cookie: false,
  allowEIO3: true,
  transports: ['polling', 'websocket']
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

// Track active connections and their pty processes
const connections = new Map();

io.on('connection', (socket) => {
  console.log(`Client connected. Socket ID: ${socket.id}`);
  
  let ptyProcess = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;

  const initializePty = () => {
    try {
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        }
      });

      ptyProcess.on('data', (data) => {
        if (socket.connected) {
          try {
            socket.emit('output', data);
          } catch (error) {
            console.error('Error emitting output:', error);
          }
        }
      });

      ptyProcess.on('exit', (code) => {
        console.log(`PTY process exited with code ${code}`);
        if (socket.connected) {
          try {
            socket.emit('output', '\r\n\x1b[31mSession terminated.\x1b[0m\r\n');
          } catch (error) {
            console.error('Error emitting termination message:', error);
          }
        }
      });

      connections.set(socket.id, ptyProcess);
      return true;
    } catch (error) {
      console.error('Failed to initialize PTY:', error);
      return false;
    }
  };

  // Initialize PTY process
  if (!initializePty()) {
    socket.disconnect(true);
    return;
  }

  // Handle transport upgrade
  socket.on('upgrade', (transport) => {
    console.log(`Transport upgraded to ${transport.name}`);
  });

  socket.on('input', (data) => {
    if (ptyProcess) {
      try {
        ptyProcess.write(data);
      } catch (error) {
        console.error('Error writing to PTY:', error);
      }
    }
  });

  socket.on('resize', ({ cols, rows }) => {
    if (ptyProcess) {
      try {
        ptyProcess.resize(cols, rows);
      } catch (error) {
        console.error('Error resizing PTY:', error);
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected. Reason: ${reason}`);
    if (ptyProcess) {
      try {
        ptyProcess.kill();
      } catch (error) {
        console.error('Error killing PTY process:', error);
      }
      connections.delete(socket.id);
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      socket.connect();
    } else {
      console.log('Max reconnection attempts reached');
      socket.disconnect(true);
    }
  });

  // Handle reconnection
  socket.on('reconnect_attempt', () => {
    console.log('Reconnection attempt...');
  });

  socket.on('reconnect', () => {
    console.log('Reconnected successfully');
    reconnectAttempts = 0;
  });

  // Handle transport errors
  socket.conn.on('error', (error) => {
    console.error('Transport error:', error);
    if (error.code === 'ECONNRESET') {
      console.log('Connection reset, attempting to reconnect...');
      socket.connect();
    }
  });
});

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  connections.forEach((ptyProcess) => {
    try {
      ptyProcess.kill();
    } catch (error) {
      console.error('Error killing PTY process during shutdown:', error);
    }
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ Terminal server running at http://localhost:${PORT}`);
  console.log('📡 Health check endpoint available at /health');
});
