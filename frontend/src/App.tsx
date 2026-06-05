import { useEffect, useRef, useState } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import { useSync } from './hooks/useSync'
import type { Tool, FillStyle, TextShape } from './types'
import { v4 as uuid } from 'uuid'

const KEY_TOOL: Record<string, Tool> = {
  v: 'select', h: 'pan', r: 'rect', e: 'ellipse', a: 'arrow', p: 'pen', t: 'text',
}

interface BoardProps { roomId: string }

function Board({ roomId }: BoardProps) {
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [fillStyle, setFillStyle] = useState<FillStyle>('hachure')
  const [roughness, setRoughness] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)

  // Inline text editing state
  const [textInput, setTextInput] = useState<{ x: number; y: number; wx: number; wy: number } | null>(null)
  const [textValue, setTextValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { shapes, cursors, peers, connected, clientId, addShape, updateShape, deleteShape, moveCursor } = useSync(roomId)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const t = KEY_TOOL[e.key.toLowerCase()]
      if (t) setTool(t)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // When text tool is active and user clicks, open inline textarea
  const handleTextClick = (screenX: number, screenY: number, worldX: number, worldY: number) => {
    setTextInput({ x: screenX, y: screenY, wx: worldX, wy: worldY })
    setTextValue('')
    setTimeout(() => textareaRef.current?.focus(), 10)
  }

  const commitText = () => {
    if (textInput && textValue.trim()) {
      addShape({
        id: uuid(), clientId, clock: 0,
        kind: 'text',
        x: textInput.wx,
        y: textInput.wy,
        text: textValue,
        fontSize: 22,
        stroke: color,
        strokeWidth,
        fill: 'transparent',
        fillStyle: 'none',
        roughness: 0,
        opacity: 1,
      } as TextShape)
    }
    setTextInput(null)
    setTextValue('')
    setTool('select')
  }

  return (
    <>
      <Canvas
        shapes={shapes}
        cursors={cursors}
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        fillStyle={fillStyle}
        roughness={roughness}
        clientId={clientId}
        selected={selected}
        onAdd={addShape}
        onUpdate={updateShape}
        onDelete={deleteShape}
        onCursorMove={moveCursor}
        onSelectChange={setSelected}
        onTextClick={handleTextClick}
      />

      {/* Inline text editor */}
      {textInput && (
        <textarea
          ref={textareaRef}
          value={textValue}
          onChange={e => setTextValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setTextInput(null); setTextValue(''); setTool('select') }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText() }
          }}
          onBlur={commitText}
          style={{
            position: 'fixed',
            left: textInput.x,
            top: textInput.y - 22,
            minWidth: 120,
            minHeight: 36,
            background: 'transparent',
            border: '1.5px dashed rgba(108,142,191,0.6)',
            borderRadius: 4,
            color,
            fontSize: 22,
            fontFamily: '"Caveat", "Comic Sans MS", cursive',
            outline: 'none',
            resize: 'none',
            padding: '2px 6px',
            zIndex: 200,
            caretColor: color,
            lineHeight: 1.3,
          }}
          placeholder="Type here..."
          autoComplete="off"
        />
      )}

      <Toolbar
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        fillStyle={fillStyle}
        roughness={roughness}
        onTool={t => { setTool(t); setSelected(null) }}
        onColor={setColor}
        onStrokeWidth={setStrokeWidth}
        onFillStyle={setFillStyle}
        onRoughness={setRoughness}
        onClear={() => { shapes.forEach((_, id) => deleteShape(id)); setSelected(null) }}
        connected={connected}
        peerCount={peers.size}
      />

      <div style={s.roomBadge}>
        <span style={s.roomId}>#{roomId}</span>
        <button onClick={() => navigator.clipboard.writeText(window.location.href)} style={s.copyBtn}>
          Copy invite
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
    const id = input.trim()
    if (id) { window.location.hash = id; window.location.reload() }
  }

  return (
    <div style={s.join}>
      <div style={s.joinCard}>
        <h1 style={s.title}>syncboard</h1>
        <p style={s.sub}>Real-time collaborative whiteboard with hand-drawn feel</p>
        <button onClick={create} style={s.createBtn}>Create a board →</button>
        <div style={s.orRow}><div style={s.orLine}/><span style={s.orText}>or join existing</span><div style={s.orLine}/></div>
        <div style={s.joinRow}>
          <input
            placeholder="Enter room ID"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && join()}
            style={s.input}
          />
          <button onClick={join} style={s.joinBtn}>Join</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const roomId = window.location.hash.slice(1)
  return roomId ? <Board roomId={roomId} /> : <Join />
}

const s: Record<string, React.CSSProperties> = {
  join: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: '#13131a',
  },
  joinCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    background: 'rgba(22,22,30,0.98)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: '40px 48px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
  },
  title: { fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', margin: 0 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0, textAlign: 'center', maxWidth: 300 },
  createBtn: {
    background: '#6c8ebf', border: 'none', color: '#fff',
    borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 14,
    cursor: 'pointer', width: '100%', letterSpacing: '-0.01em',
  },
  orRow: { display: 'flex', alignItems: 'center', gap: 10, width: '100%' },
  orLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' },
  orText: { fontSize: 11, color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' },
  joinRow: { display: 'flex', gap: 8, width: '100%' },
  input: {
    flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: '#fff', padding: '9px 14px', fontSize: 13, outline: 'none',
    fontFamily: 'monospace',
  },
  joinBtn: {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13,
  },
  roomBadge: {
    position: 'fixed', bottom: 72, right: 16,
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(22,22,30,0.95)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8, padding: '5px 10px',
    backdropFilter: 'blur(10px)', zIndex: 100,
  },
  roomId: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' },
  copyBtn: {
    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer', fontSize: 11, padding: 0,
  },
}
