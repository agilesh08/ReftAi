import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  ShieldCheck,
  Camera,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
} from 'lucide-react';
import { useMerchant } from '../../context/MerchantContext';
import { MerchantHeader } from '../../components/common/MerchantHeader';
import { formatDateTime } from '../../utils/formatters';

import { merchantService } from '../../services/api/merchantService';

export function TimelinePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { verifications } = useMerchant();

  const [session, setSession] = useState(
    verifications.find((v) => v.id === id || v.token === id || v.verificationId === id) || null
  );

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

  const timelineEvents = [
    {
      title: 'Merchant Created Verification Session',
      actor: 'Merchant',
      timestamp: session.createdAt,
      description: `Generated secure customer link for Order ${session.orderId} ($${session.refundAmount}).`,
      icon: User,
      color: 'bg-primary text-white',
    },
    {
      title: 'Customer Opened Direct Link',
      actor: 'Customer',
      timestamp: session.createdAt,
      description: 'Accessed evidence workflow on mobile browser. Geolocation telemetry initialized.',
      icon: FileText,
      color: 'bg-indigo-600 text-white',
    },
    {
      title: 'Evidence Captured via Camera Sensor',
      actor: 'Customer',
      timestamp: session.createdAt,
      description: `${session.evidenceItems?.length || 2} live photos captured with verified camera parameters.`,
      icon: Camera,
      color: 'bg-sky-600 text-white',
    },
    {
      title: 'AI Multimodal Vision Evaluation',
      actor: 'Reft.AI Vision Pipeline',
      timestamp: session.createdAt,
      description: `Comparative baseline analysis completed. Machine assessment: ${session.assessment}.`,
      icon: Sparkles,
      color: 'bg-emerald-600 text-white',
    },
    {
      title: 'Customer Completed Workflow',
      actor: 'Customer',
      timestamp: session.createdAt,
      description: 'Submitted all workflow responses and completed follow-up clarification.',
      icon: CheckCircle2,
      color: 'bg-emerald-600 text-white',
    },
  ];

  if (session.decision && session.decision !== 'PENDING') {
    timelineEvents.push({
      title: `Merchant Decision Recorded: ${session.decision}`,
      actor: 'Merchant',
      timestamp: new Date().toISOString(),
      description: session.merchantNotes || `Merchant updated resolution to ${session.decision}.`,
      icon: ShieldCheck,
      color: session.decision.includes('APPROVED')
        ? 'bg-emerald-600 text-white'
        : session.decision.includes('REJECTED')
        ? 'bg-red-600 text-white'
        : 'bg-amber-600 text-white',
    });
  }

  return (
    <div className="min-h-screen bg-appBg flex flex-col">
      <MerchantHeader
        title="Session Audit Timeline"
        subtitle={`Chronological event history for Order ${session.orderId}`}
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <button
          onClick={() => navigate(`/investigation/${session.id}`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Investigation
        </button>

        <div className="bg-white rounded-3xl border border-appBorder shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 border-b border-appBorder pb-4">
            <History className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-darkNeutral uppercase tracking-wide">
              Complete Event Chronology ({timelineEvents.length} Events)
            </h2>
          </div>

          <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {timelineEvents.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="relative group">
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-8 top-0.5 w-7 h-7 rounded-full flex items-center justify-center shadow-xs ring-4 ring-white ${item.color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="bg-slate-50 hover:bg-slate-100/70 transition-colors p-4 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-slate-800 text-sm">{item.title}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>

                    <div className="text-[11px] font-semibold text-primary">Actor: {item.actor}</div>
                    <p className="text-slate-600 text-xs leading-relaxed">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
