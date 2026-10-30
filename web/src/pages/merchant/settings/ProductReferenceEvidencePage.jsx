import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Maximize2,
  Trash2,
  RefreshCw,
  Package,
  RotateCw,
  Image as ImageIcon,
} from 'lucide-react';
import { useMerchant } from '../../../context/MerchantContext';
import { referenceService } from '../../../services/api/referenceService';
import { productService } from '../../../services/api/productService';
import { MerchantHeader } from '../../../components/common/MerchantHeader';
import { ImageViewerDialog } from '../../../components/common/ImageViewerDialog';

const CANONICAL_ANGLES = [
  { id: 'FRONT', name: 'Front View', description: 'Straight-on view showing brand logos, model markings, and front surface.' },
  { id: 'BACK', name: 'Back View', description: 'Rear panel showing serial number, barcode, labels, and rear ports.' },
  { id: 'LEFT', name: 'Left Profile', description: 'Side profile angle showing edge seams, physical buttons, or hinges.' },
  { id: 'RIGHT', name: 'Right Profile', description: 'Opposite side profile showing ports, controls, and perimeter curvature.' },
];

export function ProductReferenceEvidencePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, refreshData } = useMerchant();

  const [product, setProduct] = useState(() => products.find((p) => p.id === id) || null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(!products.find((p) => p.id === id));
  const [productNotFound, setProductNotFound] = useState(false);

  useEffect(() => {
    const existing = products.find((p) => p.id === id);
    if (existing) {
      setProduct(existing);
      setIsLoadingProduct(false);
    }
  }, [products, id]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    productService
      .getProduct(id)
      .then((data) => {
        if (!isMounted) return;
        setProduct(data);
        setIsLoadingProduct(false);
        setProductNotFound(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Error fetching product by ID:', err.message);
        if (!products.find((p) => p.id === id)) {
          setProductNotFound(true);
        }
        setIsLoadingProduct(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id, products]);

  const [referenceImages, setReferenceImages] = useState({
    FRONT: null,
    BACK: null,
    LEFT: null,
    RIGHT: null,
  });

  const [referenceMetadata, setReferenceMetadata] = useState({});
  const [completeness, setCompleteness] = useState(null);
  const [imageLoading, setImageLoading] = useState({ FRONT: false, BACK: false, LEFT: false, RIGHT: false });
  const [imageErrors, setImageErrors] = useState({ FRONT: false, BACK: false, LEFT: false, RIGHT: false });
  const [cacheBuster, setCacheBuster] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState(null);

  const loadReferences = useCallback(async () => {
    if (!id) return;
    try {
      const [refs, comp] = await Promise.allSettled([
        referenceService.listReferences(id),
        productService.getProductCompleteness(id),
      ]);

      if (refs.status === 'fulfilled' && Array.isArray(refs.value)) {
        const mapped = { FRONT: null, BACK: null, LEFT: null, RIGHT: null };
        const meta = {};
        refs.value.forEach((r) => {
          if (r.angle) {
            const angleKey = r.angle.toUpperCase();
            mapped[angleKey] = referenceService.getReferenceFileUrl(id, angleKey);
            meta[angleKey] = r;
          }
        });
        setReferenceImages(mapped);
        setReferenceMetadata(meta);
      }

      if (comp.status === 'fulfilled' && comp.value) {
        setCompleteness(comp.value);
      }
    } catch (err) {
      console.warn('API listReferences error:', err.message);
    }
  }, [id]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  if (isLoadingProduct && !product) {
    return (
      <div className="min-h-screen bg-appBg flex flex-col">
        <MerchantHeader
          title="Product Reference Baseline"
          subtitle="Loading product information..."
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl border border-appBorder text-center max-w-sm w-full space-y-3">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-darkNeutral">Loading Product References</h3>
            <p className="text-xs text-slate-500">Retrieving trusted 4-angle visual baselines...</p>
          </div>
        </div>
      </div>
    );
  }

  if (productNotFound || !product) {
    return (
      <div className="min-h-screen bg-appBg flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-appBorder text-center max-w-sm w-full space-y-3">
          <Package className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-darkNeutral">Product Not Found</h3>
          <p className="text-xs text-slate-500">
            The requested product does not exist in your catalog or has been removed.
          </p>
          <button
            onClick={() => navigate('/settings/products')}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
          >
            Back to Product Catalog
          </button>
        </div>
      </div>
    );
  }

  const uploadedCount = Object.keys(referenceImages).filter((k) => !!referenceImages[k]).length;
  const rawStatus = (
    completeness?.reference_processing_status ||
    product.reference_processing_status ||
    product.referenceStatus ||
    'NOT_READY'
  ).toUpperCase();

  // Exact prompt state specification:
  // - 0/4 — NOT_READY
  // - 1/4 — INCOMPLETE
  // - 2/4 — INCOMPLETE
  // - 3/4 — INCOMPLETE
  // - 4/4 — PROCESSING
  // - 4/4 — READY
  // - 4/4 — FAILED
  let displayStatus = 'NOT_READY';
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

  if (rawStatus === 'FAILED') {
    displayStatus = 'FAILED';
    badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
  } else if (rawStatus === 'PROCESSING') {
    displayStatus = 'PROCESSING';
    badgeColor = 'bg-sky-100 text-sky-800 border-sky-200 animate-pulse';
  } else if (rawStatus === 'READY' && uploadedCount >= 4) {
    displayStatus = 'READY';
    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  } else if (uploadedCount === 0) {
    displayStatus = 'NOT_READY';
    badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
  } else if (uploadedCount < 4) {
    displayStatus = 'INCOMPLETE';
    badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
  } else {
    displayStatus = 'PROCESSING';
    badgeColor = 'bg-sky-100 text-sky-800 border-sky-200';
  }

  const handleUploadAngle = async (angleId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error state for this angle
    setImageErrors((prev) => ({ ...prev, [angleId]: false }));

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setReferenceImages((prev) => ({ ...prev, [angleId]: objectUrl }));

    setIsProcessing(true);
    try {
      await referenceService.uploadReference(product.id, angleId, file);
      // Invalidate cache key to ensure freshly uploaded binary loads
      setCacheBuster((prev) => ({ ...prev, [angleId]: Date.now() }));
      await loadReferences();
      await refreshData();
    } catch (err) {
      console.error('Failed to upload reference to backend:', err);
      setImageErrors((prev) => ({ ...prev, [angleId]: true }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveAngle = async (angleId) => {
    try {
      await referenceService.deleteReference(product.id, angleId);
      setReferenceImages((prev) => ({ ...prev, [angleId]: null }));
      setReferenceMetadata((prev) => {
        const next = { ...prev };
        delete next[angleId];
        return next;
      });
      setImageErrors((prev) => ({ ...prev, [angleId]: false }));
      await loadReferences();
      await refreshData();
    } catch (err) {
      console.warn('API deleteReference error:', err.message);
      setReferenceImages((prev) => ({ ...prev, [angleId]: null }));
    }
  };

  const handleRetryImage = (angleId) => {
    setImageErrors((prev) => ({ ...prev, [angleId]: false }));
    setImageLoading((prev) => ({ ...prev, [angleId]: true }));
    setCacheBuster((prev) => ({ ...prev, [angleId]: Date.now() }));
  };

  return (
    <div className="min-h-screen bg-appBg flex flex-col">
      <MerchantHeader
        title={`Reference Imagery: ${product.name}`}
        subtitle="Canonical baseline angles used for neural multimodal verification"
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation & Header Status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={() => navigate('/settings/products')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Products Catalog
          </button>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${badgeColor}`}
            >
              {uploadedCount}/4 — {displayStatus}
            </span>

            <button
              onClick={() => {
                loadReferences();
                refreshData();
              }}
              title="Refresh status"
              className="p-1.5 text-slate-500 hover:text-primary hover:bg-white rounded-lg border border-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* AI Processing Banner */}
        {(isProcessing || rawStatus === 'PROCESSING') && (
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 flex items-center justify-between shadow-xs animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
              <div>
                <span className="text-xs font-bold block">
                  AI is analyzing and consolidating your reference images...
                </span>
                <span className="text-[11px] text-sky-700 block">
                  Extracting keypoint descriptors, surface geometry, and building trusted Product Visual Profile.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-white px-2 py-0.5 rounded-md border border-sky-100">
              Non-Blocking
            </span>
          </div>
        )}

        {/* 4 Canonical Angles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {CANONICAL_ANGLES.map((angle) => {
            const imageUrl = referenceImages[angle.id];
            const hasImage = Boolean(imageUrl);
            const buster = cacheBuster[angle.id];
            const fullUrl = imageUrl ? (buster ? `${imageUrl}&cb=${buster}` : imageUrl) : null;
            const hasError = imageErrors[angle.id];
            const meta = referenceMetadata[angle.id];
            const angleAnalysisStatus = completeness?.angle_analysis_status?.[angle.id] || 'READY';

            return (
              <div
                key={angle.id}
                className="bg-white rounded-2xl border border-appBorder shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-appBorder flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="font-bold text-xs text-darkNeutral flex items-center gap-1.5">
                      <span>{angle.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 font-normal">
                        ({angle.id})
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{angle.description}</p>
                  </div>
                  {hasImage && !hasError ? (
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  ) : hasError ? (
                    <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      Load Error
                    </span>
                  ) : (
                    <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      Missing
                    </span>
                  )}
                </div>

                {/* Preview / Upload Area */}
                <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[220px]">
                  {hasImage ? (
                    hasError ? (
                      <div className="w-full aspect-video rounded-xl border border-rose-200 bg-rose-50/60 p-4 flex flex-col items-center justify-center text-center">
                        <AlertTriangle className="w-6 h-6 text-rose-500 mb-2" />
                        <span className="text-xs font-bold text-rose-800">
                          Image preview unavailable
                        </span>
                        <p className="text-[11px] text-rose-600 mt-0.5 mb-3">
                          The reference file on disk could not be rendered.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRetryImage(angle.id)}
                            className="px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <RotateCw className="w-3 h-3" /> Retry Load
                          </button>
                          <label className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                            Replace File
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleUploadAngle(angle.id, e)}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 group bg-slate-900/5 flex items-center justify-center">
                        <img
                          src={fullUrl}
                          alt={angle.name}
                          onLoad={() => setImageLoading((prev) => ({ ...prev, [angle.id]: false }))}
                          onError={() => {
                            setImageLoading((prev) => ({ ...prev, [angle.id]: false }));
                            setImageErrors((prev) => ({ ...prev, [angle.id]: true }));
                          }}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPreview({
                                url: fullUrl,
                                title: `${product.name} — ${angle.name}`,
                                description: `Canonical Reference Angle (${angle.id}) • Hash: ${meta?.image_hash ? meta.image_hash.slice(0, 16) + '...' : 'Verified'}`,
                              })
                            }
                            className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl transition-transform hover:scale-105 shadow-md"
                            title="Inspect Deep Zoom & Pan"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAngle(angle.id)}
                            className="p-2 bg-red-600/90 hover:bg-red-600 text-white rounded-xl transition-transform hover:scale-105 shadow-md"
                            title="Remove Reference"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <label className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-200 hover:border-primary/50 transition-colors flex flex-col items-center justify-center p-4 cursor-pointer bg-slate-50/50 hover:bg-primary/5">
                      <Upload className="w-6 h-6 text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-primary">Upload {angle.name}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP up to 10MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUploadAngle(angle.id, e)}
                      />
                    </label>
                  )}
                </div>

                {/* Footer Controls & Metadata */}
                <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                    {meta?.image_hash ? `SHA256: ${meta.image_hash.slice(0, 10)}...` : `KEY: ${angle.id}`}
                  </div>
                  {hasImage && (
                    <label className="text-primary font-bold hover:underline cursor-pointer text-xs flex items-center gap-1">
                      <span>Replace Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUploadAngle(angle.id, e)}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Deep Zoom & Pan Inspector Modal */}
      {selectedPreview && (
        <ImageViewerDialog
          isOpen={Boolean(selectedPreview)}
          onClose={() => setSelectedPreview(null)}
          imageUrl={selectedPreview?.url}
          title={selectedPreview?.title}
          description={selectedPreview?.description}
        />
      )}
    </div>
  );
}
