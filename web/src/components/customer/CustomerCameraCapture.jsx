import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  SwitchCamera,
  X,
  ShieldCheck,
  Video,
  Sliders,
} from 'lucide-react';

export function CustomerCameraCapture({ onCapture, tips = [] }) {
  const [stream, setStream] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null); // { file, url }
  const [facingMode, setFacingMode] = useState('environment'); // Rear camera preferred on mobile
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Available video devices for desktop camera selection
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const defaultTips = [
    'Keep entire product visible in the frame',
    'Ensure good lighting and avoid reflections/glare',
    'Focus on the specific damage or serial number',
    'Take photos against a neutral background if possible',
  ];

  const effectiveTips = tips.length > 0 ? tips : defaultTips;

  // Enumerate video input devices when supported
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Unable to enumerate media devices:', err);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsCameraActive(false);
    setIsVideoReady(false);
  }, []);

  // Cleanup media tracks on unmount or navigation away
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Robustly attach stream to video element whenever video element or stream becomes available
  useEffect(() => {
    if (!isCameraActive || !stream || !videoRef.current) return;

    let isSubscribed = true;
    const video = videoRef.current;

    // Direct object assignment
    video.srcObject = stream;

    const handleLoadedMetadata = async () => {
      if (!isSubscribed) return;
      try {
        await video.play();
        if (isSubscribed) {
          setIsVideoReady(true);
        }
      } catch (err) {
        console.warn('Auto play failed:', err);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Fallback: If metadata was already loaded
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      isSubscribed = false;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [stream, isCameraActive]);

  // Start device camera using getUserMedia
  const startCamera = async (mode = facingMode, deviceId = selectedDeviceId) => {
    setCameraError(null);
    setPendingPreview(null);
    setIsVideoReady(false);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Live camera access is not supported on this browser or requires a secure HTTPS connection. Please use a modern browser with camera support.'
      );
      return;
    }

    try {
      // Build platform-appropriate video constraints
      let videoConstraints;

      if (deviceId) {
        // Specific device requested
        videoConstraints = {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        };
      } else {
        // Mobile / Default: prefer facingMode
        videoConstraints = {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        };
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraActive(true);
      setFacingMode(mode);

      // Refresh devices to get device labels now that permission was granted
      refreshDevices();
    } catch (err) {
      console.warn('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission was denied. Please allow camera permissions in your browser address bar settings to photograph damage evidence.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError(
          'No camera device detected on this system. Please connect a webcam or open this verification link on a smartphone with a camera.'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError(
          'The camera is currently in use by another application. Please close other camera tabs or apps and try again.'
        );
      } else {
        // Try fallback to generic video: true without constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = fallbackStream;
          setStream(fallbackStream);
          setIsCameraActive(true);
          refreshDevices();
          return;
        } catch (fallbackErr) {
          setCameraError(
            `Unable to access live camera (${err.message || 'initialization failed'}). Please verify browser camera permissions.`
          );
        }
      }
      setIsCameraActive(false);
    }
  };

  // Switch camera by device ID (Desktop / Multi-camera)
  const handleDeviceChange = (e) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    startCamera(facingMode, newDeviceId);
  };

  // Toggle front/rear camera (Mobile)
  const toggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode, '');
  };

  // Snap photo from video feed
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // If front camera, flip horizontally for natural mirror image
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        setIsCapturing(false);
        if (blob) {
          const file = new File([blob], `live_evidence_${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          const url = URL.createObjectURL(blob);
          stopCamera();
          setPendingPreview({ file, url });
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // Confirm and attach photo to evidence gallery
  const handleConfirmPhoto = () => {
    if (pendingPreview?.file) {
      onCapture(pendingPreview.file);
      setPendingPreview(null);
    }
  };

  // Discard preview and retake
  const handleDiscardPhoto = () => {
    setPendingPreview(null);
    startCamera(facingMode);
  };

  return (
    <div className="w-full space-y-4">
      {/* Hidden canvas used exclusively for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* CAMERA ERROR BANNER */}
      {cameraError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <span className="font-bold block text-amber-900">Live Camera Access Required</span>
            <p className="text-amber-800 leading-relaxed">{cameraError}</p>
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* MODE 1: PENDING PHOTO PREVIEW (BEFORE CONFIRMING) */}
      {pendingPreview ? (
        <div className="bg-white rounded-3xl border border-appBorder shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-appBorder">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold text-darkNeutral block">
                  Live Photo Captured
                </span>
                <span className="text-[11px] text-textSecondary font-mono">
                  {pendingPreview.file?.name} ({(pendingPreview.file?.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDiscardPhoto}
              className="text-textSecondary hover:text-red-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="Discard & Retake"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview Image Container */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] max-h-[460px] bg-neutral-950 rounded-2xl overflow-hidden flex items-center justify-center border border-appBorder">
            <img
              src={pendingPreview.url}
              alt="Live Captured Evidence"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Action Buttons: Retake vs Confirm */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleDiscardPhoto}
              className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-darkNeutral text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake Photo</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmPhoto}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Attach Photo</span>
            </button>
          </div>
        </div>
      ) : isCameraActive ? (
        /* MODE 2: ACTIVE LIVE CAMERA VIEWFINDER */
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] max-h-[480px] bg-neutral-950 rounded-3xl overflow-hidden shadow-md flex items-center justify-center border border-appBorder">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Loading spinner while video stream initializes */}
          {!isVideoReady && (
            <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 z-20">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs font-medium text-slate-300">
                Starting live camera stream...
              </span>
            </div>
          )}

          {/* Viewfinder Target Guidelines */}
          <div className="absolute inset-5 sm:inset-8 md:inset-12 border-2 border-dashed border-white/50 rounded-2xl pointer-events-none flex items-center justify-center">
            <span className="text-[11px] font-semibold text-white/90 bg-black/60 backdrop-blur-xs px-3.5 py-1 rounded-full shadow-xs">
              Center Damage or Defect in Frame
            </span>
          </div>

          {/* Top Camera Controls Bar */}
          <div className="absolute top-3.5 inset-x-3.5 sm:inset-x-5 flex items-center justify-between z-10 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-primary text-white px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Live Camera
              </span>

              {/* Desktop Camera Device Dropdown (when multiple webcams exist) */}
              {videoDevices.length > 1 && (
                <div className="relative hidden sm:block">
                  <select
                    value={selectedDeviceId}
                    onChange={handleDeviceChange}
                    className="bg-black/60 text-white text-[11px] px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    {videoDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId} className="bg-slate-900 text-white">
                        {dev.label || `Camera #${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleCamera}
                className="p-2 rounded-xl bg-black/60 hover:bg-black text-white text-xs backdrop-blur-xs shadow-md transition-colors cursor-pointer"
                title="Switch Camera (Front/Rear)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="p-2 rounded-xl bg-black/60 hover:bg-red-600 text-white text-xs backdrop-blur-xs shadow-md transition-colors cursor-pointer"
                title="Close Camera"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Shutter Button Bar */}
          <div className="absolute bottom-4 sm:bottom-6 inset-x-0 flex items-center justify-center z-10">
            <button
              type="button"
              onClick={takePhoto}
              disabled={isCapturing || !isVideoReady}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/90 hover:bg-white border-4 border-primary shadow-2xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer disabled:opacity-50"
              title="Capture Photo"
            >
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-primary" />
            </button>
          </div>
        </div>
      ) : (
        /* MODE 3: CAMERA-ONLY PROMPT (GALLERY UPLOAD REMOVED) */
        <div className="bg-white rounded-3xl border border-appBorder p-6 sm:p-8 shadow-xs text-center space-y-5">
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-darkNeutral">
              Live Camera Photo Required
            </h3>
            <p className="text-xs sm:text-sm text-textSecondary leading-relaxed">
              To verify physical condition and prevent return discrepancies, evidence must be captured directly using your device camera.
            </p>
          </div>

          {/* Desktop Camera Choice before opening */}
          {videoDevices.length > 1 && (
            <div className="max-w-xs mx-auto">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 text-left">
                Select Camera
              </label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                {videoDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-1 flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => startCamera('environment')}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-[0.99] cursor-pointer"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Open Live Camera</span>
            </button>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Camera-only capture strictly enforced • Gallery disabled</span>
            </div>
          </div>
        </div>
      )}

      {/* Photography Verification Guidelines */}
      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-appBorder">
        <div className="flex items-center gap-2 text-xs font-bold text-darkNeutral mb-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Tips for Fast Verification:</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-textSecondary">
          {effectiveTips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span className="leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
