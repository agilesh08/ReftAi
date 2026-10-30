import React, { useState } from 'react';
import { Camera, Trash2, CheckCircle2, AlertCircle, Eye, ZoomIn } from 'lucide-react';
import { useCustomerFlow } from '../../../context/CustomerFlowContext';
import { CustomerCameraCapture } from '../CustomerCameraCapture';
import { ImageViewerDialog } from '../../common/ImageViewerDialog';

export function CameraEvidenceStep() {
  const { evidenceItems, addEvidenceImage, removeEvidenceImage } = useCustomerFlow();
  const [inspectingItem, setInspectingItem] = useState(null);

  const handleCapture = (file) => {
    addEvidenceImage(file, `Damage Photo #${evidenceItems.length + 1}`);
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-appBorder pb-2">
        <h2 className="text-sm sm:text-base font-bold text-darkNeutral">2. Capture Live Damage Evidence</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Please capture live, clear photos of the physical damage or defect using your device camera. Gallery uploads are disabled to ensure real-time verification integrity.
        </p>
      </div>

      {/* Captured Evidence Gallery */}
      {evidenceItems.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Captured Live Photos ({evidenceItems.length})</span>
            <span className="text-emerald-600 flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Evidence Attached
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {evidenceItems.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => setInspectingItem(item)}
                className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square group shadow-xs cursor-pointer hover:border-primary transition-all"
              >
                <img
                  src={item.url}
                  alt={item.title || `Photo #${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />

                {/* Inspect hover icon */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <div className="bg-black/60 p-2 rounded-xl backdrop-blur-xs flex items-center gap-1 text-[11px] font-semibold">
                    <ZoomIn className="w-4 h-4" />
                    <span>Inspect</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEvidenceImage(idx);
                  }}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-red-600 text-white rounded-lg opacity-80 hover:opacity-100 transition-opacity shadow-sm z-10"
                  title="Remove photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1.5 text-white text-[10px] truncate">
                  Photo #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera & Upload Options Component */}
      <CustomerCameraCapture onCapture={handleCapture} />

      {/* Inspection Modal for Customer Uploaded Evidence */}
      {inspectingItem && (
        <ImageViewerDialog
          isOpen={Boolean(inspectingItem)}
          imageUrl={inspectingItem.url}
          title={inspectingItem.title || 'Damage Evidence Inspection'}
          onClose={() => setInspectingItem(null)}
        />
      )}
    </div>
  );
}
