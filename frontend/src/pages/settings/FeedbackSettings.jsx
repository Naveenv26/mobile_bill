import React, { useState } from "react";

export default function FeedbackSettings() {
  const [rating, setRating] = useState(0);

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💌</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">We value your feedback!</h2>
        <p className="text-slate-500 mt-2 mb-6">Help us improve your ERP experience. Found a bug or have a feature request?</p>

        <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
                <button 
                    key={star} 
                    onClick={() => setRating(star)}
                    className={`text-4xl transition-transform hover:scale-110 ${rating >= star ? "text-amber-400" : "text-slate-200"}`}
                >
                    ★
                </button>
            ))}
        </div>

        <textarea 
            className="w-full border-slate-200 rounded-xl p-4 bg-slate-50 focus:ring-sky-400 min-h-[120px] mb-4"
            placeholder="Tell us what you think..."
        ></textarea>

        <button className="bg-slate-900 text-white px-8 py-3 rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 w-full font-bold">
            Submit Feedback
        </button>
    </div>
  );
}