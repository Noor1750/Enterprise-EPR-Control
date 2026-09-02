import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

export interface RatingSchemePoint {
  point: number;
  label: 'Unsatisfactory' | 'Below Average' | 'Average' | 'Good' | 'Excellent';
  shortTitle: string;
  description: string;
  benchmarkRange: string;
  percentageRange: string;
  colorHex: string;
  gradient: string;
  glowColor: string;
  lightBgHex: string;
  borderColorHex: string;
  textClass: string;
  bgClass: string;
  lightBgClass: string;
  borderClass: string;
}

export const KPI_RATING_SCHEME: RatingSchemePoint[] = [
  {
    point: 1,
    label: 'Unsatisfactory',
    shortTitle: 'Point 1',
    description: 'Significantly below most other employees in similar position',
    benchmarkRange: '1.00 – 1.99',
    percentageRange: '0% – 39%',
    colorHex: '#E50914', // Vibrant Red
    gradient: 'linear-gradient(180deg, #FF1723 0%, #D40510 100%)',
    glowColor: 'rgba(229, 9, 20, 0.35)',
    lightBgHex: '#FEF2F2',
    borderColorHex: '#FCA5A5',
    textClass: 'text-[#E50914]',
    bgClass: 'bg-[#E50914]',
    lightBgClass: 'bg-red-50',
    borderClass: 'border-red-200'
  },
  {
    point: 2,
    label: 'Below Average',
    shortTitle: 'Point 2',
    description: 'Not as good as the average employee in similar position',
    benchmarkRange: '2.00 – 2.99',
    percentageRange: '40% – 59%',
    colorHex: '#FF5A60', // Coral / Salmon Pink-Red
    gradient: 'linear-gradient(180deg, #FF6E74 0%, #F2444B 100%)',
    glowColor: 'rgba(255, 90, 96, 0.35)',
    lightBgHex: '#FFF1F2',
    borderColorHex: '#FECDD3',
    textClass: 'text-[#FF5A60]',
    bgClass: 'bg-[#FF5A60]',
    lightBgClass: 'bg-rose-50',
    borderClass: 'border-rose-200'
  },
  {
    point: 3,
    label: 'Average',
    shortTitle: 'Point 3',
    description: 'In line with most other employees in similar position',
    benchmarkRange: '3.00 – 3.79',
    percentageRange: '60% – 75%',
    colorHex: '#F7B928', // Warm Amber / Golden Yellow
    gradient: 'linear-gradient(180deg, #FFC83B 0%, #E89A08 100%)',
    glowColor: 'rgba(247, 185, 40, 0.35)',
    lightBgHex: '#FFFBEB',
    borderColorHex: '#FDE68A',
    textClass: 'text-[#D97706]',
    bgClass: 'bg-[#F7B928]',
    lightBgClass: 'bg-amber-50',
    borderClass: 'border-amber-200'
  },
  {
    point: 4,
    label: 'Good',
    shortTitle: 'Point 4',
    description: 'Better than most other employees in similar position',
    benchmarkRange: '3.80 – 4.49',
    percentageRange: '76% – 89%',
    colorHex: '#38C1B6', // Turquoise / Mint Teal
    gradient: 'linear-gradient(180deg, #44D7CB 0%, #1FA69B 100%)',
    glowColor: 'rgba(56, 193, 182, 0.35)',
    lightBgHex: '#F0FDFA',
    borderColorHex: '#99F6E4',
    textClass: 'text-[#0D9488]',
    bgClass: 'bg-[#38C1B6]',
    lightBgClass: 'bg-teal-50',
    borderClass: 'border-teal-200'
  },
  {
    point: 5,
    label: 'Excellent',
    shortTitle: 'Point 5',
    description: 'Significantly better than most other employees in similar position',
    benchmarkRange: '4.50 – 5.00',
    percentageRange: '90% – 100%',
    colorHex: '#00A843', // Emerald Vivid Green
    gradient: 'linear-gradient(180deg, #10BF54 0%, #008F38 100%)',
    glowColor: 'rgba(0, 168, 67, 0.35)',
    lightBgHex: '#F0FDF4',
    borderColorHex: '#A7F3D0',
    textClass: 'text-[#00A843]',
    bgClass: 'bg-[#00A843]',
    lightBgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200'
  }
];

// 3D Illuminated Lightbulb SVG Component
function Realistic3DLightbulb({ colorHex, glowColor, lightBgHex, borderColorHex }: { 
  colorHex: string; 
  glowColor: string;
  lightBgHex: string;
  borderColorHex: string;
}) {
  return (
    <div 
      className="relative w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
      style={{
        background: `radial-gradient(circle at 35% 30%, #FFFFFF 0%, ${lightBgHex} 65%, ${borderColorHex} 100%)`,
        border: `2px solid ${borderColorHex}`,
        boxShadow: `0 8px 16px -4px ${glowColor}, inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.06)`
      }}
    >
      {/* Specular gloss arc */}
      <div 
        className="absolute top-1 left-2 w-5 h-2.5 rounded-full opacity-70 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)',
          transform: 'rotate(-25deg)'
        }}
      />

      {/* 3D Rendered Bulb SVG with glowing filament */}
      <svg 
        viewBox="0 0 24 24" 
        className="w-7 h-7"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: `drop-shadow(0 2px 6px ${glowColor})`
        }}
      >
        {/* Outer Bulb Envelope */}
        <path 
          d="M9 18H15M10 21H14M12 2C7.58172 2 4 5.58172 4 10C4 12.8358 5.48011 15.334 7.6974 16.7412C8.24357 17.0886 8.57143 17.6835 8.57143 18.3286V18.5C8.57143 18.7761 8.79529 19 9.07143 19H14.9286C15.2047 19 15.4286 18.7761 15.4286 18.5V18.3286C15.4286 17.6835 15.7564 17.0886 16.3026 16.7412C18.5199 15.334 20 12.8358 20 10C20 5.58172 16.4183 2 12 2Z" 
          stroke={colorHex} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        {/* Glowing Filament Core */}
        <path 
          d="M10 10L11 7L13 7L14 10" 
          stroke={colorHex} 
          strokeWidth="1.75" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          opacity="0.85"
        />
        {/* Filament Base Joint */}
        <circle cx="12" cy="13" r="1.2" fill={colorHex} />
      </svg>
    </div>
  );
}

