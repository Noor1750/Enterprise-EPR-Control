import React, { useState, useEffect } from 'react';
import { Target, Star, BarChart3, Award, Calendar, ChevronRight, FileCheck2 } from 'lucide-react';
import KPIManagement from './KPIManagement';
import PerformanceEvaluation from './evaluation/PerformanceEvaluation';
import PerformanceReviews from '../performance/PerformanceReviews';
import { Employee } from './types';
import { resolvePaletteForModule } from '../../lib/colorPalettes';

interface KPIPerformanceProps {
  spreadsheetId: string;
  employees: Employee[];
  accessLevels: string[];
  userEmail: string;
  userSecurityScope?: any;
  user?: any;
  initialParameter?: 'monthly-kpi' | 'performance-evaluation' | 'performance-reviews';
}

export default function KPIPerformance({
  spreadsheetId,
  employees,
  accessLevels,
  userEmail,
  userSecurityScope,
  user,
  initialParameter = 'monthly-kpi'
}: KPIPerformanceProps) {
  // Top-Level Parameter Switcher:
  // 1. "monthly-kpi" -> Monthly KPI Management System
  // 2. "performance-evaluation" -> Performance Evaluation (Quarterly, Half Yearly, Yearly 10-point system)
  // 3. "performance-reviews" -> Performance Reviews & 360° Evaluation Cycles
  const [activeParameter, setActiveParameter] = useState<'monthly-kpi' | 'performance-evaluation' | 'performance-reviews'>(initialParameter);
  const palette = resolvePaletteForModule('kpi');

  useEffect(() => {
    if (initialParameter) {
      setActiveParameter(initialParameter);
    }
  }, [initialParameter]);

  useEffect(() => {
    const handleModuleContext = (e: any) => {
      const detail = e.detail;
      if (detail?.moduleId === 'kpi' || detail?.moduleId === 'reviews') {
        if (detail.action === 'performance-reviews' || detail.moduleId === 'reviews') {
          setActiveParameter('performance-reviews');
        } else if (detail.action === 'performance-evaluation') {
          setActiveParameter('performance-evaluation');
        } else if (detail.action === 'monthly-kpi') {
          setActiveParameter('monthly-kpi');
        }
      }
    };
    window.addEventListener('erp-module-context', handleModuleContext);
    return () => window.removeEventListener('erp-module-context', handleModuleContext);
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Main Parameter Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Module Title & Breadcrumbs */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Operations & HR</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-bold" style={{ color: palette.primaryHex }}>KPI Performance</span>
              {activeParameter === 'performance-reviews' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="font-semibold text-slate-700">Performance Reviews</span>
                </>
              )}
              {activeParameter === 'performance-evaluation' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="font-semibold text-slate-700">Performance Evaluation</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <div 
                className="p-2.5 text-white rounded-xl shadow-xs"
                style={{
                  backgroundColor: palette.primaryHex,
                  color: palette.secondaryHex
                }}
              >
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    KPI Performance
                  </h1>
                  <span 
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: palette.pillBg,
                      color: palette.pillText
                    }}
                  >
                    Appraisals, Evaluations & Reviews
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comprehensive performance tracking, monthly scorecards, 10-point competencies & review cycles.
                </p>
              </div>
            </div>
          </div>

          {/* Master Parameter Switcher */}
          <div className="flex flex-wrap items-center bg-slate-100/90 p-1.5 rounded-2xl gap-1.5 border border-slate-200/80">
            
            {/* Parameter 1: Monthly KPI Management System */}
            <button
              onClick={() => setActiveParameter('monthly-kpi')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer group ${
                activeParameter === 'monthly-kpi'
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              style={activeParameter === 'monthly-kpi' ? { backgroundColor: palette.primaryHex, color: palette.secondaryHex } : undefined}
            >
              <BarChart3 className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover-icon-anim" style={{ color: activeParameter === 'monthly-kpi' ? palette.secondaryHex : '#10B981' }} />
              <span>Monthly KPI System</span>
            </button>

            {/* Parameter 2: Performance Evaluation (Quarterly, Half Yearly, Yearly) */}
            <button
              onClick={() => setActiveParameter('performance-evaluation')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer group ${
                activeParameter === 'performance-evaluation'
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              style={activeParameter === 'performance-evaluation' ? { backgroundColor: palette.primaryHex, color: palette.secondaryHex } : undefined}
            >
              <Star className="w-4 h-4 fill-current transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 group-hover-icon-anim" style={{ color: activeParameter === 'performance-evaluation' ? palette.secondaryHex : '#F59E0B' }} />
              <span>Performance Evaluation</span>
              <span 
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: activeParameter === 'performance-evaluation' ? palette.pillBg : '#E2E8F0',
                  color: activeParameter === 'performance-evaluation' ? palette.pillText : '#334155'
                }}
              >
                10-Point System
              </span>
            </button>

            {/* Parameter 3: Performance Reviews (Moved Inside KPI Performance) */}
            <button
              onClick={() => setActiveParameter('performance-reviews')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer group ${
                activeParameter === 'performance-reviews'
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              style={activeParameter === 'performance-reviews' ? { backgroundColor: palette.primaryHex, color: palette.secondaryHex } : undefined}
            >
              <Award className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover-icon-anim" style={{ color: activeParameter === 'performance-reviews' ? palette.secondaryHex : '#6366F1' }} />
              <span>Performance Reviews</span>
              <span 
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: activeParameter === 'performance-reviews' ? palette.pillBg : '#E2E8F0',
                  color: activeParameter === 'performance-reviews' ? palette.pillText : '#334155'
                }}
              >
                Appraisal Cycles
              </span>
            </button>

          </div>

        </div>
      </div>

      {/* PARAMETER 1: Monthly KPI Management System */}
      {activeParameter === 'monthly-kpi' && (
        <KPIManagement
          spreadsheetId={spreadsheetId}
          employees={employees}
          accessLevels={accessLevels}
          userEmail={userEmail}
          userSecurityScope={userSecurityScope}
        />
      )}

      {/* PARAMETER 2: Performance Evaluation (Quarterly, Half Yearly, Yearly) */}
      {activeParameter === 'performance-evaluation' && (
        <PerformanceEvaluation
          spreadsheetId={spreadsheetId}
          employees={employees}
          userEmail={userEmail}
          userSecurityScope={userSecurityScope}
        />
      )}

      {/* PARAMETER 3: Performance Reviews & Evaluation Cycles */}
      {activeParameter === 'performance-reviews' && (
        <PerformanceReviews
          spreadsheetId={spreadsheetId}
          user={user}
          userSecurityScope={userSecurityScope}
        />
      )}

    </div>
  );
}
