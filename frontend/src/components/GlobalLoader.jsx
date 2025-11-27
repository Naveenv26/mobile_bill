import React from 'react';

export default function GlobalLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center">
        {/* Animated Logo Container */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-4 bg-white rounded-full shadow-sm flex items-center justify-center">
            <span className="text-xl">⚡</span>
          </div>
        </div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight animate-pulse">
          Smart<span className="text-indigo-600">Bill</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">Loading your business...</p>
      </div>
    </div>
  );
}