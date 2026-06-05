import type { Tool, FillStyle } from '../types'

const TOOLS: { id: Tool; icon: string; label: string; key: string }[] = [
  { id: 'select',  icon: '↖', label: 'Select',    key: 'V' },
  { id: 'pan',     icon: '✋', label: 'Pan',       key: 'H' },
  { id: 'rect',    icon: '▭', label: 'Rectangle', key: 'R' },
  { id: 'ellipse', icon: '○', label: 'Ellipse',   key: 'E' },
  { id: 'arrow',   icon: '↗', label: 'Arrow',     key: 'A' },
  { id: 'pen',     icon: '✏', label: 'Pen',       key: 'P' },
  { id: 'text',    icon: 'T', label: 'Text',      key: 'T' },
]

const COLORS = [
  '#ffffff', '#f08c00', '#e03131', '#c2255c',
  '#6741d9', '#1971c2', '#0c8599', '#2f9e44',
]

interface Props {
  tool: Tool
  color: string
  strokeWidth: number
  fillStyle: FillStyle
  roughness: number
  onTool: (t: Tool) => void
  onColor: (c: string) => void
  onStrokeWidth: (w: number) => void
  onFillStyle: (f: FillStyle) => void
  onRoughness: (r: number) => void
  onClear: () => void
  connected: boolean
  peerCount: number
  recording: boolean
  onRecordToggle: () => void
  theme: 'dark' | 'light'
  onThemeToggle: () => void
}

