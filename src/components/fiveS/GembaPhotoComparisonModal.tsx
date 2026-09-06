import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ArrowLeftRight, Eye, Calendar, User, MapPin, Clock } from 'lucide-react';
import { GembaWalkItem } from '../../lib/gembaWalkEngine';

interface GembaPhotoComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: GembaWalkItem | null;
}

export default function GembaPhotoComparisonModal({
  isOpen,
  onClose,
  item
}: GembaPhotoComparisonModalProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');

  if (!isOpen || !item) return null;

  const hasBoth = Boolean(item.beforePhoto && item.afterPhoto);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                5S Transformation: Before vs. After
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {item.locationAsset} • {item.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasBoth && (
              <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('slider')}
                  className={`px-3 py-1.5 rounded-md transition ${viewMode === 'slider' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-700'}`}
                >
                  Interactive Slider
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('side-by-side')}
                  className={`px-3 py-1.5 rounded-md transition ${viewMode === 'side-by-side' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-700'}`}
                >
                  Side by Side
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visual Stage */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {hasBoth && viewMode === 'slider' ? (
            <div className="relative aspect-video max-h-[460px] w-full mx-auto rounded-xl overflow-hidden shadow-md select-none bg-slate-950">
              {/* After Image (Background) */}
              <img
                src={item.afterPhoto}
                alt="After Resolution"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-xs font-bold shadow-xs">
                AFTER (Resolved Standard)
              </div>

              {/* Before Image (Clipped by slider) */}
              <div
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
              >
                <img
                  src={item.beforePhoto}
                  alt="Before Finding"
                  className="absolute inset-0 w-full h-full object-cover max-w-none"
                  style={{ width: '100%', height: '100%' }}
                />
                <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-rose-600/90 text-white text-xs font-bold shadow-xs">
                  BEFORE (Anomaly Detected)
                </div>
              </div>

              {/* Slider Line & Handle */}
              <div
                className="absolute inset-y-0 z-20 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center"
                style={{ left: `calc(${sliderPosition}% - 2px)` }}
              >
                <div className="w-8 h-8 rounded-full bg-white text-slate-800 shadow-lg flex items-center justify-center -ml-0.5 border border-slate-300">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
              </div>

              {/* Range Input Overlay */}
              <input
                type="range"
                min={0}
                max={100}
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Before Card */}
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <div className="px-4 py-2 bg-rose-100 border-b border-rose-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> BEFORE (Initial Finding)
                  </span>
                  <span className="text-2xs text-rose-800 font-semibold">{item.date}</span>
                </div>
                <div className="aspect-video bg-slate-100 relative">
                  {item.beforePhoto ? (
                    <img src={item.beforePhoto} alt="Before" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                      No before photo available
                    </div>
                  )}
                </div>
              </div>

              {/* After Card */}
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <div className="px-4 py-2 bg-emerald-100 border-b border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> AFTER (Visual 5S Solution)
                  </span>
                  <span className="text-2xs text-emerald-800 font-semibold">
                    {item.closureDate || (item.status === 'Resolved' ? 'Resolved' : 'Pending Verification')}
                  </span>
                </div>
                <div className="aspect-video bg-slate-100 relative">
                  {item.afterPhoto ? (
                    <img src={item.afterPhoto} alt="After" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs p-4 text-center">
                      <Clock className="w-6 h-6 mb-2 text-slate-400" />
                      <span className="font-semibold">After improvement photo has not been uploaded yet.</span>
                      <span className="text-2xs text-slate-500 mt-1">Status: {item.status}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Metadata Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-b border-slate-200 pb-3">
              <div>
                <span className="text-slate-500 text-2xs block font-bold uppercase">Observation / Finding</span>
                <span className="font-bold text-slate-900">{item.observationFinding}</span>
              </div>
              <div>
                <span className="text-slate-500 text-2xs block font-bold uppercase">Root Cause (5-Why Hint)</span>
                <span className="font-bold text-slate-900">{item.rootCause || 'Under review'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-2xs block font-bold uppercase">Immediate Action Taken</span>
                <span className="font-bold text-slate-900">{item.immediateAction}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-slate-700">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Responsible: <strong className="text-slate-950 font-bold">{item.responsible}</strong>
                </span>
                <span className="flex items-center gap-1 text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Target: <strong className="text-slate-950 font-bold">{item.targetDate}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  {item.category}
                </span>
                <span className={`px-2.5 py-1 text-xs rounded-full font-bold border ${
                  item.status === 'Verified & Closed'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : item.status === 'Resolved'
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : 'bg-amber-100 text-amber-950 border-amber-300'
                }`}>
                  Status: {item.status}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
}
