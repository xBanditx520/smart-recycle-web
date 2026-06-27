import { useEffect, useRef, useState } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onError: (message: string) => void;
  onUploadClick?: () => void;
  disabled?: boolean;
}

type FacingMode = 'user' | 'environment';
type CameraStatus = 'idle' | 'starting' | 'active' | 'error';

export default function CameraCapture({ onCapture, onError, onUploadClick, disabled = false }: CameraCaptureProps) {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playTokenRef = useRef(0);

  // Cache device IDs after first permission grant to avoid re-prompts on flip
  const cachedDeviceIdsRef = useRef<string[]>([]);
  const activeDeviceIndexRef = useRef(0);

  const isActive = status === 'active';

  useEffect(() => {
    startStream('environment');
    return () => stopStream();
  }, []);

  async function cacheDeviceIds(activeDeviceId: string) {
    const all = await navigator.mediaDevices.enumerateDevices();
    const cameras = all
      .filter((d) => d.kind === 'videoinput' && d.deviceId !== '')
      .map((d) => d.deviceId);
    if (cameras.length === 0) return;
    // Put the active (back) camera first so index 0 = current
    const others = cameras.filter((id) => id !== activeDeviceId);
    cachedDeviceIdsRef.current = [activeDeviceId, ...others];
    activeDeviceIndexRef.current = 0;
  }

  async function startStream(mode: FacingMode) {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError('Camera is not supported in this browser.');
      return;
    }

    setStatus('starting');
    setErrorMessage('');
    const token = playTokenRef.current + 1;
    playTokenRef.current = token;

    try {
      const hasCachedDevices = cachedDeviceIdsRef.current.length > 0;
      const targetId = hasCachedDevices
        ? cachedDeviceIdsRef.current[activeDeviceIndexRef.current]
        : undefined;

      const videoConstraints: MediaTrackConstraints = targetId
        ? { deviceId: { exact: targetId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } };

      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });

      // After first successful permission grant, cache all camera device IDs.
      // Subsequent switches use deviceId instead of facingMode, which avoids
      // the browser re-prompting for permission on iOS/Android.
      if (!hasCachedDevices) {
        const activeId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? '';
        if (activeId) await cacheDeviceIds(activeId);
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          if (playTokenRef.current !== token || streamRef.current !== stream) return;
          const message = playError instanceof Error ? playError.message : 'Unable to start the camera.';
          setStatus('error');
          setErrorMessage(message);
          onError(message);
          return;
        }
      }

      if (playTokenRef.current === token) setStatus('active');
    } catch (error) {
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Unable to access the camera.';
      setErrorMessage(message);
      onError(message);
    }
  }

  function stopStream() {
    playTokenRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }

  async function handleRetry() {
    await startStream(facingMode);
  }

  async function handleSwitchCamera() {
    const nextMode: FacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);

    if (cachedDeviceIdsRef.current.length > 1) {
      activeDeviceIndexRef.current =
        (activeDeviceIndexRef.current + 1) % cachedDeviceIdsRef.current.length;
    }

    if (isActive) {
      stopStream();
      await startStream(nextMode);
    }
  }

  async function handleCapture() {
    if (!videoRef.current || !canvasRef.current) {
      onError('Camera stream is not ready.');
      return;
    }

    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;

    if (!width || !height) {
      onError('Camera stream is not ready.');
      return;
    }

    canvasRef.current.width = width;
    canvasRef.current.height = height;

    const context = canvasRef.current.getContext('2d');
    if (!context) {
      onError('Canvas is not supported in this browser.');
      return;
    }

    context.drawImage(videoRef.current, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvasRef.current?.toBlob(resolve, 'image/jpeg', 0.92);
    });

    if (!blob) {
      onError('Failed to capture image from the camera.');
      return;
    }

    onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
  }

  return (
    <section className="camera-panel camera-main">
      <div className="camera-shell">
        <video ref={videoRef} playsInline muted className="camera-video" />

        {!isActive ? (
          <div className="camera-overlay">
            <div>
              <strong>{status === 'error' ? 'Camera unavailable' : 'Camera is off'}</strong>
              <span>Allow camera access to continue.</span>
              <button className="secondary-button" type="button" onClick={handleRetry} disabled={disabled}>
                Enable camera
              </button>
            </div>
          </div>
        ) : null}

        {/* Controls float inside the camera shell */}
        <div className="camera-controls camera-controls-main">
          <button className="camera-icon" type="button" onClick={onUploadClick} disabled={disabled}>
            Upload
          </button>
          <button
            className="camera-shutter"
            type="button"
            onClick={handleCapture}
            disabled={disabled || status !== 'active'}
            aria-label="Capture photo"
          />
          <button
            className="camera-icon"
            type="button"
            onClick={handleSwitchCamera}
            disabled={disabled || status !== 'active'}
          >
            Flip
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="camera-canvas" />
      {errorMessage ? <p className="camera-meta">{errorMessage}</p> : null}
    </section>
  );
}
