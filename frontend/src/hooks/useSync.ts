import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { Op, Shape, Peer, CursorState } from '../types'

const CLIENT_ID = uuid()
const NAME = `User ${CLIENT_ID.slice(0, 4)}`
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
const MY_COLOR = COLORS[Math.floor(Math.random() * COLORS.length)]

// LWW-CRDT: apply ops in order, last write wins per shape (by clock)
function applyOps(ops: Op[]): Map<string, Shape> {
  const shapes = new Map<string, Shape>()
  const clocks = new Map<string, number>()

  for (const op of ops) {
    if (op.type === 'ADD_SHAPE') {
      if (!shapes.has(op.shape.id) || op.clock > (clocks.get(op.shape.id) ?? -1)) {
        shapes.set(op.shape.id, op.shape)
        clocks.set(op.shape.id, op.clock)
      }
    } else if (op.type === 'UPDATE_SHAPE') {
      const existing = shapes.get(op.id)
      if (existing && op.clock >= (clocks.get(op.id) ?? -1)) {
        shapes.set(op.id, { ...existing, ...op.props } as Shape)
        clocks.set(op.id, op.clock)
      }
    } else if (op.type === 'DELETE_SHAPE') {
      shapes.delete(op.id)
    }
  }

  return shapes
}

export function useSync(roomId: string) {
  const [shapes, setShapes] = useState<Map<string, Shape>>(new Map())
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map())
  const [cursors, setCursors] = useState<Map<string, CursorState>>(new Map())
  const [connected, setConnected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const clockRef = useRef(0)
  const opsRef = useRef<Op[]>([])

  const nextClock = () => {
    clockRef.current += 1
    return clockRef.current
  }

  useEffect(() => {
    const ws = new WebSocket(
      `ws://${window.location.host}/ws/${roomId}?clientId=${CLIENT_ID}&name=${NAME}&color=${encodeURIComponent(MY_COLOR)}`
    )
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)

      if (msg.type === 'INIT') {
        opsRef.current = msg.ops
        setShapes(applyOps(msg.ops))
        setPeers(new Map(msg.peers.map((p: Peer) => [p.id, p])))
        return
      }

      if (msg.type === 'PEER_JOINED') {
        setPeers((prev) => new Map(prev).set(msg.peer.id, msg.peer))
        return
      }

      if (msg.type === 'PEER_LEFT') {
        setPeers((prev) => { const m = new Map(prev); m.delete(msg.clientId); return m })
        setCursors((prev) => { const m = new Map(prev); m.delete(msg.clientId); return m })
        return
      }

      if (msg.type === 'CURSOR_MOVE') {
        const peer = peers.get(msg.clientId)
        setCursors((prev) => new Map(prev).set(msg.clientId, {
          x: msg.x,
          y: msg.y,
          color: peer?.color ?? '#fff',
          name: peer?.name ?? msg.clientId,
        }))
        return
      }

      // Shape op from another client
      const op = msg as Op
      opsRef.current = [...opsRef.current, op]
      setShapes(applyOps(opsRef.current))
    }

    return () => ws.close()
  }, [roomId])

  const send = useCallback((op: Op) => {
    wsRef.current?.send(JSON.stringify(op))
    // Apply locally immediately (optimistic)
    if (op.type !== 'CURSOR_MOVE') {
      opsRef.current = [...opsRef.current, op]
      setShapes(applyOps(opsRef.current))
    }
  }, [])

  const addShape = useCallback((shape: Shape) => {
    const op: Op = { type: 'ADD_SHAPE', shape, clientId: CLIENT_ID, clock: nextClock() }
    send(op)
  }, [send])

  const updateShape = useCallback((id: string, props: Partial<Shape>) => {
    const op: Op = { type: 'UPDATE_SHAPE', id, props, clientId: CLIENT_ID, clock: nextClock() }
    send(op)
  }, [send])

  const deleteShape = useCallback((id: string) => {
    const op: Op = { type: 'DELETE_SHAPE', id, clientId: CLIENT_ID, clock: nextClock() }
    send(op)
  }, [send])

  const moveCursor = useCallback((x: number, y: number) => {
    send({ type: 'CURSOR_MOVE', x, y, clientId: CLIENT_ID })
  }, [send])

  return {
    shapes,
    peers,
    cursors,
    connected,
    clientId: CLIENT_ID,
    myColor: MY_COLOR,
    addShape,
    updateShape,
    deleteShape,
    moveCursor,
  }
}