export default function Toolbar(p: Props) {
  return (
    <>
      {/* Left tool panel */}
      <div style={s.left}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            title={`${t.label} (${t.key})`}
            onClick={() => p.onTool(t.id)}
            style={{ ...s.btn, ...(p.tool === t.id ? s.active : {}) }}
          >
            <span style={s.icon}>{t.icon}</span>
          </button>
        ))}
      </div>

      {/* Top bar */}
      <div style={s.top}>
        <span style={s.brand}>syncboard</span>
        <div style={s.topRight}>
          <button
            onClick={p.onThemeToggle}
            style={s.themeBtn}
            title={p.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {p.theme === 'dark' ? '☀' : '🌙'}
          </button>
          <button
            onClick={p.onRecordToggle}
            style={{ ...s.recBtn, ...(p.recording ? s.recBtnActive : {}) }}
            title={p.recording ? 'Stop recording' : 'Record canvas'}
          >
            <span style={{ ...s.recDot, background: p.recording ? '#fa5252' : 'rgba(250,82,82,0.5)' }} />
            {p.recording ? 'Stop' : 'Record'}
          </button>
          <div style={{ ...s.dot, background: p.connected ? '#40c057' : '#fa5252' }} />
          <span style={s.peers}>{p.peerCount + 1} online</span>
        </div>
      </div>

      {/* Properties panel (bottom) */}
      <div style={s.props}>
        {/* Stroke color */}
        <div style={s.propGroup}>
          <span style={s.propLabel}>Stroke</span>
          <div style={s.swatches}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => p.onColor(c)}
                style={{
                  ...s.swatch,
                  background: c,
                  boxShadow: p.color === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                }}
              />
            ))}
            <input
              type="color"
              value={p.color}
              onChange={e => p.onColor(e.target.value)}
              style={s.colorInput}
              title="Custom color"
            />
          </div>
        </div>

        <div style={s.divider} />

        {/* Fill style */}
        <div style={s.propGroup}>
          <span style={s.propLabel}>Fill</span>
          <div style={s.swatches}>
            {(['none', 'hachure', 'solid'] as FillStyle[]).map(f => (
              <button
                key={f}
                onClick={() => p.onFillStyle(f)}
                style={{ ...s.fillBtn, ...(p.fillStyle === f ? s.fillActive : {}) }}
              >
                {f === 'none' ? '—' : f === 'hachure' ? '≡' : '■'}
              </button>
            ))}
          </div>
        </div>

        <div style={s.divider} />

        {/* Stroke width */}
        <div style={s.propGroup}>
          <span style={s.propLabel}>Width</span>
          <div style={s.swatches}>
            {[1, 2, 4, 6].map(w => (
              <button
                key={w}
                onClick={() => p.onStrokeWidth(w)}
                style={{ ...s.widthBtn, ...(p.strokeWidth === w ? s.fillActive : {}) }}
              >
                <div style={{ width: 18, height: w + 1, background: '#fff', borderRadius: 2 }} />
              </button>
            ))}
          </div>
        </div>

        <div style={s.divider} />

        {/* Roughness */}
        <div style={s.propGroup}>
          <span style={s.propLabel}>Rough</span>
          <div style={s.swatches}>
            {([0, 1, 2.5] as number[]).map((r, i) => (
              <button
                key={r}
                onClick={() => p.onRoughness(r)}
                style={{ ...s.fillBtn, ...(p.roughness === r ? s.fillActive : {}) }}
              >
                {['─', '~', '≈'][i]}
              </button>
            ))}
          </div>
        </div>

        <div style={s.divider} />

        <button onClick={p.onClear} style={s.clearBtn}>Clear</button>
      </div>
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  left: {
    position: 'fixed',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    background: 'rgba(22,22,30,0.96)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 6,
    backdropFilter: 'blur(20px)',
    zIndex: 100,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  btn: {
    width: 36,
    height: 36,
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.1s',
  },
  active: {
    background: 'rgba(108,142,191,0.3)',
    outline: '1.5px solid rgba(108,142,191,0.6)',
  },
  icon: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 1,
  },
  top: {
    position: 'fixed',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: 'rgba(22,22,30,0.96)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: '6px 16px',
    backdropFilter: 'blur(20px)',
    zIndex: 100,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  brand: {
    fontSize: 13,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: '-0.03em',
  },
  topRight: { display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: '50%' },
  peers: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  recBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'rgba(250,82,82,0.1)',
    border: '1px solid rgba(250,82,82,0.25)',
    color: 'rgba(250,82,82,0.8)',
    borderRadius: 7, padding: '3px 10px',
    cursor: 'pointer', fontSize: 11, fontWeight: 600,
  },
  recBtnActive: {
    background: 'rgba(250,82,82,0.2)',
    border: '1px solid rgba(250,82,82,0.5)',
    color: '#fa5252',
  },
  recDot: {
    width: 7, height: 7, borderRadius: '50%',
    animation: 'none',
  },
  themeBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)',
    borderRadius: 7, padding: '3px 8px',
    cursor: 'pointer', fontSize: 13,
  },
  props: {
    position: 'fixed',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(22,22,30,0.96)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: '8px 14px',
    backdropFilter: 'blur(20px)',
    zIndex: 100,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    userSelect: 'none',
  },
  propGroup: { display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' },
  propLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  swatches: { display: 'flex', gap: 4, alignItems: 'center' },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 4,
    border: '1.5px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    padding: 0,
    transition: 'box-shadow 0.1s',
  },
  colorInput: {
    width: 22,
    height: 22,
    borderRadius: 4,
    border: '1.5px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    padding: 1,
    background: 'transparent',
  },
  fillBtn: {
    width: 28,
    height: 22,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    borderRadius: 5,
    cursor: 'pointer',
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillActive: {
    background: 'rgba(108,142,191,0.25)',
    borderColor: 'rgba(108,142,191,0.5)',
    color: '#fff',
  },
  widthBtn: {
    width: 28,
    height: 22,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    borderRadius: 5,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { width: 1, height: 40, background: 'rgba(255,255,255,0.07)' },
  clearBtn: {
    background: 'rgba(250,82,82,0.12)',
    border: '1px solid rgba(250,82,82,0.25)',
    color: '#fa5252',
    borderRadius: 7,
    padding: '5px 12px',
    fontSize: 11,
    cursor: 'pointer',
    fontWeight: 600,
    letterSpacing: '0.03em',
  },
}
