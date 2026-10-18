import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import ReviewModal from '../components/ReviewModal';
import {
  Inbox,
  Send,
  Layers,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Star,
  CheckCheck,
  AlertTriangle,
  Ban,
  ShieldAlert
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' | 'outgoing' | 'transactions'

  const [requests, setRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);

  // Review modal state
  const [reviewModalTx, setReviewModalTx] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, txRes] = await Promise.all([
        api.get('/borrow-requests'),
        api.get('/transactions')
      ]);
      setRequests(reqRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter incoming vs outgoing requests
  const incomingRequests = requests.filter(
    (r) => r.ownerId?._id === user?._id || r.ownerId === user?._id
  );
  const outgoingRequests = requests.filter(
    (r) => r.borrowerId?._id === user?._id || r.borrowerId === user?._id
  );

  // Handlers for Lender Actions
  const handleApprove = async (requestId) => {
    try {
      await api.put(`/borrow-requests/${requestId}/approve`);
      setActionAlert({ type: 'success', text: 'Request approved and active rental created!' });
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message || 'Approval failed' });
    }
  };

  const handleReject = async (requestId) => {
    try {
      await api.put(`/borrow-requests/${requestId}/reject`);
      setActionAlert({ type: 'success', text: 'Borrow request declined.' });
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message || 'Rejection failed' });
    }
  };

  // Handler for Borrower Action
  const handleCancel = async (requestId) => {
    try {
      await api.put(`/borrow-requests/${requestId}/cancel`);
      setActionAlert({ type: 'success', text: 'Borrow request cancelled.' });
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message || 'Cancellation failed' });
    }
  };

  // Handler for Transaction Completion (Returned & Completed)
  const handleCompleteTransaction = async (transactionId) => {
    if (!window.confirm('Confirm that the item has been returned and handover is complete?')) {
      return;
    }
    try {
      await api.put(`/transactions/${transactionId}/complete`, { conditionAfter: 'Good' });
      setActionAlert({
        type: 'success',
        text: 'Transaction completed and item is now available again!'
      });
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message || 'Failed to complete transaction' });
    }
  };

  // Handler for Lender Cancelling / Recalling Item
  const handleCancelTransaction = async (transactionId) => {
    const reason = window.prompt(
      'Are you sure you want to recall this item? Enter an optional reason for the borrower:',
      'Urgent personal requirement'
    );
    if (reason === null) return; // User pressed Cancel
    try {
      await api.put(`/transactions/${transactionId}/cancel`, { reason });
      setActionAlert({
        type: 'success',
        text: 'Rental commitment cancelled. The item is now available again in your listings.'
      });
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message || 'Failed to cancel commitment' });
    }
  };

  // Handler for Reporting Unreturned / Overdue Item
  const handleReportOverdue = async (transactionId) => {
    if (
      !window.confirm(
        'Report this item as not returned by the borrower? This will mark the transaction OVERDUE, retain the deposit to cover replacement, and apply a reputation strike to the borrower.'
      )
    ) {
      return;
    }
    try {
      const res = await api.put(`/transactions/${transactionId}/report-overdue`);
      setActionAlert({
        type: 'success',
        text: res.data?.message || 'Item reported as overdue and borrower penalized.'
      });
      fetchDashboardData();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message || 'Failed to report overdue item' });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 flex items-center gap-1">
            <Ban className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Overdue (Penalty Applied)
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Active Rental
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCheck className="w-3 h-3" /> Returned & Completed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Requests & Rental Hub</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review incoming borrower requests, track your ongoing borrows, and manage returns.
        </p>
      </div>

      {actionAlert && (
        <div
          className={`mb-6 p-3.5 rounded-xl text-xs flex items-center justify-between animate-fade-in ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{actionAlert.text}</span>
          <button
            onClick={() => setActionAlert(null)}
            className="text-[11px] font-bold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'incoming'
              ? 'text-brand-600 border-b-2 border-brand-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Incoming Requests</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-brand-100 text-brand-700 font-semibold">
            {incomingRequests.filter((r) => r.status === 'PENDING').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('outgoing')}
          className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'outgoing'
              ? 'text-brand-600 border-b-2 border-brand-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>My Borrow Requests</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold">
            {outgoingRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'text-brand-600 border-b-2 border-brand-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Active & Past Rentals</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
            {transactions.filter((t) => t.status === 'ACTIVE').length} active
          </span>
        </button>
      </div>

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-xs font-semibold text-slate-500">Loading your dashboard...</p>
        </div>
      )}

      {/* TAB 1: INCOMING REQUESTS (LENDER VIEW) */}
      {!loading && activeTab === 'incoming' && (
        <div className="space-y-4">
          {incomingRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Incoming Requests</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                When other community members request to borrow your listings, they will appear here.
              </p>
            </div>
          ) : (
            incomingRequests.map((req) => (
              <div
                key={req._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {req.itemId?.title || 'Item'}
                    </span>
                    {getStatusBadge(req.status)}
                  </div>

                  <p className="text-xs text-slate-600">
                    Requested by <span className="font-semibold">{req.borrowerId?.name}</span>{' '}
                    (Rating: ★{req.borrowerId?.rating ? req.borrowerId.rating.toFixed(1) : '5.0'})
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {formatDate(req.startDate)} &rarr; {formatDate(req.endDate)}
                    </span>
                  </div>

                  {req.message && (
                    <p className="text-xs italic text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      "{req.message}"
                    </p>
                  )}
                </div>

                {req.status === 'PENDING' && (
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleReject(req._id)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                    <button
                      onClick={() => handleApprove(req._id)}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve & Book
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: OUTGOING REQUESTS (BORROWER VIEW) */}
      {!loading && activeTab === 'outgoing' && (
        <div className="space-y-4">
          {outgoingRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
              <Send className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Outgoing Requests</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse items on the marketplace and submit a borrow request to see it tracked here.
              </p>
            </div>
          ) : (
            outgoingRequests.map((req) => (
              <div
                key={req._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {req.itemId?.title || 'Item'}
                    </span>
                    {getStatusBadge(req.status)}
                  </div>

                  <p className="text-xs text-slate-600">
                    Lender: <span className="font-semibold">{req.ownerId?.name}</span>
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {formatDate(req.startDate)} &rarr; {formatDate(req.endDate)}
                    </span>
                  </div>
                </div>

                {req.status === 'PENDING' && (
                  <button
                    onClick={() => handleCancel(req._id)}
                    className="self-end md:self-center px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: TRANSACTIONS & RENTALS */}
      {!loading && activeTab === 'transactions' && (
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Rental Contracts Yet</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Approved borrow requests automatically turn into active rental transactions.
              </p>
            </div>
          ) : (
            transactions.map((tx) => {
              const isUserOwner = tx.ownerId?._id === user?._id || tx.ownerId === user?._id;
              const isUserBorrower = tx.borrowerId?._id === user?._id || tx.borrowerId === user?._id;

              const isPastDeadline = new Date() > new Date(tx.endDate);
              const isLate = (tx.status === 'ACTIVE' && isPastDeadline) || tx.status === 'OVERDUE';
              const daysLate = Math.max(1, Math.ceil((new Date() - new Date(tx.endDate)) / (1000 * 60 * 60 * 24)));
              const estimatedLateFee = daysLate * (tx.itemId?.pricePerDay || 0);

              return (
                <div
                  key={tx._id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between gap-4 transition-all ${
                    isLate && tx.status === 'ACTIVE'
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {tx.itemId?.title || 'Rental Item'}
                        </span>
                        {getStatusBadge(tx.status)}
                        {tx.status === 'ACTIVE' && isPastDeadline && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> {daysLate}d Overdue
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          {isUserOwner ? 'Lending' : 'Borrowing'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>
                        Lender: <strong className="text-slate-800">{tx.ownerId?.name}</strong>
                      </span>
                      <span>
                        Borrower: <strong className="text-slate-800">{tx.borrowerId?.name}</strong>
                      </span>
                      <span>Rental Fee: <strong className="text-slate-900">₹{tx.amount}</strong></span>
                      {tx.deposit > 0 && (
                        <span>Deposit: <strong className="text-slate-900">₹{tx.deposit}</strong></span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {formatDate(tx.startDate)} &rarr; {formatDate(tx.endDate)}
                      </span>
                    </div>

                    {/* Overdue Warning Callout */}
                    {tx.status === 'ACTIVE' && isPastDeadline && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          <span>Rental Deadline Passed ({daysLate} day(s) overdue)</span>
                        </div>
                        <p className="text-[11px] text-rose-700">
                          Accrued late fee: <strong>₹{estimatedLateFee}</strong>.
                          {isUserBorrower
                            ? ' Please return the item to the lender immediately to avoid additional penalty.'
                            : ' As the lender, if the borrower fails to return, you can report overdue to retain the security deposit.'}
                        </p>
                      </div>
                    )}

                    {/* Reported Overdue Callout */}
                    {tx.status === 'OVERDUE' && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
                          <span>Reported Overdue / Unreturned</span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          Overdue: <strong>{tx.overdueDays} days</strong> | Late fee: <strong>₹{tx.lateFee}</strong> | Deposit retained: <strong>₹{tx.deposit}</strong>.
                        </p>
                      </div>
                    )}

                    {/* Cancelled by Lender Callout */}
                    {tx.status === 'CANCELLED' && (
                      <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
                        <span className="font-semibold">Cancellation Note: </span>
                        {tx.cancellationReason || 'Lender recalled item before/during rental.'}
                      </div>
                    )}
                  </div>

                  {/* Actions for Transactions */}
                  <div className="flex flex-wrap items-center gap-2 self-end md:self-center pt-2 md:pt-0">
                    {tx.status === 'ACTIVE' && isUserOwner && (
                      <>
                        <button
                          onClick={() => handleCancelTransaction(tx._id)}
                          title="If you urgently require the item, recall it and cancel commitment"
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Recall / Cancel Rental
                        </button>

                        {isPastDeadline && (
                          <button
                            onClick={() => handleReportOverdue(tx._id)}
                            title="Borrower has not returned the item past deadline"
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Report Overdue & Retain Deposit
                          </button>
                        )}

                        <button
                          onClick={() => handleCompleteTransaction(tx._id)}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark as Returned & Complete
                        </button>
                      </>
                    )}

                    {tx.status === 'ACTIVE' && isUserBorrower && (
                      <button
                        onClick={() => handleCompleteTransaction(tx._id)}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark as Returned
                      </button>
                    )}

                    {tx.status === 'COMPLETED' && (
                      <button
                        onClick={() => setReviewModalTx(tx)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        Rate Experience
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        transaction={reviewModalTx}
        isOpen={Boolean(reviewModalTx)}
        onClose={() => setReviewModalTx(null)}
        onSuccess={() => {
          setActionAlert({ type: 'success', text: 'Thank you! Your review has been recorded.' });
          fetchDashboardData();
        }}
      />
    </div>
  );
};

export default Dashboard;
