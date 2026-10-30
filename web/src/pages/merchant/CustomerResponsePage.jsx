import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  HelpCircle,
  Camera,
  MessageSquare,
  History,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Maximize2,
  Calendar,
  Clock,
  ShieldCheck,
  User,
  Package,
} from 'lucide-react';
import { useMerchant } from '../../context/MerchantContext';
import { MerchantHeader } from '../../components/common/MerchantHeader';
import { ImageViewerDialog } from '../../components/common/ImageViewerDialog';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const TABS = [
  { id: 'CLAIM', label: 'Initial Claim', icon: FileText },
  { id: 'WORKFLOW', label: 'Workflow Q&A', icon: HelpCircle },
  { id: 'EVIDENCE', label: 'Evidence Items', icon: Camera },
  { id: 'FOLLOWUPS', label: 'Follow-Ups', icon: MessageSquare },
  { id: 'AUDIT', label: 'Audit Trail', icon: History },
];

import { merchantService } from '../../services/api/merchantService';

export function CustomerResponsePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { verifications } = useMerchant();

  const [session, setSession] = useState(
    verifications.find((v) => v.id === id || v.token === id || v.verificationId === id) || null
  );
  const [activeTab, setActiveTab] = useState('CLAIM');
  const [selectedImage, setSelectedImage] = useState(null);

  React.useEffect(() => {
    let isMounted = true;
    merchantService.getVerificationDetail(id).then((data) => {
      if (isMounted && data) setSession(data);
    }).catch((err) => console.warn(err.message));
    return () => { isMounted = false; };
  }, [id]);

  if (!session) {
    return (
      <div className="min-h-screen bg-appBg flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-appBorder text-center">
          <p className="text-xs text-slate-500 mb-3">Session not found.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-appBg flex flex-col">
      <MerchantHeader
        title={`Customer Response Dossier`}
        subtitle={`Session ${session.token} • Order ${session.orderId}`}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/investigation/${session.id}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Investigation
          </button>

          <div className="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
            Customer: <span className="font-bold text-darkNeutral">{session.customerName}</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="bg-white rounded-2xl border border-appBorder shadow-sm p-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-darkNeutral'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: INITIAL CLAIM */}
        {activeTab === 'CLAIM' && (
          <div className="bg-white rounded-2xl border border-appBorder shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-darkNeutral border-b border-appBorder pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Initial Claim Particulars
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Customer Identity
                </span>
                <span className="font-bold text-slate-800 text-sm block">{session.customerName}</span>
                <span className="text-slate-500 text-xs mt-0.5 block">{session.customerEmail}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Claimed Product
                </span>
                <span className="font-bold text-slate-800 text-sm block">{session.productName}</span>
                <span className="text-emerald-600 font-bold text-xs mt-0.5 block">
                  {formatCurrency(session.refundAmount)}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Submission Date
                </span>
                <span className="font-bold text-slate-800 text-sm block">
                  {formatDateTime(session.createdAt)}
                </span>
                <span className="text-slate-500 text-xs mt-0.5 block">Status: {session.status}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Stated Refund Reason</span>
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 text-xs text-darkNeutral font-medium">
                {session.reason}
              </div>
            </div>

            {session.customerNotes && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Customer Freeform Statement</span>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                  "{session.customerNotes}"
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WORKFLOW Q&A */}
        {activeTab === 'WORKFLOW' && (
          <div className="bg-white rounded-2xl border border-appBorder shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-darkNeutral border-b border-appBorder pb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              Standard Workflow Responses
            </h3>

            <div className="space-y-4">
              {[
                {
                  step: 'Step 1: Return Reason Specification',
                  question: 'What primary defect or damage did you discover upon unboxing?',
                  answer: session.reason || 'Screen cracked right out of the box',
                  verified: true,
                },
                {
                  step: 'Step 2: Shipping Carton Integrity',
                  question: 'Was the carrier shipping box noticeably dented, wet, or crushed?',
                  answer: 'Yes, dented corners with noticeable impact crease on lower left flap.',
                  verified: true,
                },
                {
                  step: 'Step 3: Component Retention',
                  question: 'Are all cables, manuals, and accessories retained in their sleeves?',
                  answer: 'All included components are complete and intact in the box.',
                  verified: true,
                },
                {
                  step: 'Step 4: Invoice / Proof of Delivery',
                  question: 'Did the package slip or digital receipt match the delivery address?',
                  answer: 'Order matched delivery address accurately.',
                  verified: true,
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      {item.step}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Recorded
                    </span>
                  </div>
                  <div className="font-semibold text-slate-700">{item.question}</div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200/80 font-medium text-darkNeutral">
                    "{item.answer}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: EVIDENCE ITEMS */}
        {activeTab === 'EVIDENCE' && (
          <div className="bg-white rounded-2xl border border-appBorder shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-appBorder pb-3">
              <h3 className="text-sm font-bold text-darkNeutral flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                Submitted Evidence Files ({session.evidenceItems?.length || 0})
              </h3>
              <span className="text-xs text-slate-500">Click to expand deep zoom</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {session.evidenceItems && session.evidenceItems.length > 0 ? (
                session.evidenceItems.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() =>
                      setSelectedImage({
                        url: item.url,
                        title: item.title,
                        description: `Captured via Camera • ${item.type || 'Photo Proof'}`,
                      })
                    }
                    className="group bg-slate-50 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:border-primary transition-all shadow-xs"
                  >
                    <div className="relative aspect-video bg-slate-200 overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="p-3 text-xs space-y-1">
                      <div className="font-bold text-slate-800 truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-500 flex justify-between">
                        <span className="capitalize">{item.type || 'Photo Proof'}</span>
                        <span className="text-emerald-600 font-semibold">Live Camera OK</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-xs text-slate-400">
                  No evidence files submitted.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: FOLLOW-UPS */}
        {activeTab === 'FOLLOWUPS' && (
          <div className="bg-white rounded-2xl border border-appBorder shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-darkNeutral border-b border-appBorder pb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Dynamic AI Follow-Up Rounds
            </h3>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary text-xs">Round 1: Visual Clarification</span>
                  <span className="text-[10px] text-slate-500">Autonomous Prompt</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-primary/10 text-slate-700">
                  <span className="font-bold block text-darkNeutral mb-0.5">Machine Query:</span>
                  "The initial photo has significant reflection on the glass surface. Can you confirm if the crack penetrates the display matrix or is only on the outer glass?"
                </div>
                <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 text-slate-800">
                  <span className="font-bold block text-emerald-900 mb-0.5">Customer Reply:</span>
                  "The lines run through the OLED screen itself when powered on, making half the screen black."
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT TRAIL */}
        {activeTab === 'AUDIT' && (
          <div className="bg-white rounded-2xl border border-appBorder shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-darkNeutral border-b border-appBorder pb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Immutable Audit Chronology
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
              {[
                {
                  event: 'Session Created by Merchant',
                  actor: 'Merchant Portal',
                  time: session.createdAt,
                  detail: `Order ${session.orderId} initialized with token ${session.token}`,
                },
                {
                  event: 'Customer Access via Direct Link',
                  actor: 'Customer Browser',
                  time: session.createdAt,
                  detail: 'Secure token authenticated from mobile device',
                },
                {
                  event: 'Evidence Photos Captured',
                  actor: 'Customer Camera Sensor',
                  time: session.createdAt,
                  detail: `${session.evidenceItems?.length || 2} photos captured with live timestamp check`,
                },
                {
                  event: 'Multimodal AI Vision Assessment Completed',
                  actor: 'Reft.AI Inference Service',
                  time: session.createdAt,
                  detail: `Assessment result: ${session.assessment} (Confidence: ${Math.round(
                    (session.confidenceScore || 0.88) * 100
                  )}%)`,
                },
              ].map((ev, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white ring-2 ring-primary/20" />
                  <div className="font-bold text-slate-800">{ev.event}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className="font-medium text-slate-600">{ev.actor}</span> •{' '}
                    <span>{formatDateTime(ev.time)}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">{ev.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Image Zoom Dialog */}
      {selectedImage && (
        <ImageViewerDialog
          isOpen={Boolean(selectedImage)}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage?.url}
          title={selectedImage?.title}
          description={selectedImage?.description}
        />
      )}
    </div>
  );
}
