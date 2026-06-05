import { useState, useRef, useEffect } from 'react'
import { Share2, Eye, Users, Check, Copy, X } from 'lucide-react'

interface Props {
  roomId: string
  isDark: boolean
}

export default function ShareMenu({ roomId, isDark }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'view' | 'collab' | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const collabLink = window.location.href

  const copy = async (type: 'view' | 'collab') => {
    if (type === 'collab') {
      navigator.clipboard.writeText(collabLink)
    } else {
      const res = await fetch(`/room/view-token/${roomId}`)
      const { viewToken } = await res.json()
      const viewLink = `${window.location.origin}${window.location.pathname}#view:${viewToken}`
      navigator.clipboard.writeText(viewLink)
    }
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const panel: React.CSSProperties = {
    background: isDark ? 'rgba(18,18,26,0.98)' : 'rgba(255,255,255,0.98)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.09)',
    boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.55)' : '0 16px 48px rgba(0,0,0,0.14)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  }
  const text = isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.75)'
  const muted = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'
  const itemBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const itemHover = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: open
            ? (isDark ? 'rgba(108,142,191,0.25)' : 'rgba(108,142,191,0.15)')
            : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
          border: open
            ? '1px solid rgba(108,142,191,0.5)'
            : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)'),
          color: open ? '#6c8ebf' : text,
          borderRadius: 8,
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          transition: 'all 0.15s',
        }}
      >
        <Share2 size={14} strokeWidth={2} />
        Share
      </button>

      {open && (
        <div style={{
          ...panel,
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 280,
          borderRadius: 12,
          overflow: 'hidden',
          zIndex: 300,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px 10px',
            borderBottom: `1px solid ${itemBorder}`,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: text, letterSpacing: '-0.01em' }}>
              Share board
            </span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0, display: 'flex' }}>
              <X size={14} />
            </button>
          </div>

          {/* View only */}
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${itemBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Eye size={15} color={muted} strokeWidth={1.75} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: text, margin: '0 0 2px' }}>View only</p>
                <p style={{ fontSize: 11, color: muted, margin: 0, lineHeight: 1.4 }}>
                  Share a static snapshot. Viewers can't draw or edit.
                </p>
              </div>
            </div>
            <button
              onClick={() => copy('view')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${itemBorder}`,
                borderRadius: 7, padding: '7px 0',
                color: copied === 'view' ? '#40c057' : text,
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = itemHover }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
            >
              {copied === 'view' ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={1.75} />}
              {copied === 'view' ? 'Copied!' : 'Copy view link'}
            </button>
          </div>

          {/* Collaborate */}
          <div style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: 'rgba(108,142,191,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users size={15} color="#6c8ebf" strokeWidth={1.75} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: text, margin: '0 0 2px' }}>Collaborate</p>
                <p style={{ fontSize: 11, color: muted, margin: 0, lineHeight: 1.4 }}>
                  Invite someone to draw with you in real time.
                </p>
              </div>
            </div>
            <button
              onClick={() => copy('collab')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: copied === 'collab' ? 'rgba(64,192,87,0.12)' : 'rgba(108,142,191,0.15)',
                border: copied === 'collab' ? '1px solid rgba(64,192,87,0.3)' : '1px solid rgba(108,142,191,0.3)',
                borderRadius: 7, padding: '7px 0',
                color: copied === 'collab' ? '#40c057' : '#6c8ebf',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {copied === 'collab' ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={1.75} />}
              {copied === 'collab' ? 'Copied!' : 'Copy invite link'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
