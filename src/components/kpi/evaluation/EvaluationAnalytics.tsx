import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, Legend, PieChart, Pie 
} from 'recharts';
import { 
  Award, TrendingUp, Users, Star, CheckCircle2, 
  Building, Target, ShieldCheck, FileSpreadsheet 
} from 'lucide-react';
import { PerformanceEvaluationRecord, EVALUATION_CRITERIA_LIST } from '../types';

interface EvaluationAnalyticsProps {
  records: PerformanceEvaluationRecord[];
  hiddenEmployeeIds?: string[];
  isAdmin?: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  'Outstanding': '#10B981',
  'Exceeds Expectations': '#3B82F6',
  'Meets Expectations': '#14B8A6',
  'Needs Improvement': '#F59E0B',
  'Unsatisfactory': '#EF4444',
};

export default function EvaluationAnalytics({
  records,
  hiddenEmployeeIds = [],
  isAdmin = true
}: EvaluationAnalyticsProps) {
  // Respect privacy for non-admin viewers
  const activeRecords = useMemo(() => {
    if (isAdmin) return records;
    return records.filter(r => !hiddenEmployeeIds.map(id => id.toUpperCase()).includes(r.employeeId.toUpperCase()));
  }, [records, hiddenEmployeeIds, isAdmin]);

  // 1. Calculate Average Score per each of the 10 points
  const criteriaAverages = useMemo(() => {
    if (activeRecords.length === 0) {
      return EVALUATION_CRITERIA_LIST.map(c => ({
        subject: c.shortLabel,
        fullTitle: c.title,
        average: 0,
        max: 5
      }));
    }

    return EVALUATION_CRITERIA_LIST.map(criterion => {
      const sum = activeRecords.reduce((acc, r) => acc + (r.scores[criterion.key] || 0), 0);
      const avg = Number((sum / activeRecords.length).toFixed(2));
      return {
        subject: criterion.shortLabel,
        fullTitle: criterion.title,
        average: avg,
        max: 5
      };
    });
  }, [activeRecords]);

  // 2. Department-wise Average Ratings
  const departmentStats = useMemo(() => {
    const deptMap: Record<string, { count: number; totalRating: number; totalScore: number }> = {};
    
    activeRecords.forEach(r => {
      const dept = r.department || 'General';
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, totalRating: 0, totalScore: 0 };
      }
      deptMap[dept].count += 1;
      deptMap[dept].totalRating += r.averageRating;
      deptMap[dept].totalScore += r.totalScore;
    });

    return Object.entries(deptMap).map(([dept, data]) => ({
      department: dept,
      headcount: data.count,
      avgRating: Number((data.totalRating / data.count).toFixed(2)),
      avgScore: Number((data.totalScore / data.count).toFixed(1))
    })).sort((a, b) => b.avgRating - a.avgRating);
  }, [activeRecords]);

  // 3. Rating Grade Distribution (Pie chart)
  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      'Outstanding': 0,
      'Exceeds Expectations': 0,
      'Meets Expectations': 0,
      'Needs Improvement': 0,
      'Unsatisfactory': 0
    };

    activeRecords.forEach(r => {
      if (counts[r.ratingGrade] !== undefined) {
        counts[r.ratingGrade]++;
      } else {
        counts['Meets Expectations']++;
      }
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([grade, count]) => ({
        name: grade,
        value: count,
        color: GRADE_COLORS[grade] || '#6B7280'
      }));
  }, [activeRecords]);

  // 4. Top 5 Performers
  const topPerformers = useMemo(() => {
    return [...activeRecords]
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 6);
  }, [activeRecords]);

  if (activeRecords.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
        <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Evaluation Data Yet</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Perform evaluations for employees to view 10-point competency charts, department comparisons, and appraisal distributions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top 2 Major Charts: Radar Competency & Department Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Radar Chart: 10 Competencies Averages */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                10-Point Core Competencies Radar (Max 5.0)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Organizational average across all evaluated staff.
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={criteriaAverages}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Radar
                  name="Average Rating"
                  dataKey="average"
                  stroke="#4F46E5"
                  fill="#6366F1"
                  fillOpacity={0.4}
                />
                <Tooltip 
                  formatter={(value: any) => [`${value} / 5.0`, 'Average Score']}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Department Average Ratings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                Department Performance Comparison (Average Rating)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Benchmark average scores across production & support units.
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="department" 
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis domain={[0, 5]} tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip 
                  formatter={(val: any) => [`${val} / 5.0`, 'Avg Rating']}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="avgRating" fill="#10B981" radius={[6, 6, 0, 0]}>
                  {departmentStats.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.avgRating >= 4.5 ? '#10B981' : entry.avgRating >= 3.8 ? '#3B82F6' : entry.avgRating >= 3.0 ? '#14B8A6' : '#F59E0B'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Row: 10 Criteria Breakdown List & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Detailed 10 Criteria Progress Breakdown */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            10-Point Competency Score Breakdown
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {criteriaAverages.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 truncate pr-2" title={item.fullTitle}>
                    {idx + 1}. {item.fullTitle}
                  </span>
                  <span className="font-mono font-black text-indigo-700 shrink-0">
                    {item.average.toFixed(2)} / 5.0
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      item.average >= 4.5 ? 'bg-emerald-500' :
                      item.average >= 3.8 ? 'bg-indigo-600' :
                      item.average >= 3.0 ? 'bg-teal-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${(item.average / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers Leaderboard */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Top Rated Performers
          </h3>

          <div className="space-y-2.5">
            {topPerformers.map((emp, index) => (
              <div 
                key={emp.id}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 transition flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full font-bold text-[11px] flex items-center justify-center font-mono ${
                    index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    index === 1 ? 'bg-slate-200 text-slate-700' :
                    index === 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    #{index + 1}
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 leading-none">{emp.employeeName}</h5>
                    <span className="text-[10px] text-slate-500">{emp.designation || emp.department}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 font-black text-amber-600">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{emp.averageRating.toFixed(2)}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block">{emp.totalScore} / 50 pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
