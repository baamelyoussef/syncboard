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
  onSelectChange: (ids: Set<string>) => void
  onTextClick: (screenX: number, screenY: number, worldX: number, worldY: number) => void
  onZoomChange?: (zoom: number) => void
  selected: Set<string>
}

export interface CanvasHandle {
  getCanvas: () => HTMLCanvasElement | null
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

function idToSeed(id: string): number {
  return id.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0) % 2 ** 31
}

// ── Resize helpers ──────────────────────────────────────────────────────────

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const HANDLE_CURSORS: Record<Handle, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
  se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
}

interface BBox { x: number; y: number; w: number; h: number }

function getBBox(shape: Shape): BBox | null {
  if (shape.kind === 'rect' || shape.kind === 'note') {
    const s = shape as RectShape | NoteShape
    return { x: Math.min(s.x, s.x + s.width), y: Math.min(s.y, s.y + s.height), w: Math.abs(s.width), h: Math.abs(s.height) }
  }
  if (shape.kind === 'ellipse') {
    const el = shape as EllipseShape
    return { x: el.x - el.radiusX, y: el.y - el.radiusY, w: el.radiusX * 2, h: el.radiusY * 2 }
  }
  if (shape.kind === 'text') {
    const tx = shape as TextShape
    return { x: tx.x, y: tx.y - tx.fontSize, w: Math.max(40, tx.text.length * tx.fontSize * 0.55), h: tx.fontSize * 1.4 }
  }
  if (shape.kind === 'arrow' || shape.kind === 'pen') {
    const pts = (shape as ArrowShape | PenShape).points
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i])
      minY = Math.min(minY, pts[i + 1]); maxY = Math.max(maxY, pts[i + 1])
    }
    return { x: minX, y: minY, w: Math.max(4, maxX - minX), h: Math.max(4, maxY - minY) }
  }
  return null
}

function getHandlePos(bbox: BBox, h: Handle): { x: number; y: number } {
  const { x, y, w, ht } = { ...bbox, ht: bbox.h }
  switch (h) {
    case 'nw': return { x, y }
    case 'n':  return { x: x + w / 2, y }
    case 'ne': return { x: x + w, y }
    case 'e':  return { x: x + w, y: y + ht / 2 }
    case 'se': return { x: x + w, y: y + ht }
    case 's':  return { x: x + w / 2, y: y + ht }
    case 'sw': return { x, y: y + ht }
    case 'w':  return { x, y: y + ht / 2 }
  }
}

