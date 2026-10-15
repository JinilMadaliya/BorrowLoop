import React from 'react';
import { Repeat, ShieldCheck, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <Repeat className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800">BorrowLoop</span>
            <span className="text-xs text-slate-500">| Semester 5 Innovative Project</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure JWT & Double-Booking Protection
            </span>
            <span>•</span>
            <span>Campus Item Sharing</span>
          </div>

          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} BorrowLoop. Built with React & Tailwind CSS.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
