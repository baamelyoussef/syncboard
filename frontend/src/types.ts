export type Tool = 'select' | 'rect' | 'ellipse' | 'arrow' | 'pen' | 'text' | 'note' | 'pan'

export type FillStyle = 'hachure' | 'solid' | 'none'

export interface BaseShape {
  id: string
  clientId: string
  clock: number
  stroke: string
  strokeWidth: number
  fill: string
  fillStyle: FillStyle
  roughness: number
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

export interface NoteShape extends BaseShape {
  kind: 'note'
  x: number
  y: number
  width: number
  height: number
  text: string
  noteColor: string
}

export type Shape = RectShape | EllipseShape | ArrowShape | PenShape | TextShape | NoteShape

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

export interface Camera {
  x: number
  y: number
  zoom: number
}
