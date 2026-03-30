"use client"

/**
 * socket-provider.tsx
 * ─────────────────────────────────────────────────────────────
 * React context that manages a single Socket.io connection for
 * the entire application.
 *
 * Usage:
 *  1. Wrap your root layout with <SocketProvider>.
 *  2. In any page / component:
 *       const { useEvent } = useSocket()
 *       useEvent("ROLES_CHANGED", () => fetchRoles())
 * ─────────────────────────────────────────────────────────────
 */

import * as React from "react"
import { io, Socket } from "socket.io-client"

// ── Types ──────────────────────────────────────────────────────
interface SocketContextValue {
  socket: Socket | null
  connected: boolean
  /** Subscribe to a named real-time event. Cleans up automatically. */
  useEvent: (event: string, handler: (...args: any[]) => void) => void
}

// ── Context ────────────────────────────────────────────────────
const SocketContext = React.createContext<SocketContextValue>({
  socket: null,
  connected: false,
  useEvent: () => {},
})

// ── Provider ───────────────────────────────────────────────────
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001"

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = React.useState<Socket | null>(null)
  const [connected, setConnected] = React.useState(false)

  React.useEffect(() => {
    // Create the socket connection once for the application lifetime
    const sock = io(WS_URL, {
      // Use websocket transport first; fall back to polling
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    })

    sock.on("connect", () => {
      setConnected(true)
      // Join the dashboard broadcast room immediately
      sock.emit("join:dashboard")
      console.log("[Socket] Connected:", sock.id)
    })

    sock.on("disconnect", (reason) => {
      setConnected(false)
      console.log("[Socket] Disconnected:", reason)
    })

    sock.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message)
    })

    setSocket(sock)

    // Cleanup: disconnect when the very last consumer unmounts (app close)
    return () => {
      sock.disconnect()
    }
  }, [])

  /**
   * Stable hook for subscribing to a Socket.io event.
   * Consumers pass a handler that gets refreshed via a ref so
   * the subscription itself is never stale.
   */
  const useEvent = React.useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const handlerRef = React.useRef(handler)
      // eslint-disable-next-line react-hooks/rules-of-hooks
      React.useEffect(() => {
        handlerRef.current = handler
      })

      // eslint-disable-next-line react-hooks/rules-of-hooks
      React.useEffect(() => {
        if (!socket) return
        const stable = (...args: any[]) => handlerRef.current(...args)
        socket.on(event, stable)
        return () => {
          socket.off(event, stable)
        }
      }, [socket, event])
    },
    [socket]
  )

  return (
    <SocketContext.Provider value={{ socket, connected, useEvent }}>
      {children}
    </SocketContext.Provider>
  )
}

// ── Consumer hook ──────────────────────────────────────────────
export function useSocket() {
  return React.useContext(SocketContext)
}
