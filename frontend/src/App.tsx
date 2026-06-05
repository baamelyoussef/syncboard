import { useState } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import { useSync } from './hooks/useSync'
import type { Tool } from './types'

interface Props {
  roomId: string
}

function Board({ roomId }: Props) {
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState('#4ECDC4')
  const [strokeWidth, setStrokeWidth] = useState(2)

  const { shapes, cursors, peers, connected, clientId, addShape, updateShape, deleteShape, moveCursor } = useSync(roomId)

  const handleClear = () => {
    shapes.forEach((_, id) => deleteShape(id))
  }

  return (
    <>
      <Toolbar
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        onTool={setTool}
        onColor={setColor}
        onStrokeWidth={setStrokeWidth}
        onClear={handleClear}
        connected={connected}
        peerCount={peers.size}
      />
      <Canvas
        shapes={shapes}
        cursors={cursors}
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        clientId={clientId}
        onAdd={addShape}
        onUpdate={updateShape}
        onDelete={deleteShape}
        onCursorMove={moveCursor}
      />
      <div style={s.roomBadge}>
        Room: <strong>{roomId}</strong>
        <button
          onClick={() => { navigator.clipboard.writeText(window.location.href) }}
          style={s.copyBtn}
        >
          Copy link
        </button>
      </div>
    </>
  )
}

function Join() {
  const [input, setInput] = useState('')

  const create = async () => {
    const res = await fetch('/room/new')
    const { roomId } = await res.json()
    window.location.hash = roomId
    window.location.reload()
  }

  const join = () => {
    if (input.trim()) {
      window.location.hash = input.trim()
      window.location.reload()
    }
  }

  return (
    <div style={s.join}>
      <h1 style={s.title}>Syncboard</h1>
      <p style={s.sub}>Real-time collaborative whiteboard</p>
      <div style={s.joinRow}>
        <input
          placeholder="Room ID"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          style={s.input}
        />
        <button onClick={join} style={s.joinBtn}>Join</button>
      </div>
      <button onClick={create} style={s.createBtn}>Create new room →</button>
    </div>
  )
}

export default function App() {
  const roomId = window.location.hash.slice(1)
  return roomId ? <Board roomId={roomId} /> : <Join />
}

const s: Record<string, React.CSSProperties> = {
  join: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    color: '#fff',
  },
  sub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    marginBottom: 8,
  },
  joinRow: { display: 'flex', gap: 8 },
  input: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: '#fff',
    padding: '10px 16px',
    fontSize: 14,
    outline: 'none',
    width: 200,
  },
  joinBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    borderRadius: 10,
    padding: '10px 18px',
    cursor: 'pointer',
    fontSize: 14,
  },
  createBtn: {
    background: '#4ECDC4',
    border: 'none',
    color: '#000',
    borderRadius: 10,
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
  roomBadge: {
    position: 'fixed',
    bottom: 16,
    left: 16,
    background: 'rgba(20,20,20,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backdropFilter: 'blur(10px)',
  },
  copyBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    borderRadius: 5,
    padding: '2px 8px',
    cursor: 'pointer',
    fontSize: 11,
  },
}
