import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, AlertTriangle, Calendar, Clock, MapPin, 
  User, Check, ShieldCheck, FileText, Sparkles 
} from 'lucide-react';
import { Employee } from '../kpi/types';
import { 
  DayOfWeek, 
  GembaScheduleConfig, 
  GembaWalkSession, 
  markGembaWalkConducted, 
  getLocalGembaScheduleConfig 
} from '../../lib/gembaAuditorScheduleEngine';
import { format, parseISO, isValid } from 'date-fns';

interface GembaConductWalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: GembaWalkSession) => void;
  targetDate?: string;
  employees: Employee[];
  spreadsheetId?: string;
  currentUserName?: string;
  currentUserEmail?: string;
}

export default function GembaConductWalkModal({
  isOpen,
  onClose,
  onSuccess,
  targetDate,
  employees,
  spreadsheetId,
  currentUserName,
  currentUserEmail
}: GembaConductWalkModalProps) {
  const [config, setConfig] = useState<GembaScheduleConfig>(() => getLocalGembaScheduleConfig());
  const initialDate = targetDate || format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState<string>(initialDate);

  const parsedDate = parseISO(date);
  const dayOfWeek = (isValid(parsedDate) ? format(parsedDate, 'EEEE') : 'Saturday') as DayOfWeek;
  const scheduledItem = config.schedule[dayOfWeek];

  const [selectedAuditors, setSelectedAuditors] = useState<string[]>([]);
  const [newAuditorName, setNewAuditorName] = useState<string>('');
  const [zonesCovered, setZonesCovered] = useState<string[]>([]);
  const [newZone, setNewZone] = useState<string>('');
  const [cleanPass, setCleanPass] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync default scheduled auditors when date changes
  useEffect(() => {
    if (isOpen) {
      const d = targetDate || format(new Date(), 'yyyy-MM-dd');
      setDate(d);
      const day = (isValid(parseISO(d)) ? format(parseISO(d), 'EEEE') : 'Saturday') as DayOfWeek;
      const scheduled = config.schedule[day];
      setSelectedAuditors(scheduled?.auditorNames?.length ? [...scheduled.auditorNames] : []);
      setZonesCovered(scheduled?.inspectionZones?.length ? [...scheduled.inspectionZones] : ['Cutting', 'Sewing', 'Finishing']);
      setCleanPass(true);
      setNotes('');
    }
  }, [isOpen, targetDate, config]);

  if (!isOpen) return null;

  const handleToggleAuditor = (name: string) => {
    setSelectedAuditors(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleAddAuditor = () => {
    if (!newAuditorName.trim()) return;
    if (!selectedAuditors.includes(newAuditorName.trim())) {
      setSelectedAuditors(prev => [...prev, newAuditorName.trim()]);
    }
    setNewAuditorName('');
  };

  const handleToggleZone = (zone: string) => {
    setZonesCovered(prev => 
      prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]
    );
  };

  const handleAddZone = () => {
    if (!newZone.trim()) return;
    if (!zonesCovered.includes(newZone.trim())) {
      setZonesCovered(prev => [...prev, newZone.trim()]);
    }
    setNewZone('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAuditors.length === 0) {
      alert('Please select or specify at least one auditor who conducted this walk.');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await markGembaWalkConducted(
        date,
        {
          conductedBy: selectedAuditors,
          zonesCovered,
          notes,
          cleanPass,
          findingsCount: cleanPass ? 0 : 1,
          verifiedBy: currentUserName || currentUserEmail || 'Auditor Sign-off'
        },
        spreadsheetId
      );

      onSuccess(session);
      onClose();
    } catch (err) {
      console.error('Failed to submit conducted Gemba walk:', err);
      alert('Failed to save session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-5 sm:px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Conduct & Complete Gemba Walk
              </h3>
              <p className="text-xs text-rose-100 font-medium">
                Official Auditor Floor Sign-Off & Verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          
          {/* Date & Day Selection */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-2xs font-extrabold uppercase tracking-wider text-slate-500 block">
                Walk Audit Date
              </label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-rose-600" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-rose-500 cursor-pointer"
                />
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-500 block">
                Scheduled Day
              </span>
              <span className="text-sm font-black text-rose-700">
                {dayOfWeek}
              </span>
            </div>
          </div>

          {/* Responsible Auditors Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-rose-600" />
                <span>Auditors Who Conducted the Walk <span className="text-rose-500">*</span></span>
              </label>
              <span className="text-2xs font-semibold text-slate-500">
                {scheduledItem?.auditorNames?.length ? `Scheduled: ${scheduledItem.auditorNames.join(', ')}` : 'No auditors pre-scheduled'}
              </span>
            </div>

            {/* Quick Chips for Scheduled Auditors */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {(scheduledItem?.auditorNames || []).map(name => {
                const isSelected = selectedAuditors.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleToggleAuditor(name)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      isSelected 
                        ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-rose-600" />}
                    <span>{name}</span>
                    <span className="text-3xs font-semibold px-1 rounded bg-rose-100/60 text-rose-800">Scheduled</span>
                  </button>
                );
              })}

              {/* Active Employees Quick Picker */}
              {employees.slice(0, 6).map(emp => {
                if ((scheduledItem?.auditorNames || []).includes(emp.name)) return null;
                const isSelected = selectedAuditors.includes(emp.name);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleToggleAuditor(emp.name)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition flex items-center gap-1 cursor-pointer border ${
                      isSelected 
                        ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs font-bold' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-rose-600" />}
                    <span>{emp.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Auditor Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or type auditor name..."
                value={newAuditorName}
                onChange={(e) => setNewAuditorName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAuditor();
                  }
                }}
                className="flex-1 text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500"
              />
              <button
                type="button"
                onClick={handleAddAuditor}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Add
              </button>
            </div>

            {selectedAuditors.length > 0 && (
              <p className="text-2xs text-slate-500 mt-1.5 font-medium">
                Confirmed: <span className="font-bold text-slate-800">{selectedAuditors.join(', ')}</span>
              </p>
            )}
          </div>

          {/* Zones Inspected */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              <span>Inspection Zones Covered</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['Cutting Floor', 'Sewing Line 1-4', 'Finishing Bay', 'Packing Floor', 'Maintenance Workshop', 'Warehouse', 'Chemical Storage'].map(z => {
                const isSelected = zonesCovered.includes(z);
                return (
                  <button
                    key={z}
                    type="button"
                    onClick={() => handleToggleZone(z)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer border ${
                      isSelected 
                        ? 'bg-slate-900 text-white border-slate-900 font-bold' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {z}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add other zone..."
                value={newZone}
                onChange={(e) => setNewZone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddZone();
                  }
                }}
                className="flex-1 text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500"
              />
              <button
                type="button"
                onClick={handleAddZone}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Add Zone
              </button>
            </div>
          </div>

          {/* Outcome / Observation Status */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">
              Floor Standard & Observations Result
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                onClick={() => setCleanPass(true)}
                className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-start gap-2.5 ${
                  cleanPass 
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-2xs' 
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  cleanPass ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                }`}>
                  {cleanPass && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="text-xs font-black block">Clean Floor / Standard Met</span>
                  <span className="text-2xs text-slate-500 font-medium">
                    No critical non-compliances found. 5S visual standards maintained.
                  </span>
                </div>
              </div>

              <div
                onClick={() => setCleanPass(false)}
                className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-start gap-2.5 ${
                  !cleanPass 
                    ? 'border-amber-500 bg-amber-50/70 text-amber-900 shadow-2xs' 
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  !cleanPass ? 'bg-amber-600 text-white' : 'border border-slate-300'
                }`}>
                  {!cleanPass && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="text-xs font-black block">Issues Identified</span>
                  <span className="text-2xs text-slate-500 font-medium">
                    Observations or hazards logged as Gemba findings for corrective action.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Notes & Observations */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>Walk Summary & Auditor Sign-off Remarks</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Completed routine 13-point floor walk. Line 2 sorting improved; reminded operators to keep electrical bridges secured."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 resize-none font-medium text-slate-800"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedAuditors.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Signing Off...' : 'Complete & Sign Off Walk'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
