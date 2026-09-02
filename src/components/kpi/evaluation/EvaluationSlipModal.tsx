import React from 'react';
import { 
  X, Printer, Award, Calendar, User, Building, 
  Briefcase, Clock, CheckCircle2, Star, FileText, Lock, ShieldAlert 
} from 'lucide-react';
import { PerformanceEvaluationRecord, EVALUATION_CRITERIA_LIST, isKpiHiddenForEmployee } from '../types';
import { KPI_RATING_SCHEME } from './PerformanceRatingScheme';

interface EvaluationSlipModalProps {
  evaluation: PerformanceEvaluationRecord;
  onClose: () => void;
  hiddenEmployeeIds?: string[];
  isAdmin?: boolean;
}

export default function EvaluationSlipModal({ 
  evaluation, 
  onClose,
  hiddenEmployeeIds = [],
  isAdmin = true 
}: EvaluationSlipModalProps) {
  const isHidden = isKpiHiddenForEmployee(evaluation.employeeId, hiddenEmployeeIds);
  const isAccessDenied = isHidden && !isAdmin;

  const handlePrint = () => {
    if (isAccessDenied) return;
    window.print();
  };

  if (isAccessDenied) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Appraisal Slip Protected</h3>
            <p className="text-xs text-slate-500">
              The evaluation details and appraisal slip for <strong>{evaluation.employeeName}</strong> ({evaluation.employeeId}) are confidential and protected by Administrator Privacy Controls.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Header - Hidden on Print */}
        <div className="p-4 bg-slate-800 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Performance Evaluation Slip</h3>
            <span className="px-2 py-0.5 bg-slate-700 text-slate-200 rounded text-xs">
              {evaluation.period} • {evaluation.evaluationType}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              Print Appraisal Slip
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto print:p-6 print:overflow-visible space-y-6 text-slate-800">
          
          {/* Company & Document Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-wider text-slate-900">SML TRIMS BD LTD.</span>
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
                Staff Performance Appraisal & Competency Evaluation
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded font-mono text-xs font-bold">
                REF: {evaluation.id}
              </span>
              <p className="text-xs text-slate-500 mt-1">Date: {evaluation.evaluationDate || new Date().toISOString().substring(0, 10)}</p>
            </div>
          </div>

          {/* Employee & Assessment Meta Grid */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Employee ID</span>
              <strong className="text-sm font-mono text-slate-900">{evaluation.employeeId}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Employee Name</span>
              <strong className="text-sm text-slate-900">{evaluation.employeeName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Designation</span>
              <strong className="text-slate-800">{evaluation.designation || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Department</span>
              <strong className="text-slate-800">{evaluation.department || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Date Joined</span>
              <strong className="text-slate-800">{evaluation.dateJoined || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Year of Service</span>
              <strong className="text-slate-800">{evaluation.yearOfService || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Evaluation Period</span>
              <strong className="text-emerald-700">{evaluation.period} ({evaluation.evaluationType})</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Evaluated By</span>
              <strong className="text-slate-800">{evaluation.evaluatedBy || 'Management / Supervisor'}</strong>
            </div>
          </div>

          {/* 10 Points Evaluation Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                10-Point Core Competencies Assessment (5 Marks Each • Total 50 Marks)
              </h4>
            </div>

            <table className="w-full text-left border-collapse text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300 w-8 text-center font-bold">#</th>
                  <th className="p-2 border-r border-slate-300 font-bold">Evaluation Criteria</th>
                  <th className="p-2 border-r border-slate-300 font-bold hidden sm:table-cell">Assessment Scope & Standard</th>
                  <th className="p-2 border-r border-slate-300 w-16 text-center font-bold">Max</th>
                  <th className="p-2 w-20 text-center font-bold bg-slate-200">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {EVALUATION_CRITERIA_LIST.map((criterion) => {
                  const score = evaluation.scores[criterion.key] || 0;
                  return (
                    <tr key={criterion.id} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-500">{criterion.id}</td>
                      <td className="p-2 border-r border-slate-300 font-semibold text-slate-900">
                        {criterion.title}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-slate-600 hidden sm:table-cell text-[11px]">
                        {criterion.description}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center text-slate-500 font-medium">5</td>
                      <td className="p-2 text-center font-bold text-slate-900 bg-slate-50/80">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                          score >= 4.5 ? 'bg-emerald-100 text-emerald-800' :
                          score >= 3.5 ? 'bg-blue-100 text-blue-800' :
                          score >= 2.5 ? 'bg-yellow-100 text-yellow-800' :
                          score >= 2.0 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {score}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold">
                  <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider text-slate-700">
                    Total Evaluation Score (Out of 50):
                  </td>
                  <td className="p-2.5 text-center text-slate-600 font-bold border-r border-slate-300">50</td>
                  <td className="p-2.5 text-center text-emerald-700 text-base font-black bg-emerald-50">
                    {evaluation.totalScore}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Rating Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 text-white p-4 rounded-xl">
            <div className="text-center p-2 border-r border-slate-700 last:border-none">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Total Score</span>
              <span className="text-2xl font-black text-emerald-400">{evaluation.totalScore} <span className="text-xs text-slate-400 font-normal">/ 50</span></span>
              <p className="text-[11px] text-slate-300 mt-0.5">{evaluation.percentage}% Overall</p>
            </div>
            <div className="text-center p-2 border-r border-slate-700 last:border-none">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Average Rating</span>
              <div className="flex items-center justify-center gap-1.5 my-0.5">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="text-2xl font-black text-white">{evaluation.averageRating.toFixed(2)}</span>
                <span className="text-xs text-slate-400">/ 5.0</span>
              </div>
              <p className="text-[11px] text-amber-300">10 Criteria Scale</p>
            </div>
            <div className="text-center p-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Performance Classification</span>
              <span className="text-base font-black text-emerald-300 block mt-1">
                {evaluation.ratingGrade}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Appraisal Grade</p>
            </div>
          </div>

          {/* Qualitative Feedback Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <h5 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Key Strengths & Achievements
              </h5>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {evaluation.strengths || 'Consistent performer with reliable adherence to target and SOP benchmarks.'}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <h5 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-blue-600" /> Areas for Development & Recommendation
              </h5>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {evaluation.areasOfImprovement || 'Continuous cross-skill training recommended for machine multi-skilling.'}
              </p>
              {evaluation.recommendation && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-slate-800 font-semibold">
                  Recommendation: <span className="text-blue-700">{evaluation.recommendation}</span>
                </div>
              )}
            </div>
          </div>

          {/* Official 1-5 Rating Scheme Legend & Standard Benchmark */}
          <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-slate-800 flex items-center justify-between text-[11px]">
              <span>Official 1-5 Performance Rating Scheme Standard</span>
              <span className="text-slate-500 font-normal">Applies to all 10 Core Competencies</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white">
              {KPI_RATING_SCHEME.map((item) => (
                <div key={item.point} className="p-2.5 flex flex-col justify-between text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <span 
                      className="w-5 h-5 rounded-full text-white font-black text-[10px] flex items-center justify-center"
                      style={{ backgroundColor: item.colorHex }}
                    >
                      {item.point}
                    </span>
                    <strong className="text-xs font-bold" style={{ color: item.colorHex }}>
                      {item.label}
                    </strong>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Sign-off Signatures */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
            <div>
              <div className="border-t border-slate-400 pt-2 font-semibold text-slate-800">
                {evaluation.employeeName}
              </div>
              <p className="text-[10px] text-slate-500">Employee Signature & Date</p>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-2 font-semibold text-slate-800">
                {evaluation.evaluatedBy || 'Supervisor / Manager'}
              </div>
              <p className="text-[10px] text-slate-500">Evaluator / Supervisor</p>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-2 font-semibold text-slate-800">
                Head of HR / Operations
              </div>
              <p className="text-[10px] text-slate-500">Management Approval</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
