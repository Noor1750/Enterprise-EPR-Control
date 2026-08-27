import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, 
  ArrowRight, ExternalLink, Activity, Info, X, ShieldAlert, Sparkles
} from 'lucide-react';
import { NavigatorHealthMetric } from './types';
import { getNavigatorIcon } from '../../lib/navigators';

interface NavigatorOverviewProps {
  navigatorMetrics: NavigatorHealthMetric[];
  onNavigate?: (tab: string) => void;
}

export default function NavigatorOverview({
  navigatorMetrics,
  onNavigate
}: NavigatorOverviewProps) {
  const [selectedDrawerNav, setSelectedDrawerNav] = useState<NavigatorHealthMetric | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Chart data for workload comparison
  const chartData = navigatorMetrics.map(n => ({
    name: n.name.replace(' Navigator', '').replace(' Management', ''),
    id: n.id,
    workload: n.totalItems,
    active: n.activeOrPending,
    attention: n.attentionCount,
    health: n.health
  })).sort((a, b) => b.workload - a.workload);

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            Critical
          </span>
        );
      case 'Attention':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Attention
          </span>
        );
      case 'Good':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Good
          </span>
        );
      case 'Excellent':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Healthy
          </span>
        );
    }
  };

  const getBarColor = (health: string) => {
    switch (health) {
      case 'Critical': return '#E11D48';
      case 'Attention': return '#F59E0B';
      case 'Good': return '#3B82F6';
      default: return '#10B981';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 md:p-6 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#1ABB9C]" />
            <h3 className="text-base font-bold text-gray-900">Navigator Performance & Health Overview</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Module-by-module health evaluation, workload ranking, and direct navigation control.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-0.5 rounded-lg flex text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                viewMode === 'table' ? 'bg-white shadow-xs text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Matrix Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                viewMode === 'cards' ? 'bg-white shadow-xs text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Module Cards
            </button>
          </div>
        </div>
      </div>

      {/* Visual Workload Distribution Chart */}
      <div className="mb-6 p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Workload & Record Distribution by Navigator
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Click any bar to open module
          </span>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  const navId = e.activePayload[0].payload.id;
                  onNavigate?.(navId);
                }
              }}
            >
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} 
                interval={0} 
                angle={-15} 
                textAnchor="end"
                height={40}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-900 text-white text-xs p-2.5 rounded-xl shadow-xl border border-gray-700">
                        <div className="font-bold text-sm text-emerald-400 mb-1">{data.name}</div>
                        <div>Total Records: <strong>{data.workload}</strong></div>
                        <div>Active / Pending: <strong>{data.active}</strong></div>
                        {data.attention > 0 && (
                          <div className="text-rose-300 font-bold mt-0.5">Attention Items: {data.attention}</div>
                        )}
                        <div className="mt-1 text-[10px] text-gray-400">Click bar to jump to module →</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="workload" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.health)} 
                    className="cursor-pointer hover:opacity-80 transition-opacity" 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase font-black text-[11px] border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Navigator / Module</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-center">Health Status</th>
                <th className="py-3 px-3 text-right">Total Records</th>
                <th className="py-3 px-3 text-right">Active / Pending</th>
                <th className="py-3 px-3 text-right">Settled / Closed</th>
                <th className="py-3 px-4">Attention Reason</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {navigatorMetrics.map(nav => {
                const Icon = getNavigatorIcon(nav.iconName);
                return (
                  <tr 
                    key={nav.id} 
                    className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedDrawerNav(nav)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center group-hover:bg-[#1ABB9C] group-hover:text-white transition-colors shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-gray-900 group-hover:text-[#1ABB9C] transition-colors">
                          {nav.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-gray-500 font-medium">{nav.category}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {getHealthBadge(nav.health)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                      {nav.totalItems}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-indigo-700">
                      {nav.activeOrPending}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-emerald-700">
                      {nav.completedOrSettled}
                    </td>
                    <td className="py-3 px-4">
                      {nav.attentionReason ? (
                        <span className={`text-[11px] font-medium ${
                          nav.health === 'Critical' ? 'text-rose-700 font-bold' : 'text-amber-700'
                        }`}>
                          {nav.attentionReason}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate?.(nav.id);
                        }}
                        className="p-1.5 bg-gray-100 hover:bg-[#1ABB9C] hover:text-white text-gray-600 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-bold px-2.5"
                        title="Open Module"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {navigatorMetrics.map(nav => {
            const Icon = getNavigatorIcon(nav.iconName);
            return (
              <div
                key={nav.id}
                onClick={() => setSelectedDrawerNav(nav)}
                className="bg-gray-50/70 hover:bg-white p-4 rounded-xl border border-gray-200 hover:border-[#1ABB9C] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 group-hover:bg-[#1ABB9C] group-hover:text-white transition-colors shadow-2xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900 group-hover:text-[#1ABB9C] transition-colors truncate max-w-[160px]">
                        {nav.name}
                      </h4>
                      <span className="text-[10px] text-gray-500">{nav.category}</span>
                    </div>
                  </div>
                  {getHealthBadge(nav.health)}
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 my-2 border-y border-gray-200/60 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold">Total</div>
                    <div className="font-black text-gray-800">{nav.totalItems}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-indigo-500 uppercase font-bold">Active</div>
                    <div className="font-black text-indigo-700">{nav.activeOrPending}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-500 uppercase font-bold">Settled</div>
                    <div className="font-black text-emerald-700">{nav.completedOrSettled}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-gray-500 truncate mr-2">
                    {nav.attentionReason || 'Normal operations'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.(nav.id);
                    }}
                    className="text-[#1ABB9C] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform shrink-0"
                  >
                    <span>Launch</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Drawer / Modal on Click */}
      {selectedDrawerNav && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#1ABB9C]/10 text-[#1ABB9C] flex items-center justify-center">
                    {React.createElement(getNavigatorIcon(selectedDrawerNav.iconName), { className: 'w-5 h-5' })}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{selectedDrawerNav.name}</h3>
                    <p className="text-xs text-gray-500">{selectedDrawerNav.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDrawerNav(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-600 font-medium">Health Status:</span>
                  {getHealthBadge(selectedDrawerNav.health)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-gray-400 text-[10px] uppercase font-bold">Total Workload</div>
                    <div className="text-lg font-black text-gray-900 mt-0.5">{selectedDrawerNav.totalItems}</div>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="text-indigo-600 text-[10px] uppercase font-bold">Active / Pending</div>
                    <div className="text-lg font-black text-indigo-900 mt-0.5">{selectedDrawerNav.activeOrPending}</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="text-emerald-600 text-[10px] uppercase font-bold">Closed / Settled</div>
                    <div className="text-lg font-black text-emerald-900 mt-0.5">{selectedDrawerNav.completedOrSettled}</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="text-amber-700 text-[10px] uppercase font-bold">Attention Req.</div>
                    <div className="text-lg font-black text-amber-900 mt-0.5">{selectedDrawerNav.attentionCount}</div>
                  </div>
                </div>

                {selectedDrawerNav.attentionReason && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                    <strong>Notice:</strong> {selectedDrawerNav.attentionReason}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDrawerNav(null)}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const navId = selectedDrawerNav.id;
                    setSelectedDrawerNav(null);
                    onNavigate?.(navId);
                  }}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#1ABB9C] hover:bg-[#16A085] rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>Open Full Navigator</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