interface PerformanceRatingSchemeProps {
  compact?: boolean;
  interactive?: boolean;
  selectedPoint?: number | null;
  onSelectPoint?: (point: number) => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  title?: string;
  subtitle?: string;
}

export default function PerformanceRatingScheme({
  compact = false,
  interactive = false,
  selectedPoint = null,
  onSelectPoint,
  collapsible = false,
  defaultExpanded = true,
  title = 'Performance Evaluation Rating Scheme (1 – 5 Rating Scale)',
  subtitle = 'Official evaluation benchmarking standard with visual point color codes & performance descriptions'
}: PerformanceRatingSchemeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300">
      
      {/* Header Bar */}
      <div 
        className={`px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between gap-4 ${
          collapsible ? 'cursor-pointer hover:bg-slate-800 select-none' : ''
        }`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10 text-amber-400 border border-white/10 shadow-inner">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight text-white">{title}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                1 to 5 Standards
              </span>
            </div>
            {subtitle && (
              <p className="text-[11px] text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {collapsible && (
          <button 
            type="button" 
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Main Rating Cards Grid with 3D Vibe */}
      {isExpanded && (
        <div className="p-5 bg-gradient-to-b from-slate-50/80 to-slate-100/40">
          
          {/* 5-Pillar 3D Visual Cards matching 2nd Attached Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {KPI_RATING_SCHEME.map((item) => {
              const isSelected = selectedPoint === item.point;

              return (
                <div
                  key={item.point}
                  onClick={() => interactive && onSelectPoint && onSelectPoint(item.point)}
                  onMouseEnter={() => setHoveredPoint(item.point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className={`group relative flex flex-col justify-between bg-white rounded-3xl transition-all duration-300 overflow-hidden ${
                    interactive ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'ring-4 ring-offset-2 ring-slate-800 scale-[1.03] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.25)]'
                      : 'hover:-translate-y-2 hover:shadow-[0_20px_35px_-8px_rgba(0,0,0,0.14)] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.07),0_8px_10px_-6px_rgba(0,0,0,0.04)] border border-slate-200/90'
                  }`}
                  style={{
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  {/* Top 3D Curved Banner with Bevel & Embossed Disc */}
                  <div 
                    className="pt-4 pb-3.5 px-3 text-center text-white relative overflow-hidden"
                    style={{ 
                      background: item.gradient,
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.45), 0 3px 6px rgba(0,0,0,0.12)'
                    }}
                  >
                    {/* Top glossy edge reflection */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

                    <span 
                      className="text-[13px] font-black uppercase tracking-wider block opacity-95"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                    >
                      POINT
                    </span>
                    
                    {/* 3D Tactile Disc with Point Number */}
                    <div className="mt-1.5 flex items-center justify-center">
                      <div 
                        className="w-13 h-13 rounded-full flex items-center justify-center text-2xl font-black text-white relative transition-transform duration-300 group-hover:scale-105"
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.16)',
                          border: '2.5px solid rgba(255,255,255,0.7)',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.22), inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(255,255,255,0.3)',
                          textShadow: '0 2px 4px rgba(0,0,0,0.35)'
                        }}
                      >
                        {item.point}
                      </div>
                    </div>
                  </div>

                  {/* Card Middle: Rating Title & Merged Description */}
                  <div className="p-4 flex-1 flex flex-col justify-between items-center text-center space-y-3.5">
                    
                    <div className="space-y-1.5">
                      {/* Rating Label */}
                      <h4 
                        className="text-base font-black tracking-tight"
                        style={{ color: item.colorHex }}
                      >
                        {item.label}
                      </h4>

                      {/* Description */}
                      <p className="text-[11.5px] text-slate-600 font-medium leading-relaxed px-1 min-h-[44px] flex items-center justify-center">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom: 3D Illuminated Lightbulb Icon */}
                    <div className="pt-1 flex flex-col items-center justify-center w-full space-y-2.5">
                      <Realistic3DLightbulb 
                        colorHex={item.colorHex}
                        glowColor={item.glowColor}
                        lightBgHex={item.lightBgHex}
                        borderColorHex={item.borderColorHex}
                      />

                      {/* 3D Score Range Tag */}
                      <div 
                        className="text-[11px] font-extrabold px-3 py-1 rounded-full transition-all shadow-2xs"
                        style={{
                          backgroundColor: item.lightBgHex,
                          color: item.colorHex,
                          border: `1.5px solid ${item.borderColorHex}`,
                          boxShadow: `0 2px 5px -1px ${item.glowColor}, inset 0 1px 1px rgba(255,255,255,0.9)`
                        }}
                      >
                        Score: {item.benchmarkRange}
                      </div>
                    </div>

                  </div>

                  {/* Bottom Active Glow Stripe */}
                  {isSelected && (
                    <div 
                      className="h-2 w-full animate-pulse"
                      style={{ background: item.gradient }}
                    />
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}

