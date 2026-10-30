import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  User,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Plus,
  Layers,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Camera,
  Maximize2,
  Eye,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useMerchant } from '../../context/MerchantContext';
import { MerchantHeader } from '../../components/common/MerchantHeader';
import { QuickAddProductDialog } from '../../components/merchant/QuickAddProductDialog';
import { productService } from '../../services/api/productService';
import { referenceService } from '../../services/api/referenceService';
import { ImageViewerDialog } from '../../components/common/ImageViewerDialog';

const REFUND_REASONS = [
  'Damaged on arrival',
  'Defective / Not functioning',
  'Wrong item received',
  'Missing parts or accessories',
  'Counterfeit / Authenticity doubt',
  'Item significantly not as described',
  'Other',
];

const CANONICAL_ANGLES = [
  { id: 'FRONT', name: 'Front View', label: 'FRONT' },
  { id: 'BACK', name: 'Back View', label: 'BACK' },
  { id: 'LEFT', name: 'Left Profile', label: 'LEFT' },
  { id: 'RIGHT', name: 'Right Profile', label: 'RIGHT' },
];

export function CreateVerificationPage() {
  const navigate = useNavigate();
  const { products, workflows, createVerification, addProduct } = useMerchant();

  // Form states
  const [orderId, setOrderId] = useState(`ORD-${Math.floor(10000 + Math.random() * 90000)}`);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [refundAmount, setRefundAmount] = useState('49.99');
  const [reason, setReason] = useState(REFUND_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(workflows[0]?.id || '');
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [requireCameraOnly, setRequireCameraOnly] = useState(true);

  React.useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  React.useEffect(() => {
    if (!selectedWorkflowId && workflows.length > 0) {
      const activeWf = workflows.find((w) => w.status === 'ACTIVE') || workflows[0];
      setSelectedWorkflowId(activeWf.id);
    }
  }, [workflows, selectedWorkflowId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [liveCompleteness, setLiveCompleteness] = useState(null);
  const [referenceImages, setReferenceImages] = useState({
    FRONT: null,
    BACK: null,
    LEFT: null,
    RIGHT: null,
  });
  const [referenceMetadata, setReferenceMetadata] = useState({});
  const [isRefLoading, setIsRefLoading] = useState(false);
  const [imgLoadErrors, setImgLoadErrors] = useState({});
  const [selectedPreview, setSelectedPreview] = useState(null);

  // Selected product reference readiness check synchronized with backend
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  React.useEffect(() => {
    if (!selectedProductId) {
      setReferenceImages({ FRONT: null, BACK: null, LEFT: null, RIGHT: null });
      setReferenceMetadata({});
      setLiveCompleteness(null);
      return;
    }

    let isMounted = true;
    setIsRefLoading(true);
    setImgLoadErrors({});

    Promise.allSettled([
      productService.getProductCompleteness(selectedProductId),
      referenceService.listReferences(selectedProductId),
    ])
      .then(([compRes, refsRes]) => {
        if (!isMounted) return;

        if (compRes.status === 'fulfilled' && compRes.value) {
          setLiveCompleteness(compRes.value);
        }

        if (refsRes.status === 'fulfilled' && Array.isArray(refsRes.value)) {
          const mapped = { FRONT: null, BACK: null, LEFT: null, RIGHT: null };
          const meta = {};
          refsRes.value.forEach((r) => {
            if (r.angle) {
              const angleKey = r.angle.toUpperCase();
              mapped[angleKey] = referenceService.getReferenceFileUrl(selectedProductId, angleKey);
              meta[angleKey] = r;
            }
          });
          setReferenceImages(mapped);
          setReferenceMetadata(meta);
        } else {
          setReferenceImages({ FRONT: null, BACK: null, LEFT: null, RIGHT: null });
          setReferenceMetadata({});
        }
      })
      .catch((err) => {
        console.warn('API getProductCompleteness error:', err);
      })
      .finally(() => {
        if (isMounted) setIsRefLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProductId]);

  const activeRefCount = liveCompleteness?.existing_count ?? selectedProduct?.referenceAnglesCount ?? 0;
  const activeStatus = (
    liveCompleteness?.reference_processing_status ||
    selectedProduct?.referenceStatus ||
    selectedProduct?.reference_processing_status ||
    'NOT_READY'
  ).toUpperCase();

  const isProductReferenceReady = activeStatus === 'READY' && activeRefCount >= 4;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!orderId.trim()) {
      setError('Please provide a valid Order ID');
      return;
    }
    if (!customerName.trim()) {
      setError('Please provide customer name');
      return;
    }
    if (!customerEmail.trim()) {
      setError('Please provide customer contact email');
      return;
    }
    if (!selectedProduct) {
      setError('Please select a product from your catalog');
      return;
    }

    // Gating verification: product references must be ready
    if (!isProductReferenceReady) {
      setError(
        `Cannot create verification session: "${selectedProduct.name}" does not have 4 verified reference angles (Status: ${activeStatus}). Please complete product reference images before sending to customer.`
      );
      return;
    }

    setLoading(true);
    try {
      const newSession = await createVerification({
        orderId: orderId.trim(),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        refundAmount: parseFloat(refundAmount) || 0,
        reason: reason === 'Other' ? (customReason || 'Other') : reason,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        workflowId: selectedWorkflowId,
        maxAttempts: parseInt(maxAttempts, 10) || 3,
        cameraOnly: requireCameraOnly,
      });

      // Navigate to created page with session state
      navigate('/verification-created', { state: { session: newSession } });
    } catch (err) {
      setError(err.message || 'Failed to create verification session');
      setLoading(false);
    }
  };

  const handleQuickAddProduct = (newProd) => {
    addProduct(newProd);
    setSelectedProductId(newProd.id);
  };

  return (
    <div className="min-h-screen bg-appBg flex flex-col">
      <MerchantHeader
        title="Create Verification Session"
        subtitle="Configure refund parameters and generate customer verification link"
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-red-800">Cannot Proceed</h4>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
                {!isProductReferenceReady && selectedProduct && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/settings/products/${selectedProduct.id}/references`)
                    }
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-900 underline hover:no-underline cursor-pointer"
                  >
                    Upload Reference Images for {selectedProduct.name} &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section 1: Order Information */}
          <div className="bg-white p-6 rounded-2xl border border-appBorder shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-appBorder pb-3">
              <Package className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-darkNeutral">1. Order & Claim Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Order ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requested Refund Amount ($) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Refund Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {REFUND_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {reason === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specify Refund Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Describe customer claim reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            )}
          </div>

          {/* Section 2: Customer Information */}
          <div className="bg-white p-6 rounded-2xl border border-appBorder shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-appBorder pb-3">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-darkNeutral">2. Customer Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Email / Mobile Contact <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="alex.morgan@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Product Reference Selection & 4-Angle Baseline */}
          <div className="bg-white p-6 rounded-2xl border border-appBorder shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-appBorder pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-darkNeutral">3. Product & Trusted References</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Quick Add Product
              </button>
            </div>

            {/* Product Selector Dropdown */}
            {products.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-xs text-slate-600 mb-2">No products found in your catalog.</p>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(true)}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Create First Product
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Product from Catalog <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  {products.map((p) => {
                    const count = p.referenceAnglesCount ?? p.reference_angles_count ?? 0;
                    const status = (p.referenceStatus || p.reference_processing_status || 'NOT_READY').toUpperCase();
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — {count}/4 Canonical Angles ({status})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Reference Status Gating Notice */}
            {selectedProduct && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                  isProductReferenceReady
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                {isProductReferenceReady ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isProductReferenceReady
                          ? 'text-emerald-800'
                          : activeStatus === 'PROCESSING'
                          ? 'text-sky-800'
                          : activeStatus === 'FAILED'
                          ? 'text-rose-800'
                          : 'text-amber-800'
                      }`}
                    >
                      {isProductReferenceReady
                        ? 'Product Reference Ready (4/4 Canonical Angles Verified)'
                        : activeStatus === 'PROCESSING'
                        ? 'Reference Processing in Progress (4/4 PROCESSING) — AI visual profile consolidating'
                        : activeStatus === 'FAILED'
                        ? 'Reference Processing Failed (4/4 FAILED) — Please re-upload reference images'
                        : `Reference Incomplete: ${activeRefCount}/4 Angles Ready (${activeStatus})`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/settings/products/${selectedProduct.id}/references`)
                      }
                      className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      Manage References
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    {isProductReferenceReady
                      ? 'AI vision inspection pipeline can compare incoming customer damage photos against front, back, left, and right reference baselines.'
                      : activeStatus === 'PROCESSING'
                      ? 'Background neural network is extracting visual keypoints and consolidating trusted product visual profile. Please wait a moment.'
                      : 'Reft.AI gating requires merchants to upload all 4 canonical reference angles (FRONT, BACK, LEFT, RIGHT) and complete AI analysis before generating a customer verification session.'}
                  </p>
                </div>
              </div>
            )}

            {/* 4 Canonical Angle Reference Image Previews */}
            {selectedProduct && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Canonical Baseline Angles (4/4)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Click any thumbnail to inspect
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CANONICAL_ANGLES.map((angle) => {
                    const imgUrl = referenceImages[angle.id];
                    const meta = referenceMetadata[angle.id];
                    const hasImage = !!imgUrl && !imgLoadErrors[angle.id];
                    const refStatus = (meta?.processing_status || (hasImage ? 'READY' : 'PENDING')).toUpperCase();

                    return (
                      <div
                        key={angle.id}
                        className="group relative rounded-xl border border-appBorder bg-slate-50 overflow-hidden flex flex-col transition-all hover:border-primary/40 hover:shadow-xs"
                      >
                        {/* Header Bar */}
                        <div className="px-2.5 py-1.5 bg-white border-b border-appBorder flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700">{angle.label}</span>
                          {hasImage ? (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                refStatus === 'READY'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : refStatus === 'PROCESSING'
                                  ? 'bg-sky-100 text-sky-700 animate-pulse'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {refStatus}
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-bold uppercase">
                              Missing
                            </span>
                          )}
                        </div>

                        {/* Image / Placeholder Area */}
                        <div className="relative aspect-square w-full bg-slate-100 flex items-center justify-center p-2">
                          {hasImage ? (
                            <>
                              <img
                                src={imgUrl}
                                alt={`${selectedProduct.name} - ${angle.name}`}
                                className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-105"
                                onClick={() =>
                                  setSelectedPreview({
                                    url: imgUrl,
                                    title: `${selectedProduct.name} — ${angle.name}`,
                                    subtitle: `Canonical Angle: ${angle.id} | Hash: ${meta?.image_hash?.slice(0, 12) || 'Verified'}`,
                                  })
                                }
                                onError={() => {
                                  setImgLoadErrors((prev) => ({ ...prev, [angle.id]: true }));
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedPreview({
                                    url: imgUrl,
                                    title: `${selectedProduct.name} — ${angle.name}`,
                                    subtitle: `Canonical Angle: ${angle.id} | Hash: ${meta?.image_hash?.slice(0, 12) || 'Verified'}`,
                                  })
                                }
                                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Inspect Reference"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
                              <Camera className="w-6 h-6 stroke-[1.5] mb-1 text-slate-300" />
                              <span className="text-[10px] font-semibold text-slate-500">
                                {angle.name}
                              </span>
                              <span className="text-[9px] text-slate-400 mt-0.5">
                                Not uploaded
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Workflow & Verification Layers */}
          <div className="bg-white p-6 rounded-2xl border border-appBorder shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-appBorder pb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-darkNeutral">4. Verification Flow Configuration</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verification Workflow
                </label>
                <select
                  value={selectedWorkflowId}
                  onChange={(e) => setSelectedWorkflowId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name} ({wf.steps?.length || 4} steps)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Follow-Up Rounds / Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireCameraOnly}
                  onChange={(e) => setRequireCameraOnly(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Enforce camera-first live capture (prevents uploading old album photos)
                </span>
              </label>
            </div>
          </div>

          {/* Submit / Cancel Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isProductReferenceReady}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
                !isProductReferenceReady
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-80'
                  : 'bg-primary hover:bg-primary/90 text-white'
              }`}
              title={
                !isProductReferenceReady
                  ? 'All 4 canonical reference angles must be uploaded and verified before creating a session.'
                  : 'Generate customer verification link'
              }
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating Session...</span>
                </>
              ) : (
                <>
                  <span>Create & Generate Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Full-Screen Image Inspection Dialog */}
      {selectedPreview && (
        <ImageViewerDialog
          isOpen={!!selectedPreview}
          onClose={() => setSelectedPreview(null)}
          imageUrl={selectedPreview.url}
          title={selectedPreview.title}
          subtitle={selectedPreview.subtitle}
        />
      )}

      {/* Quick Add Product Dialog */}
      {isQuickAddOpen && (
        <QuickAddProductDialog
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onProductCreated={handleQuickAddProduct}
        />
      )}
    </div>
  );
}
export default CreateVerificationPage;