function applyResize(shape: Shape, handle: Handle, dx: number, dy: number, start: BBox): Partial<Shape> {
  let { x, y, w, h } = start

  switch (handle) {
    case 'nw': x += dx; y += dy; w -= dx; h -= dy; break
    case 'n':             y += dy;          h -= dy; break
    case 'ne':       y += dy; w += dx; h -= dy; break
    case 'e':              w += dx;               break
    case 'se':             w += dx; h += dy; break
    case 's':                        h += dy; break
    case 'sw': x += dx;    w -= dx; h += dy; break
    case 'w':  x += dx;    w -= dx;          break
  }

  w = Math.max(16, w); h = Math.max(16, h)

  if (shape.kind === 'rect' || shape.kind === 'note') return { x, y, width: w, height: h } as Partial<Shape>
  if (shape.kind === 'ellipse') return { x: x + w / 2, y: y + h / 2, radiusX: w / 2, radiusY: h / 2 } as Partial<Shape>
  if (shape.kind === 'text') {
    const scale = h / Math.max(1, start.h)
    return { x, y: y + h, fontSize: Math.max(8, Math.round((shape as TextShape).fontSize * scale)) } as Partial<Shape>
  }
  if (shape.kind === 'arrow' || shape.kind === 'pen') {
    const pts = [...(shape as ArrowShape | PenShape).points]
    const sx = w / Math.max(1, start.w), sy = h / Math.max(1, start.h)
    return { points: pts.map((v, i) => i % 2 === 0 ? x + (v - start.x) * sx : y + (v - start.y) * sy) } as Partial<Shape>
  }
  return {}
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
  clientId, onAdd, onUpdate, onDelete, onCursorMove, onSelectChange, onTextClick, onZoomChange, selected
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const applyZoom = useCallback((factor: number, cx?: number, cy?: number) => {
    setCamera(cam => {
      const newZoom = Math.max(0.1, Math.min(20, cam.zoom * factor))
      const pivotX = cx ?? window.innerWidth / 2
      const pivotY = cy ?? window.innerHeight / 2
      const wx = (pivotX - cam.x) / cam.zoom
      const wy = (pivotY - cam.y) / cam.zoom
      return { x: pivotX - wx * newZoom, y: pivotY - wy * newZoom, zoom: newZoom }
    })
  }, [])

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    zoomIn: () => applyZoom(1.25),
    zoomOut: () => applyZoom(0.8),
    resetZoom: () => setCamera({ x: 0, y: 0, zoom: 1 }),
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
  const dragOffsets = useRef<Map<string, { x: number; y: number }>>(new Map())
  const dragging = useRef(false)
  const resizingHandle = useRef<{ handle: Handle; shapeId: string; startBBox: BBox; startMouse: { x: number; y: number } } | null>(null)
  const [hoveredHandle, setHoveredHandle] = useState<Handle | null>(null)

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
      drawShape(rc, ctx, shape, selected.has(shape.id))
    }
    if (draft) drawShape(rc, ctx, draft, false)

    // Resize handles — only when exactly one shape is selected
    if (selected.size === 1) {
      const selShape = shapes.get([...selected][0])
      if (selShape) {
        const bbox = getBBox(selShape)
        if (bbox) {
          const hs = 5 / camera.zoom
          const lw = 1.5 / camera.zoom
          HANDLES.forEach(h => {
            const pos = getHandlePos(bbox, h)
            ctx.fillStyle = hoveredHandle === h ? '#4a72a8' : '#6c8ebf'
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = lw
            ctx.beginPath()
            ctx.rect(pos.x - hs, pos.y - hs, hs * 2, hs * 2)
            ctx.fill()
            ctx.stroke()
          })
        }
      }
    }

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
  }, [shapes, draft, cursors, camera, selected, theme, hoveredHandle])

  useEffect(() => { onZoomChange?.(camera.zoom) }, [camera.zoom, onZoomChange])

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
      if (e.code === 'Space' && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLInputElement)) {
        spaceHeld.current = true; e.preventDefault()
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size > 0 && !(e.target instanceof HTMLInputElement)) {
        selected.forEach(id => onDelete(id))
        onSelectChange(new Set())
      }
    }
    const onUp = (e: KeyboardEvent) => { if (e.code === 'Space') spaceHeld.current = false }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [selected, onDelete, onSelectChange])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    applyZoom(e.deltaY < 0 ? 1.1 : 0.9, e.clientX, e.clientY)
  }, [applyZoom])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const isPan = tool === 'pan' || spaceHeld.current || e.button === 1
    if (isPan) {
      panning.current = true
      panStart.current = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y }
      return
    }

    const world = toWorld(e.clientX, e.clientY, camera)

    // Check resize handles first (only for single selection, select tool)
    if (tool === 'select' && selected.size === 1) {
      const selShape = shapes.get([...selected][0])
      if (selShape) {
        const bbox = getBBox(selShape)
        if (bbox) {
          const tolerance = 8 / camera.zoom
          const hit = HANDLES.find(h => {
            const pos = getHandlePos(bbox, h)
            return Math.abs(world.x - pos.x) <= tolerance && Math.abs(world.y - pos.y) <= tolerance
          })
          if (hit) {
            resizingHandle.current = { handle: hit, shapeId: selShape.id, startBBox: bbox, startMouse: { x: world.x, y: world.y } }
            return
          }
        }
      }
    }

    if (tool === 'select') {
      const arr = [...shapes.values()]
      const hits = arr.filter(s => hitTest(s, world.x, world.y))

      if (hits.length === 0) {
        // Click empty space: clear unless shift (allow box-select later)
        if (!e.shiftKey) onSelectChange(new Set())
        return
      }

      // Pick which shape to act on
      // Cycle through overlaps when clicking the same spot repeatedly (no shift)
      let hit: Shape
      if (e.shiftKey) {
        // Shift+click: toggle topmost hit in/out of selection
        hit = hits[hits.length - 1]
        const next = new Set(selected)
        if (next.has(hit.id)) next.delete(hit.id)
        else next.add(hit.id)
        onSelectChange(next)
        dragging.current = false
        return
      } else {
        // Normal click: cycle through stacked shapes, or pick topmost if none selected here
        const currentIdx = hits.findIndex(s => selected.has(s.id))
        hit = currentIdx !== -1
          ? hits[(currentIdx - 1 + hits.length) % hits.length]
          : hits[hits.length - 1]

        // If the clicked shape isn't already in selection, replace selection
        if (!selected.has(hit.id)) onSelectChange(new Set([hit.id]))
      }

      // Start drag — record offsets for ALL currently selected shapes
      dragging.current = true
      dragOffsets.current = new Map()
      const finalSelected = selected.has(hit.id) ? selected : new Set([hit.id])
      for (const id of finalSelected) {
        const s = shapes.get(id) as RectShape | undefined
        dragOffsets.current.set(id, { x: world.x - (s?.x ?? 0), y: world.y - (s?.y ?? 0) })
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

    // Resize in progress
    if (resizingHandle.current) {
      const { handle, shapeId, startBBox, startMouse } = resizingHandle.current
      const shape = shapes.get(shapeId)
      const dx = world.x - startMouse.x
      const dy = world.y - startMouse.y
      if (shape) onUpdate(shapeId, applyResize(shape, handle, dx, dy, startBBox))
      return
    }

    // Update hovered handle for cursor feedback
    if (tool === 'select' && selected.size === 1) {
      const selShape = shapes.get([...selected][0])
      if (selShape) {
        const bbox = getBBox(selShape)
        if (bbox) {
          const tolerance = 8 / camera.zoom
          const hit = HANDLES.find(h => {
            const pos = getHandlePos(bbox, h)
            return Math.abs(world.x - pos.x) <= tolerance && Math.abs(world.y - pos.y) <= tolerance
          }) ?? null
          setHoveredHandle(hit)
        }
      }
    } else if (hoveredHandle !== null) {
      setHoveredHandle(null)
    }

    if (dragging.current && dragOffsets.current.size > 0) {
      for (const [id, off] of dragOffsets.current) {
        const shape = shapes.get(id)
        if (shape && 'x' in shape) {
          onUpdate(id, { x: world.x - off.x, y: world.y - off.y } as Partial<Shape>)
        }
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
  }, [camera, draft, drawing, selected, shapes, hoveredHandle, onCursorMove, onUpdate, toWorld])

  const handleMouseUp = useCallback(() => {
    panning.current = false
    dragging.current = false
    resizingHandle.current = null

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

  const cursor = resizingHandle.current
    ? HANDLE_CURSORS[resizingHandle.current.handle]
    : hoveredHandle
    ? HANDLE_CURSORS[hoveredHandle]
    : tool === 'pan' || spaceHeld.current ? 'grab'
    : tool === 'select' ? 'default'
    : 'crosshair'

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
