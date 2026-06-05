import { useEffect, useRef, useState } from 'react'
import Canvas from './components/Canvas'
import type { CanvasHandle } from './components/Canvas'
import Toolbar from './components/Toolbar'
import { useSync } from './hooks/useSync'
import type { Tool, FillStyle, TextShape, NoteShape } from './types'
import { v4 as uuid } from 'uuid'

const KEY_TOOL: Record<string, Tool> = {
  v: 'select', h: 'pan', r: 'rect', e: 'ellipse', a: 'arrow', p: 'pen', t: 'text', n: 'note',
}

const NOTE_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecdd3', '#e9d5ff', '#fed7aa']

interface BoardProps { roomId: string }

function Board({ roomId }: BoardProps) {
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [fillStyle, setFillStyle] = useState<FillStyle>('hachure')
  const [roughness, setRoughness] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0])

  const [textInput, setTextInput] = useState<{ x: number; y: number; wx: number; wy: number } | null>(null)
  const [textValue, setTextValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canvasRef = useRef<CanvasHandle>(null)

  const { shapes, cursors, peers, connected, clientId, addShape, updateShape, deleteShape, moveCursor } = useSync(roomId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const t = KEY_TOOL[e.key.toLowerCase()]
      if (t) setTool(t)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleTextClick = (screenX: number, screenY: number, worldX: number, worldY: number) => {
    setTextInput({ x: screenX, y: screenY, wx: worldX, wy: worldY })
    setTextValue('')
    setTimeout(() => textareaRef.current?.focus(), 10)
  }

  const commitText = () => {
    if (textInput) {
      if (tool === 'note') {
        addShape({
          id: uuid(), clientId, clock: 0,
          kind: 'note',
          x: textInput.wx - 10,
          y: textInput.wy - 10,
          width: 200,
          height: 160,
          text: textValue,
          noteColor,
          stroke: 'transparent',
          strokeWidth: 0,
          fill: noteColor,
          fillStyle: 'solid',
          roughness: 0,
          opacity: 1,
        } as NoteShape)
      } else if (textValue.trim()) {
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
    }
    setTextInput(null)
    setTextValue('')
    setTool('select')
  }

  const isDark = theme === 'dark'
  const panelBg = isDark ? 'rgba(18,18,26,0.97)' : 'rgba(255,255,255,0.97)'
  const panelBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const textColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'

  return (
    <>
      <Canvas
        ref={canvasRef}
        theme={theme}
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

      {/* Inline editor for text and notes */}
      {textInput && (
        <div style={{
          position: 'fixed',
          left: textInput.x - 10,
          top: textInput.y - 10,
          zIndex: 200,
        }}>
          {tool === 'note' && (
            <div style={{
              width: 200, height: 160,
              background: noteColor,
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              position: 'absolute',
              top: 0, left: 0,
              pointerEvents: 'none',
            }} />
          )}
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
              position: 'relative',
              width: tool === 'note' ? 180 : 160,
              minHeight: tool === 'note' ? 140 : 36,
              background: 'transparent',
              border: tool === 'note' ? 'none' : '1.5px dashed rgba(108,142,191,0.6)',
              borderRadius: tool === 'note' ? 6 : 4,
              color: tool === 'note' ? 'rgba(0,0,0,0.75)' : color,
              fontSize: tool === 'note' ? 15 : 22,
              fontFamily: '"Caveat", "Comic Sans MS", cursive',
              outline: 'none',
              resize: 'none',
              padding: tool === 'note' ? '12px' : '2px 6px',
              zIndex: 1,
              caretColor: tool === 'note' ? 'rgba(0,0,0,0.75)' : color,
              lineHeight: 1.4,
            }}
            placeholder={tool === 'note' ? 'Add a note…' : 'Type here…'}
            autoComplete="off"
          />
        </div>
      )}

      <Toolbar
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        fillStyle={fillStyle}
        roughness={roughness}
        noteColor={noteColor}
        noteColors={NOTE_COLORS}
        onTool={t => { setTool(t); setSelected(null) }}
        onColor={setColor}
        onStrokeWidth={setStrokeWidth}
        onFillStyle={setFillStyle}
        onRoughness={setRoughness}
        onNoteColor={setNoteColor}
        onClear={() => { shapes.forEach((_, id) => deleteShape(id)); setSelected(null) }}
        connected={connected}
        peerCount={peers.size}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      />

      <div style={{
        position: 'fixed', bottom: 76, right: 16,
        display: 'flex', alignItems: 'center', gap: 8,
        background: panelBg, border: `1px solid ${panelBorder}`,
        borderRadius: 8, padding: '5px 10px',
        backdropFilter: 'blur(12px)', zIndex: 100,
      }}>
        <span style={{ fontSize: 11, color: textColor, fontFamily: 'monospace' }}>#{roomId}</span>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer', fontSize: 11, padding: 0 }}
        >
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
        <div style={s.joinLogo}>
          <svg width="32" height="32" viewBox="0 0 22 22" fill="none">
            <rect x="1" y="1" width="9" height="9" rx="2" stroke="#6c8ebf" strokeWidth="1.8" fill="none" />
            <rect x="12" y="1" width="9" height="9" rx="2" stroke="#c084fc" strokeWidth="1.8" fill="none" />
            <rect x="1" y="12" width="9" height="9" rx="2" stroke="#f9a8d4" strokeWidth="1.8" fill="none" />
            <rect x="12" y="12" width="9" height="9" rx="2" stroke="#6ee7b7" strokeWidth="1.8" fill="none" />
          </svg>
          <span style={s.joinBrandName}>syncboard</span>
        </div>
        <p style={s.joinSub}>Real-time collaborative whiteboard</p>
        <button onClick={create} style={s.createBtn}>Create a board →</button>
        <div style={s.orRow}>
          <div style={s.orLine} />
          <span style={s.orText}>or join existing</span>
          <div style={s.orLine} />
        </div>
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
  join: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#13131a' },
  joinCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    background: 'rgba(22,22,30,0.98)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 18, padding: '40px 48px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
    minWidth: 340,
  },
  joinLogo: { display: 'flex', alignItems: 'center', gap: 10 },
  joinBrandName: { fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff' },
  joinSub: { fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0, textAlign: 'center' },
  createBtn: {
    background: '#6c8ebf', border: 'none', color: '#fff',
    borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14,
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
}
