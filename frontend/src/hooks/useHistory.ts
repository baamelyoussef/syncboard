import { useCallback, useRef, useState } from 'react'

interface Command {
  undo: () => void
  redo: () => void
}

export function useHistory() {
  const undoStack = useRef<Command[]>([])
  const redoStack = useRef<Command[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const sync = () => {
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(redoStack.current.length > 0)
  }

  const push = useCallback((cmd: Command) => {
    undoStack.current.push(cmd)
    redoStack.current = []
    sync()
  }, [])

  const undo = useCallback(() => {
    const cmd = undoStack.current.pop()
    if (!cmd) return
    cmd.undo()
    redoStack.current.push(cmd)
    sync()
  }, [])

  const redo = useCallback(() => {
    const cmd = redoStack.current.pop()
    if (!cmd) return
    cmd.redo()
    undoStack.current.push(cmd)
    sync()
  }, [])

  return { push, undo, redo, canUndo, canRedo }
}
