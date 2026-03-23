import { useRef, useState, useCallback, useEffect } from 'react'

interface UseMediaRecorderReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  isStreamReady: boolean
  isRecording: boolean
  error: string | null
  startCamera: () => Promise<void>
  startRecording: () => void
  stopRecording: () => Promise<Blob | null>
  stopCamera: () => void
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const videoRef = useRef<HTMLVideoElement>(null!)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const resolveRecordingRef = useRef<((blob: Blob | null) => void) | null>(null)

  const [isStreamReady, setIsStreamReady] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        await videoRef.current.play()
      }
      setIsStreamReady(true)
    } catch (err) {
      setError('Camera access is required for this interview. Please allow camera and microphone access.')
      console.error('Camera error:', err)
    }
  }, [])

  const startRecording = useCallback(() => {
    if (!streamRef.current) return

    chunksRef.current = []

    // Prefer webm since Gemini handles it natively
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm'

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType,
      videoBitsPerSecond: 1_000_000, // 1 Mbps — keeps files small
    })

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      resolveRecordingRef.current?.(blob)
      resolveRecordingRef.current = null
    }

    mediaRecorderRef.current = recorder
    recorder.start(1000) // Collect in 1s chunks
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null)
        return
      }
      resolveRecordingRef.current = resolve
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    })
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsStreamReady(false)
    setIsRecording(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return {
    videoRef,
    isStreamReady,
    isRecording,
    error,
    startCamera,
    startRecording,
    stopRecording,
    stopCamera,
  }
}
