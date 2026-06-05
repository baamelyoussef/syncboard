import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Ellipse, Arrow, Line, Text, Transformer } from 'react-konva'
import { v4 as uuid } from 'uuid'
import type Konva from 'konva'
import type { Tool, Shape, RectShape, EllipseShape, ArrowShape, PenShape, TextShape, CursorState } from '../types'

interface Props {
  shapes: Map<string, Shape>
  cursors: Map<string, CursorState>
  tool: Tool
  color: string
  strokeWidth: number
  clientId: string
  onAdd: (s: Shape) => void
  onUpdate: (id: string, props: Partial<Shape>) => void
  onDelete: (id: string) => void
  onCursorMove: (x: number, y: number) => void
}

export default function Canvas({ shapes, cursors, tool, color, strokeWidth, clientId, onAdd, onUpdate, onDelete, onCursorMove }: Props) {
  const [drawing, setDrawing] = useState(false)
  const [draft, setDraft] = useState<Shape | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const startPos = useRef({ x: 0, y: 0 })
  const trRef = useRef<Konva.Transformer>(null)
  const selectedNodeRef = useRef<Konva.Node | null>(null)
  const penPointsRef = useRef<number[]>([])

  useEffect(() => {
    const handler = () => setStageSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        onDelete(selected)
        setSelected(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, onDelete])

  const getPos = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()!
    return stage.getPointerPosition()!
  }

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      if (e.target === e.target.getStage()) setSelected(null)
      return
    }

    const pos = getPos(e)
    startPos.current = pos
    setDrawing(true)

    const base = {
      id: uuid(),
      clientId,
      clock: 0,
      fill: tool === 'pen' || tool === 'arrow' ? 'transparent' : color + '33',
      stroke: color,
      strokeWidth,
      opacity: 1,
    }

    if (tool === 'rect') {
      setDraft({ ...base, kind: 'rect', x: pos.x, y: pos.y, width: 0, height: 0 } as RectShape)
    } else if (tool === 'ellipse') {
      setDraft({ ...base, kind: 'ellipse', x: pos.x, y: pos.y, radiusX: 0, radiusY: 0 } as EllipseShape)
    } else if (tool === 'arrow') {
      setDraft({ ...base, kind: 'arrow', points: [pos.x, pos.y, pos.x, pos.y] } as ArrowShape)
    } else if (tool === 'pen') {
      penPointsRef.current = [pos.x, pos.y]
      setDraft({ ...base, kind: 'pen', points: [pos.x, pos.y] } as PenShape)
    } else if (tool === 'text') {
      const text = window.prompt('Enter text:')
      if (text) {
        const shape: TextShape = { ...base, kind: 'text', x: pos.x, y: pos.y, text, fontSize: 18 }
        onAdd(shape)
      }
      setDrawing(false)
    }
  }, [tool, color, strokeWidth, clientId, onAdd])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getPos(e)
    onCursorMove(pos.x, pos.y)

    if (!drawing || !draft) return

    if (draft.kind === 'rect') {
      setDraft({ ...draft, width: pos.x - startPos.current.x, height: pos.y - startPos.current.y })
    } else if (draft.kind === 'ellipse') {
      setDraft({
        ...draft,
        radiusX: Math.abs(pos.x - startPos.current.x) / 2,
        radiusY: Math.abs(pos.y - startPos.current.y) / 2,
        x: (pos.x + startPos.current.x) / 2,
        y: (pos.y + startPos.current.y) / 2,
      })
    } else if (draft.kind === 'arrow') {
      setDraft({ ...draft, points: [startPos.current.x, startPos.current.y, pos.x, pos.y] })
    } else if (draft.kind === 'pen') {
      penPointsRef.current = [...penPointsRef.current, pos.x, pos.y]
      setDraft({ ...draft, points: penPointsRef.current })
    }
  }, [drawing, draft, onCursorMove])

  const handleMouseUp = useCallback(() => {
    if (!drawing || !draft) return
    setDrawing(false)
    const isValid =
      (draft.kind === 'rect' && (Math.abs((draft as RectShape).width) > 4 || Math.abs((draft as RectShape).height) > 4)) ||
      (draft.kind === 'ellipse' && ((draft as EllipseShape).radiusX > 2 || (draft as EllipseShape).radiusY > 2)) ||
      (draft.kind === 'arrow') ||
      (draft.kind === 'pen' && (draft as PenShape).points.length > 4)

    if (isValid) onAdd(draft)
    setDraft(null)
  }, [drawing, draft, onAdd])

  const allShapes = [...shapes.values(), ...(draft ? [draft] : [])]

  return (
    <Stage
      width={stageSize.width}
      height={stageSize.height}
      style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Layer>
        {allShapes.map((shape) => {
          const isDraft = shape === draft
          const shapeProps = {
            key: shape.id,
            opacity: shape.opacity,
            stroke: shape.stroke,
            strokeWidth: shape.strokeWidth,
            draggable: tool === 'select' && !isDraft,
            onClick: tool === 'select' && !isDraft ? () => setSelected(shape.id) : undefined,
            onDragEnd: !isDraft ? (e: Konva.KonvaEventObject<DragEvent>) => {
              onUpdate(shape.id, { x: e.target.x(), y: e.target.y() } as Partial<Shape>)
            } : undefined,
          }

          if (shape.kind === 'rect') {
            const r = shape as RectShape
            return (
              <Rect
                {...shapeProps}
                ref={selected === shape.id ? (node) => { selectedNodeRef.current = node; trRef.current?.nodes([node!]) } : undefined}
                x={Math.min(r.x, r.x + r.width)}
                y={Math.min(r.y, r.y + r.height)}
                width={Math.abs(r.width)}
                height={Math.abs(r.height)}
                fill={r.fill}
              />
            )
          }
          if (shape.kind === 'ellipse') {
            const el = shape as EllipseShape
            return <Ellipse {...shapeProps} x={el.x} y={el.y} radiusX={el.radiusX} radiusY={el.radiusY} fill={el.fill} />
          }
          if (shape.kind === 'arrow') {
            const ar = shape as ArrowShape
            return <Arrow {...shapeProps} points={ar.points} fill={ar.stroke} pointerLength={10} pointerWidth={8} />
          }
          if (shape.kind === 'pen') {
            const pen = shape as PenShape
            return <Line {...shapeProps} points={pen.points} tension={0.4} lineCap="round" lineJoin="round" fill="transparent" />
          }
          if (shape.kind === 'text') {
            const tx = shape as TextShape
            return <Text {...shapeProps} x={tx.x} y={tx.y} text={tx.text} fontSize={tx.fontSize} fill={tx.stroke} />
          }
          return null
        })}

        {selected && <Transformer ref={trRef} onTransformEnd={() => {
          const node = selectedNodeRef.current
          if (!node) return
          onUpdate(selected, { x: node.x(), y: node.y() } as Partial<Shape>)
        }} />}

        {/* Remote cursors */}
        {[...cursors.entries()].map(([id, cursor]) => (
          <Text
            key={id}
            x={cursor.x + 8}
            y={cursor.y + 8}
            text={`▲ ${cursor.name}`}
            fontSize={12}
            fill={cursor.color}
            listening={false}
          />
        ))}
      </Layer>
    </Stage>
  )
}
