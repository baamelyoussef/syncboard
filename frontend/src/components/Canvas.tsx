import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import rough from 'roughjs'
import { v4 as uuid } from 'uuid'
import type {
  Tool, Shape, RectShape, EllipseShape, ArrowShape, PenShape, TextShape, NoteShape,
  CursorState, Camera, FillStyle
} from '../types'

interface Props {
  shapes: Map<string, Shape>
  cursors: Map<string, CursorState>
  tool: Tool
  theme: 'dark' | 'light'
  color: string
  strokeWidth: number
  fillStyle: FillStyle
  roughness: number
  clientId: string
  onAdd: (s: Shape) => void
  onUpdate: (id: string, props: Partial<Shape>) => void
  onDelete: (id: string) => void
  onCursorMove: (x: number, y: number) => void
  onSelectChange: (id: string | null) => void
  onTextClick: (screenX: number, screenY: number, worldX: number, worldY: number) => void
  selected: string | null
}

export interface CanvasHandle {
  getCanvas: () => HTMLCanvasElement | null
}

function idToSeed(id: string): number {
  return id.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0) % 2 ** 31
}

function drawDotGrid(ctx: CanvasRenderingContext2D, w: number, h: number, cam: Camera, dotColor: string) {
  const gap = 24 * cam.zoom
  const ox = ((cam.x % gap) + gap) % gap
  const oy = ((cam.y % gap) + gap) % gap
  ctx.fillStyle = dotColor
  for (let x = ox; x < w; x += gap) {
    for (let y = oy; y < h; y += gap) {
      ctx.beginPath()
      ctx.arc(x, y, cam.zoom > 0.5 ? 1.2 : 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  size: number
) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const len = 14 + size * 3
  ctx.strokeStyle = color
  ctx.lineWidth = size + 0.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - len * Math.cos(angle - 0.4), y2 - len * Math.sin(angle - 0.4))
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - len * Math.cos(angle + 0.4), y2 - len * Math.sin(angle + 0.4))
  ctx.stroke()
}

