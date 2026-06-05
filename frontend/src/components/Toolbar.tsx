import {
  MousePointer2, Hand, Square, Circle, ArrowUpRight,
  Pencil, Type, Trash2, Sun, Moon, StickyNote,
  Slash, AlignJustify, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react'
import type { Tool, FillStyle } from '../types'
import ShareMenu from './ShareMenu'

const TOOLS: { id: Tool; Icon: React.ElementType; label: string; key: string }[] = [
  { id: 'select',  Icon: MousePointer2,  label: 'Select',    key: 'V' },
  { id: 'pan',     Icon: Hand,           label: 'Pan',       key: 'H' },
  { id: 'rect',    Icon: Square,         label: 'Rectangle', key: 'R' },
  { id: 'ellipse', Icon: Circle,         label: 'Ellipse',   key: 'E' },
  { id: 'arrow',   Icon: ArrowUpRight,   label: 'Arrow',     key: 'A' },
  { id: 'pen',     Icon: Pencil,         label: 'Pen',       key: 'P' },
  { id: 'text',    Icon: Type,           label: 'Text',      key: 'T' },
  { id: 'note',    Icon: StickyNote,     label: 'Note',      key: 'N' },
]

const PALETTE = [
  '#e03131', '#f08c00', '#f9c74f', '#2f9e44',
  '#1971c2', '#6741d9', '#c2255c', '#1a1a2e',
  '#ffffff', '#adb5bd',
]

const FILL_OPTS: { id: FillStyle; Icon: React.ElementType; label: string }[] = [
  { id: 'none',    Icon: Slash,          label: 'No fill' },
  { id: 'hachure', Icon: AlignJustify,   label: 'Hachure' },
  { id: 'solid',   Icon: Square,         label: 'Solid' },
]

const WIDTHS = [1, 2, 4, 6]
const ROUGHNESS_LEVELS = [
  { value: 0,   label: 'Smooth' },
  { value: 1,   label: 'Normal' },
  { value: 2.5, label: 'Rough' },
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
  noteColor: string
  noteColors: string[]
  onNoteColor: (c: string) => void
  theme: 'dark' | 'light'
  onThemeToggle: () => void
  roomId: string
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

export default function Toolbar(p: Props) {
  const isDark = p.theme === 'dark'

  const panel: React.CSSProperties = {
    background: isDark ? 'rgba(18,18,26,0.96)' : 'rgba(255,255,255,0.96)',
    border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
  }

  const text = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)'
  const textMuted = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'
  const activeBg = isDark ? 'rgba(108,142,191,0.25)' : 'rgba(108,142,191,0.18)'
  const activeBorder = 'rgba(108,142,191,0.6)'
  const hoverBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'

  return (
    <>
      {/* Left tool rail */}
      <div style={{ ...s.rail, ...panel }}>
        {/* Logo mark */}
        <div style={s.logoMark}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="1" y="1" width="9" height="9" rx="2" stroke={isDark ? '#6c8ebf' : '#4a72a8'} strokeWidth="1.5" fill="none" />
            <rect x="12" y="1" width="9" height="9" rx="2" stroke={isDark ? '#c084fc' : '#9333ea'} strokeWidth="1.5" fill="none" />
            <rect x="1" y="12" width="9" height="9" rx="2" stroke={isDark ? '#f9a8d4' : '#db2777'} strokeWidth="1.5" fill="none" />
            <rect x="12" y="12" width="9" height="9" rx="2" stroke={isDark ? '#6ee7b7' : '#059669'} strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        <div style={{ width: '100%', height: 1, background: dividerColor, margin: '2px 0' }} />

        {/* Tools */}
        {TOOLS.map(({ id, Icon, label, key }) => {
          const active = p.tool === id
          return (
            <div key={id} style={s.tooltipWrap}>
              <button
                onClick={() => p.onTool(id)}
                style={{
                  ...s.toolBtn,
                  color: active ? '#6c8ebf' : text,
                  background: active ? activeBg : 'transparent',
                  outline: active ? `1.5px solid ${activeBorder}` : 'none',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = hoverBg }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Icon size={17} strokeWidth={active ? 2 : 1.75} />
              </button>
              <div style={{ ...s.tooltip, background: isDark ? '#1e1e2e' : '#fff', color: text, border: `1px solid ${dividerColor}` }}>
                {label} <span style={{ color: textMuted, fontSize: 10 }}>{key}</span>
              </div>
            </div>
          )
        })}

        <div style={{ width: '100%', height: 1, background: dividerColor, margin: '2px 0' }} />

        {/* Clear */}
        <div style={s.tooltipWrap}>
          <button
            onClick={p.onClear}
            style={{ ...s.toolBtn, color: isDark ? 'rgba(250,82,82,0.7)' : '#e03131' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(250,82,82,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
          <div style={{ ...s.tooltip, background: isDark ? '#1e1e2e' : '#fff', color: text, border: `1px solid ${dividerColor}` }}>
            Clear board
          </div>
        </div>
      </div>

      {/* Top-right actions */}
      <div style={{ ...s.topRight, ...panel }}>
        <div style={{ ...s.statusPill }}>
          <span style={{ ...s.statusDot, background: p.connected ? '#40c057' : '#fa5252' }} />
          <span style={{ color: textMuted, fontSize: 11 }}>{p.peerCount + 1} online</span>
        </div>

        <div style={{ width: 1, height: 16, background: dividerColor }} />

        <button
          onClick={p.onThemeToggle}
          title={isDark ? 'Light mode' : 'Dark mode'}
          style={{ ...s.iconBtn, color: text }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          {isDark ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
        </button>

        <ShareMenu roomId={p.roomId} isDark={isDark} />
      </div>

      {/* Bottom properties panel */}
      <div style={{ ...s.propsBar, ...panel }}>

        {/* Undo / Redo */}
        <div style={s.propSection}>
          <span style={{ ...s.propLabel, color: textMuted }}>History</span>
          <div style={s.swatchRow}>
            {[
              { icon: <Undo2 size={14} strokeWidth={1.75} />, onClick: p.onUndo, disabled: !p.canUndo, title: 'Undo ⌘Z' },
              { icon: <Redo2 size={14} strokeWidth={1.75} />, onClick: p.onRedo, disabled: !p.canRedo, title: 'Redo ⌘⇧Z' },
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick} disabled={btn.disabled} title={btn.title} style={{
                ...s.optBtn,
                color: btn.disabled ? (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)') : text,
                background: 'transparent',
                border: `1px solid ${btn.disabled ? 'transparent' : dividerColor}`,
                cursor: btn.disabled ? 'default' : 'pointer',
              }}>
                {btn.icon}
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...s.vDivider, background: dividerColor }} />

        {/* Zoom */}
        <div style={s.propSection}>
          <span style={{ ...s.propLabel, color: textMuted }}>Zoom</span>
          <div style={s.swatchRow}>
            <button onClick={p.onZoomOut} title="Zoom out" style={{ ...s.optBtn, color: text, background: 'transparent', border: `1px solid ${dividerColor}` }}>
              <ZoomOut size={13} strokeWidth={1.75} />
            </button>
            <button onClick={p.onZoomReset} title="Reset zoom" style={{
              height: 24, minWidth: 42, border: `1px solid ${dividerColor}`,
              background: 'transparent', borderRadius: 6, cursor: 'pointer',
              fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
              color: textMuted, letterSpacing: '-0.02em', padding: '0 6px',
            }}>
              {Math.round(p.zoom * 100)}%
            </button>
            <button onClick={p.onZoomIn} title="Zoom in" style={{ ...s.optBtn, color: text, background: 'transparent', border: `1px solid ${dividerColor}` }}>
              <ZoomIn size={13} strokeWidth={1.75} />
            </button>
            <button onClick={p.onZoomReset} title="Fit view" style={{ ...s.optBtn, color: text, background: 'transparent', border: `1px solid ${dividerColor}` }}>
              <Maximize2 size={12} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div style={{ ...s.vDivider, background: dividerColor }} />

        {/* Stroke color */}
        <div style={s.propSection}>
          <span style={{ ...s.propLabel, color: textMuted }}>Stroke</span>
          <div style={s.swatchRow}>
            {PALETTE.map(c => (
              <button
                key={c}
                onClick={() => p.onColor(c)}
                style={{
                  ...s.swatch,
                  background: c,
                  border: p.color === c
                    ? '2px solid #6c8ebf'
                    : `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                  transform: p.color === c ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
            <input
              type="color"
              value={p.color}
              onChange={e => p.onColor(e.target.value)}
              title="Custom"
              style={{ ...s.colorPicker, border: `1.5px solid ${dividerColor}` }}
            />
          </div>
        </div>

        <div style={{ ...s.vDivider, background: dividerColor }} />

        {/* Fill */}
        <div style={s.propSection}>
          <span style={{ ...s.propLabel, color: textMuted }}>Fill</span>
          <div style={s.swatchRow}>
            {FILL_OPTS.map(({ id, Icon, label }) => (
              <button
                key={id}
                title={label}
                onClick={() => p.onFillStyle(id)}
                style={{
                  ...s.optBtn,
                  color: p.fillStyle === id ? '#6c8ebf' : text,
                  background: p.fillStyle === id ? activeBg : 'transparent',
                  border: p.fillStyle === id ? `1px solid ${activeBorder}` : `1px solid ${dividerColor}`,
                }}
              >
                <Icon size={13} strokeWidth={1.75} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...s.vDivider, background: dividerColor }} />

        {/* Stroke width */}
        <div style={s.propSection}>
          <span style={{ ...s.propLabel, color: textMuted }}>Width</span>
          <div style={s.swatchRow}>
            {WIDTHS.map(w => (
              <button
                key={w}
                onClick={() => p.onStrokeWidth(w)}
                title={`${w}px`}
                style={{
                  ...s.optBtn,
                  background: p.strokeWidth === w ? activeBg : 'transparent',
                  border: p.strokeWidth === w ? `1px solid ${activeBorder}` : `1px solid ${dividerColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{ width: 16, height: Math.max(1, w * 0.75), borderRadius: 2, background: p.strokeWidth === w ? '#6c8ebf' : text }} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...s.vDivider, background: dividerColor }} />

        {/* Roughness */}
        <div style={s.propSection}>
          <span style={{ ...s.propLabel, color: textMuted }}>Style</span>
          <div style={s.swatchRow}>
            {ROUGHNESS_LEVELS.map(({ value, label }) => (
              <button
                key={value}
                title={label}
                onClick={() => p.onRoughness(value)}
                style={{
                  ...s.optBtn,
                  fontSize: 11,
                  color: p.roughness === value ? '#6c8ebf' : text,
                  background: p.roughness === value ? activeBg : 'transparent',
                  border: p.roughness === value ? `1px solid ${activeBorder}` : `1px solid ${dividerColor}`,
                }}
              >
                {label === 'Smooth' ? '─' : label === 'Normal' ? '∿' : '≈'}
              </button>
            ))}
          </div>
        </div>

        {p.tool === 'note' && (
          <>
            <div style={{ ...s.vDivider, background: dividerColor }} />
            <div style={s.propSection}>
              <span style={{ ...s.propLabel, color: textMuted }}>Note color</span>
              <div style={s.swatchRow}>
                {p.noteColors.map(c => (
                  <button
                    key={c}
                    onClick={() => p.onNoteColor(c)}
                    style={{
                      ...s.swatch,
                      background: c,
                      border: p.noteColor === c
                        ? '2px solid #6c8ebf'
                        : `1.5px solid ${isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.12)'}`,
                      transform: p.noteColor === c ? 'scale(1.18)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  rail: {
    position: 'fixed',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    borderRadius: 14,
    padding: '8px 6px',
    zIndex: 100,
    width: 44,
  },
  logoMark: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tooltipWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  tooltip: {
    position: 'absolute',
    left: 'calc(100% + 10px)',
    top: '50%',
    transform: 'translateY(-50%)',
    whiteSpace: 'nowrap',
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 6,
    pointerEvents: 'none',
    opacity: 0,
    transition: 'opacity 0.15s',
    zIndex: 200,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  toolBtn: {
    width: 34,
    height: 34,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.1s, color 0.1s',
    padding: 0,
  },
  topRight: {
    position: 'fixed',
    top: 12,
    right: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    padding: '6px 10px',
    zIndex: 100,
  },
  iconBtn: {
    width: 30,
    height: 30,
    border: 'none',
    background: 'transparent',
    borderRadius: 7,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.1s',
    padding: 0,
  },
  recBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 7,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    transition: 'all 0.15s',
    letterSpacing: '-0.01em',
  },
  recPulse: {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#e03131',
    animation: 'pulse 1.2s infinite',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 7,
    padding: '4px 10px',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  propsBar: {
    position: 'fixed',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: '8px 14px',
    zIndex: 100,
    userSelect: 'none',
  },
  propSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    alignItems: 'flex-start',
  },
  propLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 600,
  },
  swatchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 5,
    cursor: 'pointer',
    padding: 0,
    transition: 'transform 0.1s, border 0.1s',
    flexShrink: 0,
  },
  colorPicker: {
    width: 22,
    height: 22,
    borderRadius: 5,
    cursor: 'pointer',
    padding: 1,
    background: 'transparent',
  },
  optBtn: {
    width: 28,
    height: 24,
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.1s',
    padding: 0,
    flexShrink: 0,
  },
  vDivider: {
    width: 1,
    height: 36,
    flexShrink: 0,
  },
}
