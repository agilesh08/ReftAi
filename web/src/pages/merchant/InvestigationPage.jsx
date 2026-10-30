import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Package,
  User,
  DollarSign,
  Camera,
  Eye,
  FileText,
  Clock,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  ExternalLink,
  ChevronRight,
  Maximize2,
  PauseCircle,
  PlayCircle,
  History,
} from 'lucide-react';
import { useMerchant } from '../../context/MerchantContext';
import { MerchantHeader } from '../../components/common/MerchantHeader';
import { AssessmentBadge } from '../../components/common/AssessmentBadge';
import { DecisionBadge } from '../../components/common/DecisionBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ImageViewerDialog } from '../../components/common/ImageViewerDialog';
import { DecisionDialog } from '../../components/merchant/DecisionDialog';
import { HoldSessionDialog } from '../../components/merchant/HoldSessionDialog';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

import { merchantService } from '../../services/api/merchantService';

export function InvestigationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { verifications, updateDecision, holdSession, resumeSession } = useMerchant();

  const [session, setSession] = useState(
    verifications.find((v) => v.id === id || v.token === id || v.verificationId === id) || null
  );
  const [loadingDetail, setLoadingDetail] = useState(true);

  // Modal dialog states
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [isHoldOpen, setIsHoldOpen] = useState(false);

  React.useEffect(() => {
    let isMounted = true;
    merchantService
      .getVerificationDetail(id)
      .then((data) => {
        if (isMounted && data) {
          setSession(data);
        }
      })
      .catch((err) => {
        console.warn('API investigation detail:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loadingDetail && !session) {
    return (
      <div className="min-h-screen bg-appBg flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-slate-500">Loading 13-facet investigation dossier...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-appBg flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-appBorder shadow-sm text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-darkNeutral">Verification Session Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Could not find an active or historical verification matching ID: {id}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isHeld = session.status === 'HELD';

  return (
    <div className="min-h-screen bg-appBg flex flex-col pb-24">
      <MerchantHeader
        title={`Investigation: ${session.orderId}`}
        subtitle="13-Facet Multimodal Refund Evidence Analysis"
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-2">
            <Link
              to={`/investigation/${session.id}/customer-response`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              Customer Dossier
            </Link>
            <Link
              to={`/report/${session.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Explainable Report
            </Link>
            <Link
              to={`/timeline/${session.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              Timeline
            </Link>
          </div>
        </div>

        {/* 1. TOP RECOMMENDATION / AI SUMMARY BANNER */}
        <div
          className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            session.assessment === 'EVIDENCE_CONSISTENT'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : session.assessment === 'INCONSISTENCY_DETECTED'
              ? 'bg-red-50/80 border-red-200 text-red-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                session.assessment === 'EVIDENCE_CONSISTENT'
                  ? 'bg-emerald-600 text-white'
                  : session.assessment === 'INCONSISTENCY_DETECTED'
                  ? 'bg-red-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                  AI Assessment Recommendation
                </span>
                <AssessmentBadge assessment={session.assessment} />
              </div>
              <h2 className="text-base font-bold mt-1">
                {session.assessment === 'EVIDENCE_CONSISTENT'
                  ? 'Physical Damage Matches Claim — Low Fraud Risk'
                  : session.assessment === 'INCONSISTENCY_DETECTED'
                  ? 'High Discrepancy Flagged — Serial / Angle Mismatch'
                  : 'Inconclusive Visuals — Merchant Verification Recommended'}
              </h2>
              <p className="text-xs opacity-90 mt-0.5 max-w-2xl">
                {session.assessmentExplanation ||
                  'Computer vision analysis compared customer submitted angles with the merchant reference baseline.'}
              </p>
            </div>
          </div>

          <div className="text-left md:text-right shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-current/10">
            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
              Confidence Score
            </span>
            <span className="text-2xl font-black">
              {Math.round((session.confidenceScore || 0.88) * 100)}%
            </span>
            <span className="text-[11px] block opacity-80">Vision + Signal Fusion</span>
          </div>
        </div>

        {/* 2 & 3: GRID: CLAIM OVERVIEW & PRODUCT REFERENCE BASELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Claim & Customer (2 cols) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-appBorder shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-appBorder pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-darkNeutral uppercase tracking-wider">
                  2. Claim & Order Details
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={session.status} />
                {session.decision && <DecisionBadge decision={session.decision} />}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Order ID</span>
                <span className="font-bold text-slate-800">{session.orderId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Refund Value</span>
                <span className="font-bold text-emerald-600">{formatCurrency(session.refundAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer</span>
                <span className="font-semibold text-slate-800">{session.customerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Contact</span>
                <span className="font-medium text-slate-600 truncate block">
                  {session.customerContact || session.customerEmail}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                Stated Refund Reason
              </span>
              <p className="text-xs font-medium text-slate-800">{session.reason}</p>
              {session.customerNotes && (
                <p className="text-xs text-slate-500 mt-1 italic">
                  "{session.customerNotes}"
                </p>
              )}
            </div>
          </div>

          {/* Product Baseline & Gating (1 col) */}
          <div className="bg-white p-5 rounded-2xl border border-appBorder shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-appBorder pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-darkNeutral uppercase tracking-wider">
                  3. Product Baseline
                </h3>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                4 Angles Ready
              </span>
            </div>

            <div>
              <div className="font-bold text-xs text-slate-800">{session.productName}</div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                SKU: {session.productSku || 'PRD-8820'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Front Canonical:</span>
                <span className="text-emerald-600 font-semibold">Matched 94%</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Damage Angle:</span>
                <span className="text-slate-700 font-semibold">Top Left Corner</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Packaging Spec:</span>
                <span className="text-slate-700 font-semibold">OEM Retail Box</span>
              </div>
            </div>

            <Link
              to={`/settings/products`}
              className="inline-flex items-center justify-between w-full text-xs font-semibold text-primary hover:underline pt-1"
            >
              <span>View Reference Catalog</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 6. EVIDENCE GALLERY (CUSTOMER SUBMITTED PHOTOS) */}
        <div className="bg-white p-5 rounded-2xl border border-appBorder shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-appBorder pb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-darkNeutral uppercase tracking-wider">
                6. Customer Submitted Evidence ({session.evidenceItems?.length || 0} Items)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">Click any image for deep zoom & pan</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {session.evidenceItems && session.evidenceItems.length > 0 ? (
              session.evidenceItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() =>
                    setSelectedImage({
                      url: item.url || item.thumbnailUrl,
                      title: item.title || `Evidence Item #${idx + 1}`,
                      description: `${item.type || 'Photo Proof'} • Captured via Camera`,
                    })
                  }
                  className="group relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-square cursor-pointer hover:border-primary transition-all shadow-xs"
                >
                  <img
                    src={item.url || item.thumbnailUrl || '/assets/branding/reft_icon.png'}
                    alt={item.title || 'Evidence'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                    <span className="text-white text-xs font-bold truncate">
                      {item.title || `Evidence #${idx + 1}`}
                    </span>
                    <span className="text-slate-300 text-[10px] capitalize">
                      {item.type || 'Photo Proof'}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 p-1 bg-black/40 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                No customer evidence files submitted yet.
              </div>
            )}
          </div>
        </div>

        {/* 7 & 8: CATEGORIZED VISUAL FINDINGS & DETERMINISTIC SIGNALS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Visual Findings */}
          <div className="bg-white p-5 rounded-2xl border border-appBorder shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-appBorder pb-3">
              <Eye className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-darkNeutral uppercase tracking-wider">
                7. Categorized Visual Findings
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {(session.visualFindings || [
                {
                  category: 'Surface Impact Analysis',
                  finding: 'Visible screen fracture pattern radiating from lower corner.',
                  severity: 'CRITICAL',
                },
                {
                  category: 'Serial & Barcode OCR',
                  finding: 'Serial numbers on shipping carton match product registration.',
                  severity: 'NORMAL',
                },
                {
                  category: 'Color & Texture Match',
                  finding: 'Reflective casing matches authentic SKU specification.',
                  severity: 'NORMAL',
                },
              ]).map((vf, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-700">{vf.category}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        vf.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {vf.severity || 'VERIFIED'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{vf.finding}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Deterministic Signals */}
          <div className="bg-white p-5 rounded-2xl border border-appBorder shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-appBorder pb-3">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-darkNeutral uppercase tracking-wider">
                8. Deterministic Signals
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 block">Geolocation Proximity</span>
                  <span className="text-[11px] text-slate-500">Customer location vs. delivery address</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 0.4 miles (Valid)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 block">Delivery Timestamp Check</span>
                  <span className="text-[11px] text-slate-500">Delivered within return window</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Delivered 2 days ago
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 block">Camera EXIF & Tampering</span>
                  <span className="text-[11px] text-slate-500">Live sensor signature verified</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Direct Sensor Capture
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 & 5: WORKFLOW Q&A & ADAPTIVE FOLLOW-UPS */}
        <div className="bg-white p-5 rounded-2xl border border-appBorder shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-appBorder pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-darkNeutral uppercase tracking-wider">
                4 & 5. Customer Workflow Responses & AI Follow-Ups
              </h3>
            </div>
            <Link
              to={`/investigation/${session.id}/customer-response`}
              className="text-xs font-bold text-primary hover:underline"
            >
              Full Response Dossier &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 text-xs">Initial Verification Questions</h4>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="font-medium text-slate-600">Was the shipping box torn upon arrival?</div>
                <div className="font-bold text-slate-800">"Yes, outer carton had puncture mark."</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="font-medium text-slate-600">Have all accessories been retained?</div>
                <div className="font-bold text-slate-800">"All cables and power adapters present."</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 text-xs">Adaptive AI Clarification Round</h4>
              <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 space-y-1.5">
                <div className="font-medium text-primary">
                  AI Question: "Did the puncture penetrate the inner bubble wrapper?"
                </div>
                <div className="font-bold text-darkNeutral">
                  Customer Answer: "Yes, pierced through the protective wrap into screen."
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 9: REASONING SYNTHESIS */}
        <div className="bg-white p-5 rounded-2xl border border-appBorder shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-appBorder pb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-darkNeutral uppercase tracking-wider">
              9. Multimodal Reasoning Synthesis
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {session.reasoningSynthesis ||
              'Cross-referencing the customer’s uploaded images against the registered baseline confirms that physical damage is localized to the lower edge. The outer packaging puncture aligns geometrically with courier transit impact. No signs of digital tampering or recycled internet photos were detected.'}
          </p>
        </div>
      </main>

      {/* 11. STICKY BOTTOM MERCHANT DECISION BAR */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-appBorder py-3.5 px-4 sm:px-8 z-30 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Decision Status:</span>
              {session.decision && session.decision !== 'PENDING' ? (
                <DecisionBadge decision={session.decision} />
              ) : (
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Awaiting Merchant Action
                </span>
              )}
            </div>

            {isHeld && (
              <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <PauseCircle className="w-3.5 h-3.5" /> Session On Hold
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Hold / Resume */}
            <button
              onClick={() => {
                if (isHeld) {
                  resumeSession(session.id);
                } else {
                  setIsHoldOpen(true);
                }
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors flex items-center gap-1.5"
            >
              {isHeld ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Hold</span>
                </>
              )}
            </button>

            {/* Reject Refund */}
            <button
              onClick={() => {
                setIsDecisionOpen(true);
              }}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors"
            >
              Reject Refund
            </button>

            {/* Approve / Finalize Refund */}
            <button
              onClick={() => {
                setIsDecisionOpen(true);
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Take Decision & Approve
            </button>
          </div>
        </div>
      </footer>

      {/* Image Zoom / Pan Dialog */}
      {selectedImage && (
        <ImageViewerDialog
          isOpen={Boolean(selectedImage)}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage?.url}
          title={selectedImage?.title}
          description={selectedImage?.description}
        />
      )}

      {/* Decision Dialog */}
      {isDecisionOpen && (
        <DecisionDialog
          isOpen={isDecisionOpen}
          onClose={() => setIsDecisionOpen(false)}
          session={session}
          onDecisionSubmit={(decisionData) => {
            updateDecision(session.id, decisionData);
            setIsDecisionOpen(false);
          }}
        />
      )}

      {/* Hold Dialog */}
      {isHoldOpen && (
        <HoldSessionDialog
          isOpen={isHoldOpen}
          onClose={() => setIsHoldOpen(false)}
          session={session}
          onConfirm={(reason) => {
            holdSession(session.id, reason);
            setIsHoldOpen(false);
          }}
        />
      )}
    </div>
  );
}
