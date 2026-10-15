import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  User,
  Star,
  MapPin,
  Mail,
  Calendar,
  Award,
  Coins,
  Package,
  Loader2,
  ShieldCheck
} from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileDetails = async () => {
      if (!user?._id) return;
      setLoading(true);
      try {
        const [revRes, itemRes] = await Promise.all([
          api.get(`/reviews/${user._id}`),
          api.get('/items', { params: { ownerId: user._id } })
        ]);
        setReviews(revRes.data);
        setItemCount(itemRes.data.length);
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileDetails();
  }, [user?._id]);

  const ratingVal = user?.rating ? user.rating.toFixed(1) : '5.0';
  const ratingCount = user?.ratingCount || 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-100 mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-3xl bg-brand-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 flex-shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>

          {/* User Info */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
                <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                  <Mail className="w-3.5 h-3.5" /> {user?.email}
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 self-center sm:self-auto">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-extrabold text-sm">{ratingVal}</span>
                <span className="text-xs text-amber-600">({ratingCount} reviews)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-600">
              {user?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {user.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-brand-500" />
                {user?.borrowCredits || 50} Borrow Credits
              </span>
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-500" />
                {itemCount} Active Listings
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Received Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Community Reputation & Feedback</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified reviews submitted by peers after completed transactions.
            </p>
          </div>
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10">
            <Star className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">No community reviews yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Complete rental transactions as a lender or borrower to build your verified reputation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div
                key={rev._id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {rev.reviewerId?.name || 'Community Member'}
                  </span>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                    <span className="text-xs font-bold text-slate-600 ml-1">
                      {rev.rating}.0
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "{rev.comment}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
