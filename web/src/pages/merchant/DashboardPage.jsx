import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  ExternalLink,
  Eye,
  FileText,
  PauseCircle,
  PlayCircle,
  Trash2,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useMerchant } from '../../context/MerchantContext';
import { MerchantHeader } from '../../components/common/MerchantHeader';
import { StatCard } from '../../components/common/StatCard';
import { AssessmentBadge } from '../../components/common/AssessmentBadge';
import { DecisionBadge } from '../../components/common/DecisionBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { HoldSessionDialog } from '../../components/merchant/HoldSessionDialog';
import { DeleteSessionDialog } from '../../components/merchant/DeleteSessionDialog';
import { formatCurrency, formatRelativeDate } from '../../utils/formatters';

export function DashboardPage() {
  const navigate = useNavigate();
  const { verifications, loading, holdSession, resumeSession, deleteSession, refreshData } = useMerchant();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Modal dialog states
  const [holdTargetSession, setHoldTargetSession] = useState(null);
  const [deleteTargetSession, setDeleteTargetSession] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [isHolding, setIsHolding] = useState(false);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return verifications.filter((v) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (v.orderId && v.orderId.toLowerCase().includes(q)) ||
        (v.customerName && v.customerName.toLowerCase().includes(q)) ||
        (v.token && v.token.toLowerCase().includes(q)) ||
        (v.productName && v.productName.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Filter category
      if (selectedFilter === 'ALL') return true;
      if (selectedFilter === 'REVIEW_REQUIRED') return v.assessment === 'REVIEW_REQUIRED';
      if (selectedFilter === 'INCONSISTENCY_DETECTED') return v.assessment === 'INCONSISTENCY_DETECTED';
      if (selectedFilter === 'EVIDENCE_CONSISTENT') return v.assessment === 'EVIDENCE_CONSISTENT';
      if (selectedFilter === 'PENDING') return v.status === 'PENDING' || v.status === 'IN_PROGRESS';
      if (selectedFilter === 'COMPLETED') return v.status === 'COMPLETED';
      if (selectedFilter === 'HELD') return v.status === 'HELD';

      return true;
    });
  }, [verifications, searchQuery, selectedFilter]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const total = verifications.length;
    const reviewRequired = verifications.filter((v) => v.assessment === 'REVIEW_REQUIRED' || v.status === 'REVIEW_REQUIRED').length;
    const inconsistencyDetected = verifications.filter((v) => v.assessment === 'INCONSISTENCY_DETECTED').length;
    const pendingEvidence = verifications.filter((v) => v.status === 'PENDING' || v.status === 'IN_PROGRESS').length;
    const completed = verifications.filter((v) => v.status === 'COMPLETED').length;

    return { total, reviewRequired, inconsistencyDetected, pendingEvidence, completed };
  }, [verifications]);

  const handleHoldClick = (session) => {
    setActiveMenuId(null);
    if (session.status === 'HELD') {
      resumeSession(session.id);
    } else {
      setHoldTargetSession(session);
    }
  };

  const handleHoldConfirm = async (holdData) => {
    if (!holdTargetSession) return;
    setIsHolding(true);
    try {
      await holdSession(holdTargetSession.id, holdData?.reason || holdData);
      setHoldTargetSession(null);
    } catch (err) {
      console.error('Failed to hold session:', err);
    } finally {
      setIsHolding(false);
    }
  };

  const handleDeleteClick = (session) => {
    setActiveMenuId(null);
    setDeleteError(null);
    setDeleteTargetSession(session);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetSession) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteSession(deleteTargetSession.id);
      setDeleteTargetSession(null);
    } catch (err) {
      console.error('Failed to delete verification session:', err);
      setDeleteError(err.response?.data?.detail || err.message || 'Failed to delete verification session');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-appBg flex flex-col">
      <MerchantHeader title="Verification Dashboard" subtitle="Manage and review refund evidence" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Action Bar / Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-appBorder shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-darkNeutral flex items-center gap-2">
              <span>Verification Sessions</span>
              <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-full">
                {verifications.length} Active
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review multi-angle visual findings, customer answers, and deterministically audited returns.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refreshData()}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/create-verification')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Verification Session</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Sessions"
            value={stats.total}
            icon={Inbox}
            subtitle="All sessions"
          />
          <StatCard
            title="Review Required"
            value={stats.reviewRequired}
            icon={AlertTriangle}
            color="amber"
            subtitle="Needs merchant check"
          />
          <StatCard
            title="Inconsistency"
            value={stats.inconsistencyDetected}
            icon={AlertTriangle}
            color="rose"
            subtitle="Flags detected"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle2}
            color="emerald"
            subtitle="Decided or closed"
          />
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-appBorder shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order ID, customer name, token, or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-darkNeutral placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            {[
              { id: 'ALL', label: 'All Sessions' },
              { id: 'REVIEW_REQUIRED', label: 'Review Required' },
              { id: 'INCONSISTENCY_DETECTED', label: 'Inconsistencies' },
              { id: 'EVIDENCE_CONSISTENT', label: 'Consistent' },
              { id: 'PENDING', label: 'Pending Customer' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'HELD', label: 'Held' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedFilter === filter.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions List / Table */}
        <div className="bg-white rounded-2xl border border-appBorder shadow-sm overflow-hidden">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-darkNeutral">No verification sessions found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedFilter !== 'ALL'
                  ? 'No sessions match your search filters. Try clearing filters to see all items.'
                  : 'Get started by creating a new verification session for a refund request.'}
              </p>
              {searchQuery || selectedFilter !== 'ALL' ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFilter('ALL');
                  }}
                  className="mt-4 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => navigate('/create-verification')}
                  className="mt-4 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Create First Session
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-appBorder bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Order / Token</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Product & Amount</th>
                    <th className="py-3 px-4">Assessment</th>
                    <th className="py-3 px-4">Status & Decision</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-appBorder text-xs text-darkNeutral">
                  {filteredSessions.map((session) => (
                    <tr
                      key={session.id}
                      className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/investigation/${session.id}`)}
                    >
                      {/* Order / Token */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 text-xs">{session.orderId}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {session.token}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{session.customerName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          {session.customerContact || session.customerEmail}
                        </div>
                      </td>

                      {/* Product & Amount */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-700 truncate max-w-[180px]">
                          {session.productName}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
                          {formatCurrency(session.refundAmount)}
                        </div>
                      </td>

                      {/* Assessment */}
                      <td className="py-3.5 px-4">
                        <AssessmentBadge assessment={session.assessment} />
                      </td>

                      {/* Status & Decision */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={session.status} />
                          {session.decision && session.decision !== 'PENDING' && (
                            <DecisionBadge decision={session.decision} />
                          )}
                        </div>
                      </td>

                      {/* Created */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatRelativeDate(session.createdAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/investigation/${session.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-lg transition-colors"
                            title="Investigate"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Investigate</span>
                          </button>

                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMenuId(activeMenuId === session.id ? null : session.id)
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeMenuId === session.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20 text-left">
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    navigate(`/investigation/${session.id}/customer-response`);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  Customer Dossier
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    navigate(`/report/${session.id}`);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  Explainable Report
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    window.open(`/verify/${session.token}`, '_blank');
                                  }}
                                  className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                  Open Customer Link
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={() => handleHoldClick(session)}
                                  className="w-full px-3 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                >
                                  {session.status === 'HELD' ? (
                                    <>
                                      <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
                                      Resume Session
                                    </>
                                  ) : (
                                    <>
                                      <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                                      Hold Session
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(session)}
                                  className="w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  Delete Session
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Hold Session Dialog */}
      {holdTargetSession && (
        <HoldSessionDialog
          isOpen={Boolean(holdTargetSession)}
          session={holdTargetSession}
          isHolding={isHolding}
          onClose={() => setHoldTargetSession(null)}
          onConfirm={handleHoldConfirm}
        />
      )}

      {/* Delete Session Dialog */}
      {deleteTargetSession && (
        <DeleteSessionDialog
          isOpen={Boolean(deleteTargetSession)}
          session={deleteTargetSession}
          isDeleting={isDeleting}
          error={deleteError}
          onClose={() => {
            setDeleteTargetSession(null);
            setDeleteError(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
