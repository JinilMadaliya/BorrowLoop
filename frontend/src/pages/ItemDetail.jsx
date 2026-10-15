import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Tag,
  MapPin,
  Star,
  Calendar,
  Shield,
  Clock,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  ArrowLeft,
  Info
} from 'lucide-react';

const ItemDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Borrow Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    const fetchItemAndReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const itemRes = await api.get(`/items/${id}`);
        setItem(itemRes.data);

        // Fetch community reviews for this owner/item
        const reviewsRes = await api.get(`/reviews/${itemRes.data.ownerId._id}`);
        setReviews(reviewsRes.data);
      } catch (err) {
        setError(err.message || 'Item not found');
      } finally {
        setLoading(false);
      }
    };

    fetchItemAndReviews();
  }, [id]);

  // Calculate duration and price preview
  const calculateEstimate = () => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end) || start >= end) return null;

    const diffDays = Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)));
    const rentalCost = diffDays * (item?.pricePerDay || 0);
    const deposit = item?.securityDeposit || 0;
    const total = rentalCost + deposit;

    return { diffDays, rentalCost, deposit, total };
  };

  const estimate = calculateEstimate();

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/items/${id}` } });
      return;
    }

    if (!startDate || !endDate) {
      setFormError('Please select both start and end dates.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(false);

    try {
      await api.post('/borrow-requests', {
        itemId: item._id,
        startDate,
        endDate,
        message: message.trim()
      });

      setFormSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setFormError(err.message || 'Failed to submit borrow request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-xs font-semibold text-slate-500">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-slate-900">Item Unavailable</h2>
          <p className="text-xs text-slate-500 mt-1">{error || 'This item listing does not exist.'}</p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user && (user._id === item.ownerId?._id || user._id === item.ownerId);
  const hasImage = item.images && item.images.length > 0 && item.images[0].trim() !== '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Listings
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image and Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Visual */}
          <div className="relative aspect-video rounded-3xl bg-gradient-to-tr from-slate-100 to-slate-200 overflow-hidden border border-slate-200 flex items-center justify-center">
            {hasImage ? (
              <img
                src={item.images[0]}
                alt={item.title}
                className="w-full h-full object-cover"
                onError={(e) => (e.target.style.display = 'none')}
              />
            ) : (
              <div className="text-center p-8">
                <Tag className="w-16 h-16 mx-auto text-slate-400 mb-2" />
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  {item.category}
                </span>
              </div>
            )}

            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur shadow-sm text-slate-800">
                {item.category}
              </span>
            </div>

            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-600 text-white shadow-sm">
                Condition: {item.condition}
              </span>
            </div>
          </div>

          {/* Title and Specs */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                  {item.category}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5" />
                  {item.location}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {item.title}
              </h1>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Item Description
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>

            {/* Guarantees */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Date Protection</p>
                  <p className="text-[11px] text-slate-500">
                    Double-booking overlap check prevents scheduling conflicts.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Campus Community</p>
                  <p className="text-[11px] text-slate-500">
                    Handover in safe, verified public dorm or department locations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Owner Profile Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 font-extrabold flex items-center justify-center text-base border border-brand-200">
                {item.ownerId?.name ? item.ownerId.name.charAt(0).toUpperCase() : 'O'}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Listed By
                </p>
                <h4 className="text-base font-bold text-slate-900">
                  {item.ownerId?.name}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold mt-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{item.ownerId?.rating ? item.ownerId.rating.toFixed(1) : '5.0'}</span>
                  <span className="text-slate-400 font-normal">
                    ({item.ownerId?.ratingCount || 0} reviews)
                  </span>
                </div>
              </div>
            </div>

            <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
              Campus Lender
            </span>
          </div>

          {/* Community Reviews Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Lender Reputation & Reviews ({reviews.length})
            </h3>

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No reviews yet for this lender. Completed transactions generate verified feedback.
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev._id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {rev.reviewerId?.name || 'Borrower'}
                      </span>
                      <div className="flex items-center gap-1 text-amber-500">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing & Borrow Submission Card */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100 space-y-5">
            {/* Price Header */}
            <div className="flex items-baseline justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-3xl font-extrabold text-slate-900">
                  ₹{item.pricePerDay}
                </span>
                <span className="text-xs text-slate-500"> / day</span>
              </div>
              {item.securityDeposit > 0 ? (
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Deposit: ₹{item.securityDeposit}
                </span>
              ) : (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Zero Deposit
                </span>
              )}
            </div>

            {isOwner ? (
              <div className="p-4 rounded-2xl bg-brand-50 border border-brand-200 text-brand-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Info className="w-4 h-4 text-brand-600" />
                  <span>You own this item listing</span>
                </div>
                <p className="text-xs text-brand-700">
                  You cannot borrow your own item. To update details, toggle availability, or manage requests, visit your dashboard.
                </p>
                <Link
                  to="/my-items"
                  className="mt-2 inline-block text-xs font-bold text-brand-700 underline"
                >
                  Manage in My Listings &rarr;
                </Link>
              </div>
            ) : item.status === 'UNAVAILABLE' ? (
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs text-center font-medium">
                This item is currently marked as unavailable by the lender. Check back later!
              </div>
            ) : (
              <form onSubmit={handleBorrowSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Borrow request submitted successfully! Redirecting to your dashboard...
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      min={startDate || new Date().toISOString().split('T')[0]}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Message to Lender (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="E.g., Need it for an innovative class project presentation on Friday afternoon..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                {/* Pricing Breakdown Card */}
                {estimate && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Rental Period</span>
                      <span className="font-semibold">{estimate.diffDays} day(s)</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Daily Rate Subtotal</span>
                      <span className="font-semibold">₹{estimate.rentalCost}</span>
                    </div>
                    {estimate.deposit > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Refundable Deposit</span>
                        <span className="font-semibold">₹{estimate.deposit}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                      <span>Total Estimated</span>
                      <span className="text-brand-600">₹{estimate.total}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || formSuccess}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {isAuthenticated ? 'Request to Borrow' : 'Sign In to Request'}
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-400">
                  No payment is charged now. The lender must review and approve your dates.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