function drawShape(
  rc: ReturnType<typeof rough.canvas>,
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  selected: boolean
) {
  const seed = idToSeed(shape.id)
  const fill = shape.fillStyle === 'none' ? undefined : shape.fill
  const opts = {
    seed,
    roughness: shape.roughness,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    fill,
    fillStyle: shape.fillStyle === 'none' ? 'solid' : shape.fillStyle,
    hachureAngle: -41,
    hachureGap: shape.strokeWidth * 4 + 3,
  }

  ctx.globalAlpha = shape.opacity

  if (shape.kind === 'rect') {
    const r = shape as RectShape
    const x = r.width < 0 ? r.x + r.width : r.x
    const y = r.height < 0 ? r.y + r.height : r.y
    rc.rectangle(x, y, Math.abs(r.width), Math.abs(r.height), opts)
    if (selected) {
      ctx.strokeStyle = '#6c8ebf'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(x - 6, y - 6, Math.abs(r.width) + 12, Math.abs(r.height) + 12)
      ctx.setLineDash([])
    }
  } else if (shape.kind === 'ellipse') {
    const el = shape as EllipseShape
    rc.ellipse(el.x, el.y, el.radiusX * 2, el.radiusY * 2, opts)
    if (selected) {
      ctx.strokeStyle = '#6c8ebf'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(el.x - el.radiusX - 6, el.y - el.radiusY - 6, el.radiusX * 2 + 12, el.radiusY * 2 + 12)
      ctx.setLineDash([])
    }
  } else if (shape.kind === 'arrow') {
    const ar = shape as ArrowShape
    const [x1, y1, x2, y2] = ar.points
    rc.line(x1, y1, x2, y2, { ...opts, fill: undefined })
    drawArrowhead(ctx, x1, y1, x2, y2, ar.stroke, ar.strokeWidth)
  } else if (shape.kind === 'pen') {
    const pen = shape as PenShape
    if (pen.points.length >= 4) {
      const pts: [number, number][] = []
      for (let i = 0; i < pen.points.length; i += 2) pts.push([pen.points[i], pen.points[i + 1]])
      rc.linearPath(pts, { ...opts, fill: undefined, roughness: 0.5 })
    }
  } else if (shape.kind === 'text') {
    const tx = shape as TextShape
    ctx.font = `${tx.fontSize}px "Caveat", "Comic Sans MS", cursive`
    ctx.fillStyle = tx.stroke
    ctx.fillText(tx.text, tx.x, tx.y)
    if (selected) {
      const w = ctx.measureText(tx.text).width
      ctx.strokeStyle = '#6c8ebf'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(tx.x - 4, tx.y - tx.fontSize - 2, w + 8, tx.fontSize + 8)
      ctx.setLineDash([])
    }
  } else if (shape.kind === 'note') {
    const n = shape as NoteShape
    const r = 8
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.18)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 4
    // Body
    ctx.fillStyle = n.noteColor
    ctx.beginPath()
    ctx.roundRect(n.x, n.y, n.width, n.height, r)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    // Fold corner
    const foldSize = 18
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.beginPath()
    ctx.moveTo(n.x + n.width - foldSize, n.y)
    ctx.lineTo(n.x + n.width, n.y + foldSize)
    ctx.lineTo(n.x + n.width - foldSize, n.y + foldSize)
    ctx.closePath()
    ctx.fill()
    // Text
    if (n.text) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)'
      ctx.font = `15px "Caveat", cursive`
      const padding = 12
      const lineHeight = 20
      const maxWidth = n.width - padding * 2
      const words = n.text.split(' ')
      let line = ''
      let y = n.y + padding + 14
      for (const word of words) {
        const test = line ? `${line} ${word}` : word
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, n.x + padding, y)
          line = word
          y += lineHeight
          if (y > n.y + n.height - padding) break
        } else {
          line = test
        }
      }
      if (line) ctx.fillText(line, n.x + padding, y)
    }
    if (selected) {
      ctx.strokeStyle = '#6c8ebf'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.roundRect(n.x - 4, n.y - 4, n.width + 8, n.height + 8, r + 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  ctx.globalAlpha = 1
}

function hitTest(shape: Shape, wx: number, wy: number): boolean {
  const pad = 8
  if (shape.kind === 'rect') {
    const r = shape as RectShape
    const x = Math.min(r.x, r.x + r.width)
    const y = Math.min(r.y, r.y + r.height)
    return wx >= x - pad && wx <= x + Math.abs(r.width) + pad && wy >= y - pad && wy <= y + Math.abs(r.height) + pad
  }
  if (shape.kind === 'ellipse') {
    const el = shape as EllipseShape
    const dx = (wx - el.x) / (el.radiusX + pad)
    const dy = (wy - el.y) / (el.radiusY + pad)
    return dx * dx + dy * dy <= 1
  }
  if (shape.kind === 'arrow' || shape.kind === 'pen') {
    const pts = (shape as ArrowShape | PenShape).points
    for (let i = 0; i < pts.length - 2; i += 2) {
      const dx = pts[i + 2] - pts[i]
      const dy = pts[i + 3] - pts[i + 1]
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len === 0) continue
      const t = Math.max(0, Math.min(1, ((wx - pts[i]) * dx + (wy - pts[i + 1]) * dy) / (len * len)))
      const px = pts[i] + t * dx - wx
      const py = pts[i + 1] + t * dy - wy
      if (Math.sqrt(px * px + py * py) < pad + 4) return true
    }
    return false
  }
  if (shape.kind === 'text') {
    const tx = shape as TextShape
    return wx >= tx.x - pad && wy >= tx.y - tx.fontSize - pad && wy <= tx.y + pad
  }
  if (shape.kind === 'note') {
    const n = shape as NoteShape
    return wx >= n.x - pad && wx <= n.x + n.width + pad && wy >= n.y - pad && wy <= n.y + n.height + pad
  }
  return false
}

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas({
  shapes, cursors, tool, theme, color, strokeWidth, fillStyle, roughness,
  clientId, onAdd, onUpdate, onDelete, onCursorMove, onSelectChange, onTextClick, selected
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }))
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 })
  const [draft, setDraft] = useState<Shape | null>(null)
  const drawing = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0, cx: 0, cy: 0 })
  const panning = useRef(false)
  const spaceHeld = useRef(false)
  const penPoints = useRef<number[]>([])
  const dragOffset = useRef({ x: 0, y: 0 })
  const dragging = useRef(false)

  const toWorld = useCallback((sx: number, sy: number, cam: Camera) => ({
    x: (sx - cam.x) / cam.zoom,
    y: (sy - cam.y) / cam.zoom,
  }), [])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rc = rough.canvas(canvas)

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const bg = theme === 'dark' ? '#13131a' : '#f8f8f5'
    const dotColor = theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    drawDotGrid(ctx, canvas.width, canvas.height, camera, dotColor)

    ctx.save()
    ctx.translate(camera.x, camera.y)
    ctx.scale(camera.zoom, camera.zoom)

    for (const shape of shapes.values()) {
      drawShape(rc, ctx, shape, shape.id === selected)
    }
    if (draft) drawShape(rc, ctx, draft, false)

    // Remote cursors (in world space)
    for (const [, cursor] of cursors) {
      ctx.save()
      ctx.font = '13px system-ui'
      const label = `▲ ${cursor.name}`
      ctx.strokeStyle = '#13131a'
      ctx.lineWidth = 3
      ctx.lineJoin = 'round'
      ctx.strokeText(label, cursor.x + 10, cursor.y + 16)
      ctx.fillStyle = cursor.color
      ctx.fillText(label, cursor.x + 10, cursor.y + 16)
      ctx.restore()
    }

    ctx.restore()
  }, [shapes, draft, cursors, camera, selected, theme])

  // Resize
  useEffect(() => {
    const handler = () => {
      const canvas = canvasRef.current
      if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Keyboard
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { spaceHeld.current = true; e.preventDefault() }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !(e.target instanceof HTMLInputElement)) {
        onDelete(selected)
        onSelectChange(null)
      }
    }
    const onUp = (e: KeyboardEvent) => { if (e.code === 'Space') spaceHeld.current = false }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [selected, onDelete, onSelectChange])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setCamera(cam => {
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const newZoom = Math.max(0.1, Math.min(20, cam.zoom * factor))
      const wx = (e.clientX - cam.x) / cam.zoom
      const wy = (e.clientY - cam.y) / cam.zoom
      return { x: e.clientX - wx * newZoom, y: e.clientY - wy * newZoom, zoom: newZoom }
    })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const isPan = tool === 'pan' || spaceHeld.current || e.button === 1
    if (isPan) {
      panning.current = true
      panStart.current = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y }
      return
    }

    const world = toWorld(e.clientX, e.clientY, camera)

    if (tool === 'select') {
      // Find topmost hit shape (reverse order)
      const arr = [...shapes.values()]
      let hit: Shape | null = null
      for (let i = arr.length - 1; i >= 0; i--) {
        if (hitTest(arr[i], world.x, world.y)) { hit = arr[i]; break }
      }
      if (hit) {
        onSelectChange(hit.id)
        dragging.current = true
        const s = hit as RectShape
        dragOffset.current = { x: world.x - (s.x ?? 0), y: world.y - (s.y ?? 0) }
      } else {
        onSelectChange(null)
      }
      return
    }

    drawing.current = true
    startPos.current = world

    const base = {
      id: uuid(), clientId, clock: 0,
      stroke: color, strokeWidth, fill: color + '40',
      fillStyle, roughness, opacity: 1,
    }

    if (tool === 'rect') {
      setDraft({ ...base, kind: 'rect', x: world.x, y: world.y, width: 0, height: 0 } as RectShape)
    } else if (tool === 'ellipse') {
      setDraft({ ...base, kind: 'ellipse', x: world.x, y: world.y, radiusX: 0, radiusY: 0 } as EllipseShape)
    } else if (tool === 'arrow') {
      setDraft({ ...base, kind: 'arrow', fill: 'transparent', fillStyle: 'none', points: [world.x, world.y, world.x, world.y] } as ArrowShape)
    } else if (tool === 'pen') {
      penPoints.current = [world.x, world.y]
      setDraft({ ...base, kind: 'pen', fill: 'transparent', fillStyle: 'none', roughness: 0.5, points: penPoints.current } as PenShape)
    } else if (tool === 'text' || tool === 'note') {
      onTextClick(e.clientX, e.clientY, world.x, world.y)
      drawing.current = false
    }
  }, [tool, camera, shapes, color, strokeWidth, fillStyle, roughness, clientId, onAdd, onSelectChange, toWorld])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const world = toWorld(e.clientX, e.clientY, camera)
    onCursorMove(world.x, world.y)

    if (panning.current) {
      setCamera(cam => ({
        ...cam,
        x: panStart.current.cx + e.clientX - panStart.current.x,
        y: panStart.current.cy + e.clientY - panStart.current.y,
      }))
      return
    }

    if (dragging.current && selected) {
      const shape = shapes.get(selected)
      if (!shape) return
      if ('x' in shape) {
        onUpdate(selected, { x: world.x - dragOffset.current.x, y: world.y - dragOffset.current.y } as Partial<Shape>)
      }
      return
    }

    if (!drawing.current || !draft) return

    if (draft.kind === 'rect') {
      setDraft({ ...draft, width: world.x - startPos.current.x, height: world.y - startPos.current.y })
    } else if (draft.kind === 'ellipse') {
      setDraft({
        ...draft,
        x: (world.x + startPos.current.x) / 2,
        y: (world.y + startPos.current.y) / 2,
        radiusX: Math.abs(world.x - startPos.current.x) / 2,
        radiusY: Math.abs(world.y - startPos.current.y) / 2,
      })
    } else if (draft.kind === 'arrow') {
      setDraft({ ...draft, points: [startPos.current.x, startPos.current.y, world.x, world.y] })
    } else if (draft.kind === 'pen') {
      penPoints.current = [...penPoints.current, world.x, world.y]
      setDraft({ ...draft, points: penPoints.current })
    }
  }, [camera, draft, drawing, selected, shapes, onCursorMove, onUpdate, toWorld])

  const handleMouseUp = useCallback(() => {
    panning.current = false
    dragging.current = false

    if (!drawing.current || !draft) return
    drawing.current = false

    const valid =
      (draft.kind === 'rect' && (Math.abs((draft as RectShape).width) > 4)) ||
      (draft.kind === 'ellipse' && (draft as EllipseShape).radiusX > 2) ||
      (draft.kind === 'arrow') ||
      (draft.kind === 'pen' && (draft as PenShape).points.length > 4)

    if (valid) onAdd(draft)
    setDraft(null)
  }, [draft, onAdd])

  const cursor = tool === 'pan' || spaceHeld.current ? 'grab' : tool === 'select' ? 'default' : 'crosshair'

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    />
  )
})

export default Canvas
