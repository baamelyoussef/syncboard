import type { Tool } from '../types'

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'rect', label: 'Rectangle', icon: '▭' },
  { id: 'ellipse', label: 'Ellipse', icon: '○' },
  { id: 'arrow', label: 'Arrow', icon: '→' },
  { id: 'pen', label: 'Pen', icon: '✏' },
  { id: 'text', label: 'Text', icon: 'T' },
]

interface Props {
  tool: Tool
  color: string
  strokeWidth: number
  onTool: (t: Tool) => void
  onColor: (c: string) => void
  onStrokeWidth: (w: number) => void
  onClear: () => void
  connected: boolean
  peerCount: number
}

export default function Toolbar({ tool, color, strokeWidth, onTool, onColor, onStrokeWidth, onClear, connected, peerCount }: Props) {
  return (
    <div style={s.bar}>
      <span style={s.logo}>Syncboard</span>

      <div style={s.sep} />

      <div style={s.group}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            title={t.label}
            onClick={() => onTool(t.id)}
            style={{ ...s.btn, ...(tool === t.id ? s.active : {}) }}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div style={s.sep} />

      <div style={s.group}>
        <input type="color" value={color} onChange={(e) => onColor(e.target.value)} style={s.colorPicker} title="Color" />
        <select value={strokeWidth} onChange={(e) => onStrokeWidth(Number(e.target.value))} style={s.select}>
          {[1, 2, 4, 6, 10].map((w) => <option key={w} value={w}>{w}px</option>)}
        </select>
      </div>

      <div style={s.sep} />

      <button onClick={onClear} style={s.clearBtn} title="Clear board">Clear</button>

      <div style={{ flex: 1 }} />

      <div style={{ ...s.status, background: connected ? 'rgba(78,205,196,0.15)' : 'rgba(255,107,107,0.15)' }}>
        <span style={{ ...s.dot, background: connected ? '#4ECDC4' : '#FF6B6B' }} />
        {connected ? `${peerCount + 1} online` : 'disconnected'}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(20,20,20,0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '8px 14px',
    backdropFilter: 'blur(20px)',
    zIndex: 100,
    boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
    userSelect: 'none',
  },
  logo: {
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
  },
  sep: { width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' },
  group: { display: 'flex', gap: 2 },
  btn: {
    width: 32,
    height: 32,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    borderRadius: 7,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.1s',
  },
  active: {
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
  },
  colorPicker: {
    width: 32,
    height: 32,
    border: 'none',
    borderRadius: 7,
    padding: 2,
    cursor: 'pointer',
    background: 'transparent',
  },
  select: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: 7,
    padding: '4px 6px',
    fontSize: 12,
    cursor: 'pointer',
  },
  clearBtn: {
    background: 'rgba(255,107,107,0.15)',
    border: '1px solid rgba(255,107,107,0.3)',
    color: '#FF6B6B',
    borderRadius: 7,
    padding: '4px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 7,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    whiteSpace: 'nowrap',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
  },
}
