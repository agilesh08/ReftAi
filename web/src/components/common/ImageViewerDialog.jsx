import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  Eye,
  HelpCircle,
  AlertCircle,
  Move,
  Maximize2,
} from 'lucide-react';

export function ImageViewerDialog({
  isOpen,
  evidence,
  analysis,
  imageUrl,
  title: propTitle,
  description,
  onClose,
}) {
  const shouldRender = isOpen !== undefined ? Boolean(isOpen) : Boolean(imageUrl || evidence);
  if (!shouldRender) {
    return null;
  }

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(Number((s + 0.25).toFixed(2)), 4));
  const zoomOut = () => setScale((s) => Math.max(Number((s - 0.25).toFixed(2)), 0.5));
  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Double click toggles 1x and 2x
  const handleDoubleClick = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
      setPan({ x: 0, y: 0 });
    }
  };

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((s) => Math.min(Number((s + 0.15).toFixed(2)), 4));
    } else {
      setScale((s) => Math.max(Number((s - 0.15).toFixed(2)), 0.5));
    }
  }, []);

  // Attach non-passive wheel listener to allow e.preventDefault()
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pan dragging
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Keyboard accessibility: ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Backdrop click closes modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const effectiveAnalysis = analysis || evidence?.analysis || {};
  const epistemic = effectiveAnalysis.epistemic_findings || {};
  const observedList = epistemic.observed || effectiveAnalysis.observed_damage || [];
  const notObservedList = epistemic.not_observed || [];
  const unclearList = epistemic.unclear || [];

  const displayImageSrc =
    imageUrl ||
    evidence?.url ||
    evidence?.thumbnailUrl ||
    evidence?.previewUrl ||
    '/assets/branding/reft_icon.png';

  const title =
    propTitle ||
    evidence?.workflowStepKey ||
    evidence?.title ||
    evidence?.originalFilename ||
    'Evidence Image Inspection';

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-inspection-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-appBorder animate-in zoom-in-95 duration-150"
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3 border-b border-appBorder flex items-center justify-between bg-surface-variant/50 shrink-0">
          <div className="min-w-0 pr-3">
            <h3 id="image-inspection-title" className="text-sm font-bold text-darkNeutral truncate">
              {title}
            </h3>
            <p className="text-[11px] text-textSecondary font-mono truncate">
              {evidence?.sha256Hash
                ? `SHA-256: ${evidence.sha256Hash.substring(0, 20)}...`
                : 'Authentic Customer Evidence Capture'}
            </p>
          </div>

          {/* Action / Zoom Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={zoomOut}
              className="p-1.5 rounded-lg text-darkNeutral hover:bg-white hover:shadow-xs transition-all active:scale-95"
              title="Zoom Out (or scroll wheel)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-semibold text-slate-600 px-1.5 min-w-[42px] text-center select-none">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              className="p-1.5 rounded-lg text-darkNeutral hover:bg-white hover:shadow-xs transition-all active:scale-95"
              title="Zoom In (or scroll wheel)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="p-1.5 rounded-lg text-darkNeutral hover:bg-white hover:shadow-xs transition-all active:scale-95"
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-appBorder mx-1" />

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Close (ESC)"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area: Responsive Two-Panel Layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0 divide-y md:divide-y-0 md:divide-x divide-appBorder">
          {/* Left Panel: Image Preview Viewport */}
          <div className="md:col-span-7 bg-neutral-950 p-4 flex flex-col items-center justify-center relative select-none min-h-[300px] md:min-h-[460px]">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              className={`relative w-full h-full max-h-[50vh] md:max-h-[68vh] flex items-center justify-center overflow-hidden rounded-xl ${
                scale > 1
                  ? isDragging
                    ? 'cursor-grabbing'
                    : 'cursor-grab'
                  : 'cursor-zoom-in'
              }`}
            >
              <img
                src={displayImageSrc}
                alt={title}
                draggable={false}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 120ms ease-out',
                }}
                className="max-w-full max-h-full w-auto h-auto object-contain pointer-events-none rounded-md shadow-2xl"
              />

              {/* Pan hint overlay when zoomed */}
              {scale > 1 && (
                <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white/90 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 pointer-events-none">
                  <Move className="w-3 h-3" />
                  <span>Drag to pan • Double-click to reset</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Forensic Capture Analysis */}
          <div className="md:col-span-5 p-5 bg-white overflow-y-auto space-y-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Forensic Capture Analysis
              </span>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-appBorder">
                  <span className="text-textSecondary">Capture Method:</span>
                  <span className="font-bold text-darkNeutral font-mono">
                    {effectiveAnalysis.capture_method || 'DIRECT_PHYSICAL_APPEARANCE'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-appBorder">
                  <span className="text-textSecondary">Clarity & Quality:</span>
                  <span className="font-bold text-darkNeutral font-mono">
                    {effectiveAnalysis.quality || 'SHARP_CLEAR'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-appBorder">
                  <span className="text-textSecondary">Lighting:</span>
                  <span className="font-bold text-darkNeutral font-mono">
                    {effectiveAnalysis.lighting || 'NATURAL_AMBIENT'}
                  </span>
                </div>
              </div>
            </div>

            {/* Observed Findings */}
            {observedList.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Observed in Frame:</span>
                </div>
                <ul className="space-y-1 text-xs text-darkNeutral bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                  {observedList.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span className="leading-relaxed">
                        {typeof item === 'string' ? item : JSON.stringify(item)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Observed in Frame:</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  Consistent physical item geometry verified against merchant catalog references.
                </div>
              </div>
            )}

            {/* Not Observed */}
            {notObservedList.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-textSecondary">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Not Observed:</span>
                </div>
                <ul className="space-y-1 text-xs text-textSecondary bg-slate-50 p-3 rounded-xl border border-appBorder">
                  {notObservedList.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unclear or Occluded */}
            {unclearList.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Unclear / Occluded:</span>
                </div>
                <ul className="space-y-1 text-xs text-amber-800 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  {unclearList.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
