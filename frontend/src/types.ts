export type Tool = 'select' | 'rect' | 'ellipse' | 'arrow' | 'pen' | 'text'

export interface BaseShape {
  id: string
  clientId: string
  clock: number
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
}

export interface RectShape extends BaseShape {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export interface EllipseShape extends BaseShape {
  kind: 'ellipse'
  x: number
  y: number
  radiusX: number
  radiusY: number
}

export interface ArrowShape extends BaseShape {
  kind: 'arrow'
  points: number[]
}

export interface PenShape extends BaseShape {
  kind: 'pen'
  points: number[]
}

export interface TextShape extends BaseShape {
  kind: 'text'
  x: number
  y: number
  text: string
  fontSize: number
}

export type Shape = RectShape | EllipseShape | ArrowShape | PenShape | TextShape

export type Op =
  | { type: 'ADD_SHAPE'; shape: Shape; clientId: string; clock: number }
  | { type: 'UPDATE_SHAPE'; id: string; props: Partial<Shape>; clientId: string; clock: number }
  | { type: 'DELETE_SHAPE'; id: string; clientId: string; clock: number }
  | { type: 'CURSOR_MOVE'; x: number; y: number; clientId: string }

export interface Peer {
  id: string
  name: string
  color: string
}

export interface CursorState {
  x: number
  y: number
  color: string
  name: string
}
