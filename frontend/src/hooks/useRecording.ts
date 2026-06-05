import { useRef, useState } from 'react'

export function useRecording(getCanvas: () => HTMLCanvasElement | null) {
  const [recording, setRecording] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const start = () => {
    const canvas = getCanvas()
    if (!canvas) return

    const stream = canvas.captureStream(30)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'

    const recorder = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `syncboard-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`
      a.click()
      URL.revokeObjectURL(url)
      setRecording(false)
    }

    recorder.start()
    recorderRef.current = recorder
    setRecording(true)
  }

  const stop = () => {
    recorderRef.current?.stop()
  }

  const toggle = () => (recording ? stop() : start())

  return { recording, toggle }
}
