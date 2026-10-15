import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Tag, Shield, Clock } from 'lucide-react';

const ItemCard = ({ item }) => {
  const getConditionColor = (condition) => {
    switch (condition) {
      case 'New':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Like New':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Good':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Fair':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            Available
          </span>
        );
      case 'BORROWED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
            Currently Borrowed
          </span>
        );
      case 'UNAVAILABLE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
            Unavailable
          </span>
        );
      default:
        return null;
    }
  };

  const hasImage = item.images && item.images.length > 0 && item.images[0].trim() !== '';

  return (
    <Link
      to={`/items/${item._id}`}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-brand-300 transition-all flex flex-col"
    >
      {/* Image Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden">
        {hasImage ? (
          <img
            src={item.images[0]}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="text-center p-4">
            <Tag className="w-8 h-8 mx-auto text-slate-400 group-hover:text-brand-500 transition-colors" />
            <span className="text-xs text-slate-400 font-medium mt-1 block">
              {item.category}
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {getStatusBadge(item.status)}
        </div>

        <div className="absolute top-2.5 right-2.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getConditionColor(
              item.condition
            )}`}
          >
            {item.condition}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
              {item.category}
            </span>
            {item.ownerId && (
              <span className="flex items-center gap-1 font-medium text-slate-600">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {item.ownerId.rating ? item.ownerId.rating.toFixed(1) : '5.0'}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
            {item.title}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-3">
            {item.description}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-2.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-slate-900">
                ₹{item.pricePerDay}
              </span>
              <span className="text-xs text-slate-500"> / day</span>
            </div>

            {item.securityDeposit > 0 && (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                Deposit: ₹{item.securityDeposit}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ItemCard;
