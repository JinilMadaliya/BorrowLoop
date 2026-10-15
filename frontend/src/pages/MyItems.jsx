import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Package,
  PlusCircle,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Tag
} from 'lucide-react';

const MyItems = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchMyItems = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?._id) return;
      const response = await api.get('/items', {
        params: { ownerId: user._id }
      });
      setItems(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch your items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyItems();
  }, [user?._id]);

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    try {
      await api.put(`/items/${item._id}`, { status: nextStatus });
      setActionMessage({ type: 'success', text: `Item marked as ${nextStatus}` });
      fetchMyItems();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update status' });
    }
  };

  const handleDeleteItem = async (itemId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.delete(`/items/${itemId}`);
      setActionMessage({ type: 'success', text: `"${title}" removed successfully.` });
      fetchMyItems();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete item' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Listed Items</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your inventory, toggle availability, or remove listings.
          </p>
        </div>

        <Link
          to="/create-item"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          List New Item
        </Link>
      </div>

      {actionMessage && (
        <div
          className={`mb-6 p-3.5 rounded-xl text-xs flex items-center justify-between animate-fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-[11px] underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-xs font-semibold text-slate-500">Loading your listings...</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 max-w-lg mx-auto">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">You haven't listed any items</h3>
          <p className="text-xs text-slate-500 mt-1">
            Share textbooks, electronics, tools, or musical gear with campus peers.
          </p>
          <Link
            to="/create-item"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Create First Listing
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                    {item.category}
                  </span>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      item.status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'BORROWED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                  {item.description}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div>
                    <span className="font-bold text-slate-900">₹{item.pricePerDay}</span> / day
                  </div>
                  <div>Condition: <span className="font-semibold">{item.condition}</span></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to={`/items/${item._id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-brand-600 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Page
                </Link>

                <div className="flex items-center gap-2">
                  {item.status !== 'BORROWED' && (
                    <button
                      onClick={() => handleToggleStatus(item)}
                      title="Toggle Available / Unavailable"
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {item.status === 'AVAILABLE' ? 'Mark Unavailable' : 'Make Available'}
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteItem(item._id, item.title)}
                    disabled={item.status === 'BORROWED'}
                    title={item.status === 'BORROWED' ? 'Cannot delete rented item' : 'Delete listing'}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyItems;
