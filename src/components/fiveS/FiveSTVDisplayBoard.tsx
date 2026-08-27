import React, { useState, useEffect } from 'react';
import { 
  X, Maximize2, Minimize2, Award, Sparkles, TrendingUp, 
  ShieldCheck, AlertTriangle, CheckCircle, Clock, BarChart3, 
  Layers, Factory, Activity
} from 'lucide-react';
import { FiveSAssessment, FiveSCorrectiveAction, FiveSWinner } from '../../lib/fiveSEngine';
import { format } from 'date-fns';

interface FiveSTVDisplayBoardProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  assessments: FiveSAssessment[];
  winners: FiveSWinner[];
  correctiveActions: FiveSCorrectiveAction[];
  departmentStats: { department: string; avgScore: number; count: number; bestScore: number }[];
}

export default function FiveSTVDisplayBoard({
  isOpen,
  onClose,
  selectedMonth,
  assessments,
  winners,
  correctiveActions,
  departmentStats
}: FiveSTVDisplayBoardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log(err));
        setIsFullscreen(false);
      }
    }
  };

  if (!isOpen) return null;

  // Monthly top 3
  const top1 = winners.find(w => w.rank === 1);
  const top2 = winners.find(w => w.rank === 2);
  const top3 = winners.find(w => w.rank === 3);

  // Month assessments
  const monthAudits = assessments.filter(a => a.month === selectedMonth);
  const totalAudits = monthAudits.length;
  const avgOverallScore = totalAudits > 0 
    ? Math.round(monthAudits.reduce((acc, a) => acc + a.finalScore, 0) / totalAudits) 
    : 0;

  // Category averages
  const sortAvg = totalAudits > 0 ? Math.round(monthAudits.reduce((acc, a) => acc + a.sortScore, 0) / totalAudits) : 0;
  const setInOrderAvg = totalAudits > 0 ? Math.round(monthAudits.reduce((acc, a) => acc + a.setInOrderScore, 0) / totalAudits) : 0;
  const shineAvg = totalAudits > 0 ? Math.round(monthAudits.reduce((acc, a) => acc + a.shineScore, 0) / totalAudits) : 0;
  const standardizeAvg = totalAudits > 0 ? Math.round(monthAudits.reduce((acc, a) => acc + a.standardizeScore, 0) / totalAudits) : 0;
  const sustainAvg = totalAudits > 0 ? Math.round(monthAudits.reduce((acc, a) => acc + a.sustainScore, 0) / totalAudits) : 0;
  const visualAvg = totalAudits > 0 ? Math.round(monthAudits.reduce((acc, a) => acc + a.visualScore, 0) / totalAudits) : 0;

  // Action counts
  const openActions = correctiveActions.filter(a => a.status === 'Open' || a.status === 'In Progress').length;
  const closedActions = correctiveActions.filter(a => a.status === 'Closed' || a.status === 'Verified' || a.status === 'Completed').length;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19] text-white flex flex-col font-sans overflow-hidden select-none">
      
      {/* Top TV Bar */}
      <div className="bg-[#111827]/90 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
              SHOP FLOOR 5S & VISUAL MANAGEMENT DIGITAL BOARD
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300">
                PERIOD: {selectedMonth}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Live Housekeeping Leaderboard, Category Compliance & Continuous Improvement Tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm font-black text-slate-200 tracking-wider">
              {format(currentTime, 'EEEE, dd MMMM yyyy')}
            </div>
            <div className="text-xs font-mono font-bold text-blue-400">
              {format(currentTime, 'hh:mm:ss a')}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition"
              title="Close TV Mode"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* TV Main Grid */}
      <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-y-auto">
        
        {/* Left 7 Columns: Top 3 Podium & Leaderboard */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          
          {/* Top 3 Champions Podium Card */}
          <div className="bg-[#111827]/80 rounded-2xl border border-slate-800 p-6 relative overflow-hidden shadow-2xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
                  Top 3 Best 5S & Housekeeping Employees ({selectedMonth})
                </h2>
              </div>
              <span className="text-xs font-bold text-amber-400 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                Factory Excellence Champions
              </span>
            </div>

            {winners.length > 0 ? (
              <div className="grid grid-cols-3 gap-4 items-end flex-1 pt-4">
                
                {/* 2nd Place Silver */}
                <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/90 rounded-2xl border border-slate-700 p-4 text-center relative flex flex-col justify-end min-h-[220px]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-300 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg border-2 border-white">
                    2
                  </div>
                  {top2 ? (
                    <>
                      <div className="text-slate-300 font-extrabold text-xs uppercase mb-1">🥈 Silver Award</div>
                      <div className="text-white font-black text-sm truncate">{top2.employeeName}</div>
                      <div className="text-[11px] text-slate-400 truncate">{top2.department} • {top2.designation}</div>
                      <div className="mt-3 pt-2 border-t border-slate-700/60">
                        <span className="text-2xl font-black text-slate-200">{top2.finalScore}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 py-6">Pending Audit</div>
                  )}
                </div>

                {/* 1st Place Gold Champion (Tallest) */}
                <div className="bg-gradient-to-b from-amber-500/20 via-slate-800/90 to-slate-900 rounded-2xl border-2 border-amber-500/60 p-5 text-center relative flex flex-col justify-end min-h-[260px] shadow-amber-500/10 shadow-2xl">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-base flex items-center justify-center shadow-xl border-2 border-white">
                    👑
                  </div>
                  {top1 ? (
                    <>
                      <div className="text-amber-400 font-black text-xs uppercase tracking-wider mb-1">🥇 1st Place Gold Champion</div>
                      <div className="text-white font-black text-base truncate">{top1.employeeName}</div>
                      <div className="text-xs text-slate-300 truncate">{top1.department} • {top1.designation}</div>
                      <div className="mt-4 pt-2 border-t border-amber-500/30">
                        <span className="text-3xl font-black text-amber-400">{top1.finalScore}%</span>
                        <span className="block text-[10px] text-amber-200/80 font-bold uppercase mt-0.5">Top Housekeeping Honor</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 py-8">Pending Audit</div>
                  )}
                </div>

                {/* 3rd Place Bronze */}
                <div className="bg-gradient-to-b from-amber-900/30 to-slate-900/90 rounded-2xl border border-amber-800/50 p-4 text-center relative flex flex-col justify-end min-h-[190px]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center shadow-lg border-2 border-amber-300">
                    3
                  </div>
                  {top3 ? (
                    <>
                      <div className="text-amber-500 font-extrabold text-xs uppercase mb-1">🥉 Bronze Award</div>
                      <div className="text-white font-black text-sm truncate">{top3.employeeName}</div>
                      <div className="text-[11px] text-slate-400 truncate">{top3.department} • {top3.designation}</div>
                      <div className="mt-3 pt-2 border-t border-slate-700/60">
                        <span className="text-2xl font-black text-amber-400">{top3.finalScore}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 py-6">Pending Audit</div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Award className="w-12 h-12 text-slate-700 mb-2" />
                <p className="text-sm font-semibold">No Top 3 declared for {selectedMonth} yet.</p>
                <p className="text-xs text-slate-600 mt-1">Complete assessments to view live factory leaderboard.</p>
              </div>
            )}
          </div>

          {/* Department Rankings Card */}
          <div className="bg-[#111827]/80 rounded-2xl border border-slate-800 p-5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Factory className="w-4 h-4 text-blue-400" />
              Department-Wise 5S Compliance & Ranking
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {departmentStats.map((dept, idx) => (
                <div key={dept.department} className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black w-4 h-4 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white truncate">{dept.department}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{dept.count} audits</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-black ${dept.avgScore >= 90 ? 'text-emerald-400' : dept.avgScore >= 80 ? 'text-blue-400' : 'text-amber-400'}`}>
                      {dept.avgScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right 5 Columns: Category Pillars & Health Gauges */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          
          {/* 5S + Visual Dimension Gauges */}
          <div className="bg-[#111827]/80 rounded-2xl border border-slate-800 p-5 shadow-xl flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              5S Pillar Breakdown ({selectedMonth})
            </h3>

            <div className="space-y-3.5 flex-1 flex flex-col justify-around">
              {[
                { name: '1. Sort (Seiri)', score: sortAvg, desc: 'Unneeded items removed' },
                { name: '2. Set In Order (Seiton)', score: setInOrderAvg, desc: '30-second retrieval, labels & lines' },
                { name: '3. Shine (Seiso)', score: shineAvg, desc: 'Clean, inspection & machine care' },
                { name: '4. Standardize (Seiketsu)', score: standardizeAvg, desc: 'Visual SOPs & checklists' },
                { name: '5. Sustain (Shitsuke)', score: sustainAvg, desc: 'Discipline, training & Kaizen' },
                { name: '6. Visual Controls', score: visualAvg, desc: 'Signage, color-coding & boards' },
              ].map(item => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{item.name}</span>
                    <span className="font-black text-blue-400">{item.score}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        item.score >= 90 ? 'bg-emerald-500' :
                        item.score >= 80 ? 'bg-blue-500' :
                        item.score >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, item.score)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items & Plant Health Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#111827]/80 rounded-2xl border border-slate-800 p-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Plant Average 5S</span>
              <span className="text-2xl font-black text-white mt-1 block">{avgOverallScore}%</span>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> +2.4% vs last period
              </span>
            </div>

            <div className="bg-[#111827]/80 rounded-2xl border border-slate-800 p-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Open Corrective Actions</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">{openActions}</span>
              <span className="text-[11px] text-slate-400 block mt-1">
                {closedActions} resolved this month
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Slogan Ticker Bar */}
      <div className="bg-[#111827] border-t border-slate-800 px-6 py-2 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-2 text-amber-400 font-extrabold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>WORK SMARTER, NOT HARDER</span>
        </div>
        <div className="text-slate-500 font-medium">
          Target Standard: 90%+ 5S Discipline • Auto-refreshes every audit cycle
        </div>
      </div>

    </div>
  );
}
