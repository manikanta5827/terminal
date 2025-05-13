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

  useEffect(() => {
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
      socketRef.current = io('/', {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        forceNew: true,
        path: '/socket.io/',
        upgrade: true,
        rememberUpgrade: true,
        rejectUnauthorized: false
      })

      socketRef.current.on('connect_error', (error) => {
        console.error('Connection error:', error)
        setIsConnected(false)
        if (term) {
          term.write('\r\n\x1b[31mConnection error. Attempting to reconnect...\x1b[0m\r\n')
        }
      })

      socketRef.current.on('connect', () => {
        console.log('Connected to server')
        setIsConnected(true)
        if (term) {
          term.write('\r\n\x1b[32mConnected to server.\x1b[0m\r\n')
          fitAddon.fit()
          const { rows, cols } = term
          socketRef.current.emit('resize', { rows, cols })
        }
      })

      socketRef.current.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason)
        setIsConnected(false)
        if (term) {
          term.write('\r\n\x1b[33mDisconnected from server. Reason: ' + reason + '\x1b[0m\r\n')
        }
      })

      socketRef.current.on('reconnect_attempt', (attemptNumber) => {
        console.log('Reconnection attempt:', attemptNumber)
        if (term) {
          term.write('\r\n\x1b[33mAttempting to reconnect... (Attempt ' + attemptNumber + ')\x1b[0m\r\n')
        }
      })

      socketRef.current.on('reconnect', (attemptNumber) => {
        console.log('Reconnected after', attemptNumber, 'attempts')
        if (term) {
          term.write('\r\n\x1b[32mReconnected to server.\x1b[0m\r\n')
        }
      })

      socketRef.current.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error)
        if (term) {
          term.write('\r\n\x1b[31mReconnection error: ' + error.message + '\x1b[0m\r\n')
        }
      })

      socketRef.current.on('reconnect_failed', () => {
        console.error('Failed to reconnect')
        if (term) {
          term.write('\r\n\x1b[31mFailed to reconnect to server.\x1b[0m\r\n')
        }
      })

      socketRef.current.on('upgrade', (transport) => {
        console.log('Transport upgraded to:', transport.name)
        if (term) {
          term.write('\r\n\x1b[36mTransport upgraded to: ' + transport.name + '\x1b[0m\r\n')
        }
      })

      socketRef.current.on('upgradeError', (error) => {
        console.error('Transport upgrade error:', error)
        if (term) {
          term.write('\r\n\x1b[31mTransport upgrade failed: ' + error.message + '\x1b[0m\r\n')
        }
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
      if (term) {
        term.dispose()
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-4 text-sm font-medium">Web Bash Terminal</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
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
