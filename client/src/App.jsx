import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { io } from 'socket.io-client'
import 'xterm/css/xterm.css'

function App() {
  const terminalRef = useRef(null)
  const socketRef = useRef(null)
  const termRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [serverStatus, setServerStatus] = useState({ status: 'unknown', uptime: 0 })

  // Health check function
  const checkServerHealth = async () => {
    try {
      const response = await fetch('http://localhost:4000/health')
      const data = await response.json()
      setServerStatus(data)
    } catch (error) {
      console.error('Health check failed:', error)
      setServerStatus({ status: 'error', uptime: 0 })
    }
  }

  useEffect(() => {
    // Initial health check
    checkServerHealth()

    // Set up periodic health checks
    const healthCheckInterval = setInterval(checkServerHealth, 30000) // Check every 30 seconds

    let term = null
    let fitAddon = null

    const initializeTerminal = () => {
      term = new Terminal({
        cursorBlink: false,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1a1b26',
          foreground: '#a9b1d6',
          cursor: '#c0caf5',
          selection: '#28344a',
          black: '#414868',
          red: '#f7768e',
          green: '#9ece6a',
          yellow: '#e0af68',
          blue: '#7aa2f7',
          magenta: '#bb9af7',
          cyan: '#7dcfff',
          white: '#c0caf5',
          brightBlack: '#414868',
          brightRed: '#f7768e',
          brightGreen: '#9ece6a',
          brightYellow: '#e0af68',
          brightBlue: '#7aa2f7',
          brightMagenta: '#bb9af7',
          brightCyan: '#7dcfff',
          brightWhite: '#c0caf5'
        },
        rows: 24,
        cols: 80,
        convertEol: true,
        scrollback: 1000,
        rendererType: 'canvas',
        allowTransparency: true
      })

      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      termRef.current = term

      if (terminalRef.current) {
        term.open(terminalRef.current)
        fitAddon.fit()
      }
    }

    const initializeSocket = () => {
      socketRef.current = io('http://localhost:4000', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 10000
      })

      socketRef.current.on('output', (data) => {
        if (term) {
          term.write(data)
        }
      })

      if (term) {
        term.onData((data) => {
          if (socketRef.current?.connected) {
            socketRef.current.emit('input', data)
          }
        })
      }

      socketRef.current.on('connect', () => {
        console.log('Connected to server')
        setIsConnected(true)
        if (fitAddon) {
          fitAddon.fit()
          const { rows, cols } = term
          socketRef.current.emit('resize', { rows, cols })
        }
      })

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from server')
        setIsConnected(false)
      })
    }

    initializeTerminal()
    initializeSocket()

    const handleResize = () => {
      if (fitAddon && term) {
        fitAddon.fit()
        const { rows, cols } = term
        if (socketRef.current?.connected) {
          socketRef.current.emit('resize', { rows, cols })
        }
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      clearInterval(healthCheckInterval)
      if (term) {
        term.dispose()
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Format uptime
  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-4 text-sm font-medium">Web Terminal</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Server: {serverStatus.status === 'ok' ? '🟢' : '🔴'} {formatUptime(serverStatus.uptime)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700">
          <div 
            ref={terminalRef} 
            className="h-[calc(100vh-12rem)] w-full"
            style={{ minHeight: '400px' }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700">
        <div className="container mx-auto px-4 py-2">
          <p className="text-xs text-gray-400 text-center">
            Press Ctrl+C to clear the terminal • Ctrl+L to clear the screen
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App 