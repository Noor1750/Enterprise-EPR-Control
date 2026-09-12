import React, { useState, useMemo } from 'react';
import { 
  SmartActivity, 
  SMART_ACTIVITIES_CATALOG, 
  ASSISTANT_PROFILES, 
  AssistantProfile 
} from '../../types/assistant';
import { 
  Activity, 
  Search, 
  Sparkles, 
  Play, 
  Clock, 
  ShieldCheck, 
  Filter, 
  ArrowRight,
  Flame,
  CheckCircle2,
  Wrench,
  Users,
  Compass,
  CheckSquare
} from 'lucide-react';
import { UserSecurityScope } from '../../lib/security';

interface AssistantActivitiesViewProps {
  userScope?: UserSecurityScope;
  activeProfile: AssistantProfile;
  onRunActivity: (activity: SmartActivity) => void;
}

export const AssistantActivitiesView: React.FC<AssistantActivitiesViewProps> = ({
  userScope,
  activeProfile,
  onRunActivity
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Activities' },
    { id: 'operations', label: 'Operations & Executive' },
    { id: 'maintenance', label: 'Maintenance & Reliability' },
    { id: 'workforce', label: 'Workforce & HR' },
    { id: 'lean', label: 'Lean & 5S' },
    { id: 'tasks', label: 'Task Dispatch' }
  ];

  const filteredActivities = useMemo(() => {
    return SMART_ACTIVITIES_CATALOG.filter(activity => {
      const matchesCategory = selectedCategory === 'all' || activity.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        activity.title.toLowerCase().includes(q) || 
        activity.description.toLowerCase().includes(q) ||
        activity.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div id="assistant-activities-panel" className="p-4 space-y-4 max-w-4xl mx-auto overflow-y-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-800 rounded-xl p-4 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Enterprise Smart Activities</h2>
            <p className="text-xs text-slate-300">
              One-click structured operational workflows, diagnostic audits, and executive briefings.
            </p>
          </div>
        </div>

        {/* Current Active Persona Indicator */}
        <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs">
          <img
            src={activeProfile.avatarUrl}
            alt={activeProfile.name}
            referrerPolicy="no-referrer"
            className="w-5 h-5 rounded-full object-cover border"
            style={{ borderColor: activeProfile.auraColor }}
          />
          <span className="text-slate-300">Executing with:</span>
          <span className="font-semibold text-white">{activeProfile.name}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            id="activities-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities (e.g. Gemba, breakdown, handover)..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              id={`activity-filter-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredActivities.map((act) => {
          const recProfile = ASSISTANT_PROFILES.find(p => p.id === act.recommendedProfileId) || ASSISTANT_PROFILES[0];

          return (
            <div
              key={act.id}
              id={`activity-card-${act.id}`}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md group"
            >
              <div>
                {/* Card Top Metadata */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {act.category}
                  </span>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>~{act.estimatedSecs}s</span>
                  </div>
                </div>

                {/* Title and Description */}
                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                  {act.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {act.description}
                </p>

                {/* Specialist Recommendation Pill */}
                <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <img
                    src={recProfile.avatarUrl}
                    alt={recProfile.name}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-md object-cover border"
                    style={{ borderColor: recProfile.auraColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 leading-tight">Recommended Specialist</p>
                    <p className="text-xs font-semibold text-slate-200 truncate">{recProfile.name} ({recProfile.role})</p>
                  </div>
                </div>
              </div>

              {/* Action Trigger Button */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  {act.badge || 'All Roles'}
                </span>

                <button
                  type="button"
                  id={`run-activity-btn-${act.id}`}
                  onClick={() => onRunActivity(act)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-transform active:scale-95"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Execute Activity</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredActivities.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-xs">
          No activities match your search. Try another query or switch categories.
        </div>
      )}
    </div>
  );
};
