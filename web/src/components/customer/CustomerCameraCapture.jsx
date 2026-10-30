import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  SwitchCamera,
  X,
  Image as ImageIcon,
} from 'lucide-react';

export function CustomerCameraCapture({ onCapture, tips = [] }) {
  const [stream, setStream] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null); // { file, url, source: 'CAMERA' | 'FILE' }
  const [facingMode, setFacingMode] = useState('environment'); // Rear camera preferred
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const defaultTips = [
    'Keep entire product visible in the frame',
    'Ensure good lighting and avoid reflections/glare',
    'Focus on the specific damage or serial number',
    'Take photos against a neutral background if possible',
  ];

  const effectiveTips = tips.length > 0 ? tips : defaultTips;

  // Cleanup media tracks on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  // Start device camera
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    setPendingPreview(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera access is not supported on this browser or requires an HTTPS connection. Please use "Upload From Device".');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsCameraActive(true);
      setFacingMode(mode);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings or use "Upload From Device".');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device found on this system. Please use "Upload From Device".');
      } else {
        setCameraError('Unable to start camera. Please use "Upload From Device" to select a photo.');
      }
      setIsCameraActive(false);
    }
  };

  // Toggle front/rear camera
  const toggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  // Snap photo from video feed
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
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
          const file = new File([blob], `camera_evidence_${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          const url = URL.createObjectURL(blob);
          stopCamera();
          setPendingPreview({ file, url, source: 'CAMERA' });
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // File picker selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      const url = URL.createObjectURL(file);
      setPendingPreview({ file, url, source: 'FILE' });
    }
    // Reset file input value to allow selecting same file again if needed
    e.target.value = '';
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
    const wasCamera = pendingPreview?.source === 'CAMERA';
    setPendingPreview(null);
    if (wasCamera) {
      startCamera(facingMode);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input without capture attribute so device gallery opens */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* CAMERA ERROR BANNER */}
      {cameraError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Camera Notice</span>
            <span>{cameraError}</span>
          </div>
        </div>
      )}

      {/* MODE 1: PENDING PHOTO PREVIEW (BEFORE ATTACHING) */}
      {pendingPreview ? (
        <div className="bg-white rounded-2xl border border-appBorder shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-appBorder">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-darkNeutral block">
                  {pendingPreview.source === 'CAMERA'
                    ? 'Photo Captured Successfully'
                    : 'Photo Selected From Device'}
                </span>
                <span className="text-[11px] text-textSecondary font-mono">
                  {pendingPreview.file?.name} ({(pendingPreview.file?.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDiscardPhoto}
              className="text-textSecondary hover:text-red-600 p-1 rounded-lg"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview Image Container */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-neutral-950 rounded-xl overflow-hidden flex items-center justify-center border border-appBorder">
            <img
              src={pendingPreview.url}
              alt="Evidence Preview"
              className="max-h-full max-w-full object-contain rounded-md"
            />
          </div>

          {/* Confirmation Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDiscardPhoto}
              className="w-full sm:w-auto px-4 py-2.5 border border-appBorder hover:bg-slate-50 text-darkNeutral text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{pendingPreview.source === 'CAMERA' ? 'Retake Photo' : 'Choose Another'}</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmPhoto}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Attach Photo</span>
            </button>
          </div>
        </div>
      ) : isCameraActive ? (
        /* MODE 2: ACTIVE LIVE CAMERA VIEWFINDER */
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-neutral-950 rounded-2xl overflow-hidden shadow-md flex items-center justify-center border border-appBorder">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Viewfinder Target Guidelines */}
          <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-white/50 rounded-2xl pointer-events-none flex items-center justify-center">
            <span className="text-[11px] font-semibold text-white/80 bg-black/50 backdrop-blur-xs px-3 py-1 rounded-full">
              Center Damage Area In Frame
            </span>
          </div>

          {/* Top Camera Controls Bar */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between">
            <span className="text-[10px] font-bold bg-primary text-white px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Live Camera
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleCamera}
                className="p-2 rounded-xl bg-black/60 hover:bg-black text-white text-xs backdrop-blur-xs shadow-md transition-colors"
                title="Switch Camera (Front/Back)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="p-2 rounded-xl bg-black/60 hover:bg-red-600 text-white text-xs backdrop-blur-xs shadow-md transition-colors"
                title="Close Camera"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Shutter Button Bar */}
          <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={takePhoto}
              disabled={isCapturing}
              className="w-16 h-16 rounded-full bg-white/90 hover:bg-white border-4 border-primary shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
              title="Take Photo"
            >
              <div className="w-12 h-12 rounded-full bg-primary" />
            </button>
          </div>
        </div>
      ) : (
        /* MODE 3: TWO CLEARLY VISIBLE UPLOAD OPTIONS */
        <div className="bg-white rounded-2xl border border-appBorder p-5 sm:p-6 shadow-xs space-y-4">
          <div className="text-center max-w-sm mx-auto space-y-1">
            <h3 className="text-sm font-bold text-darkNeutral">Choose Capture Method</h3>
            <p className="text-xs text-textSecondary">
              Take a live photo directly or select an existing clear image from your device.
            </p>
          </div>

          {/* TWO PROMINENT BUTTON CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* OPTION A: CAPTURE USING CAMERA */}
            <button
              type="button"
              onClick={() => startCamera('environment')}
              className="p-4 sm:p-5 rounded-2xl border-2 border-primary/20 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left flex items-start gap-3.5 group active:scale-[0.99] shadow-xs"
            >
              <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-darkNeutral group-hover:text-primary transition-colors">
                    Capture Using Camera
                  </span>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-textSecondary mt-1 leading-relaxed">
                  Open device camera to photograph physical damage with authentic lighting and depth.
                </p>
              </div>
            </button>

            {/* OPTION B: UPLOAD IMAGE FROM DEVICE */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 sm:p-5 rounded-2xl border border-appBorder hover:border-slate-400 bg-white hover:bg-slate-50/80 transition-all text-left flex items-start gap-3.5 group active:scale-[0.99] shadow-xs"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-darkNeutral group-hover:text-primary transition-colors">
                    Upload From Device
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Files / Gallery
                  </span>
                </div>
                <p className="text-[11px] text-textSecondary mt-1 leading-relaxed">
                  Select existing photo files from your phone gallery or computer storage (JPG, PNG, WebP).
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Photography Verification Guidelines */}
      <div className="bg-surface-variant p-4 rounded-xl border border-appBorder">
        <div className="flex items-center gap-1.5 text-xs font-bold text-darkNeutral mb-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Tips for Fast Verification:</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-textSecondary">
          {effectiveTips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-primary font-bold">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
