import React, { useState } from 'react';
import { Palette, Check, Sparkles, Sliders, ChevronDown, Layers } from 'lucide-react';
import { 
  COLOR_PALETTES, 
  ColorPalette, 
  getActiveThemePreference, 
  setActiveThemePreference, 
  resolvePaletteForModule 
} from '../../lib/colorPalettes';

interface ThemeSegmentSelectorProps {
  activeModule: string;
  onThemeChange?: (themeId: string) => void;
  variant?: 'compact' | 'full' | 'dropdown';
}

export default function ThemeSegmentSelector({ activeModule, onThemeChange, variant = 'compact' }: ThemeSegmentSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>(getActiveThemePreference());
  const [isOpen, setIsOpen] = useState(false);
  const currentPalette = resolvePaletteForModule(activeModule, selectedTheme);

  const handleSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    setActiveThemePreference(themeId);
    if (onThemeChange) {
      onThemeChange(themeId);
    }
    setIsOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shadow-xs border hover:shadow-md active:scale-95"
          style={{
            backgroundColor: currentPalette.secondaryHex,
            color: currentPalette.primaryHex,
            borderColor: currentPalette.primaryHex
          }}
          title={`Color Segment: ${currentPalette.name}`}
        >
          <div 
            className="w-3 h-3 rounded-full shadow-inner ring-1 ring-black/10 flex items-center justify-center shrink-0" 
            style={{ backgroundColor: currentPalette.primaryHex }}
          />
          <span className="hidden sm:inline font-black tracking-tight">{currentPalette.primaryName}</span>
          <span className="hidden sm:inline opacity-70">/</span>
          <span className="hidden sm:inline font-semibold">{currentPalette.secondaryName}</span>
          <span className="sm:hidden font-black text-[10px]">Theme</span>
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: currentPalette.primaryHex }}
                  >
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">Smart Color Segments</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Curated paired palettes per navigator</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {selectedTheme === 'navigator-adaptive' ? 'Adaptive Mode' : 'Fixed Mode'}
                </span>
              </div>

              {/* Mode Toggle Button */}
              <button
                type="button"
                onClick={() => handleSelect('navigator-adaptive')}
                className={`w-full mb-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all border ${
                  selectedTheme === 'navigator-adaptive'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <div className="text-left">
                    <span className="block text-xs font-bold leading-tight">Auto-Adaptive Navigator Mode</span>
                    <span className="text-[10px] opacity-75 font-normal">Each section uses its signature 2-tone palette</span>
                  </div>
                </div>
                {selectedTheme === 'navigator-adaptive' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>

              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Choose Specific Color Segment
              </div>

              {/* Palette Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto custom-scrollbar p-0.5">
                {COLOR_PALETTES.map((pal) => {
                  const isSelected = selectedTheme === pal.id || (selectedTheme === 'navigator-adaptive' && currentPalette.id === pal.id);
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => handleSelect(pal.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected 
                          ? 'ring-2 shadow-md' 
                          : 'hover:shadow-xs border-slate-200 bg-slate-50/50 hover:bg-white'
                      }`}
                      style={{
                        borderColor: isSelected ? pal.primaryHex : undefined,
                        boxShadow: isSelected ? `0 0 0 2px ${pal.primaryHex}40` : undefined
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-black text-slate-800 leading-tight">
                          {pal.primaryName}
                        </span>
                        {isSelected && (
                          <span 
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] shadow-xs shrink-0"
                            style={{ backgroundColor: pal.primaryHex }}
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      {/* 2-Tone Color Preview Bar */}
                      <div className="flex rounded-lg overflow-hidden h-6 border border-slate-300/60 shadow-inner">
                        <div 
                          className="flex-1 flex items-center justify-center text-[9px] font-bold px-1 truncate"
                          style={{ backgroundColor: pal.primaryHex, color: pal.secondaryHex }}
                        >
                          {pal.primaryHex}
                        </div>
                        <div 
                          className="flex-1 flex items-center justify-center text-[9px] font-bold px-1 truncate"
                          style={{ backgroundColor: pal.secondaryHex, color: pal.primaryHex }}
                        >
                          {pal.secondaryHex}
                        </div>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                        <span>{pal.secondaryName}</span>
                        <span className="opacity-75 text-[8px] truncate max-w-[80px]">{pal.category}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full / expanded inline mode
  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-extrabold text-slate-900">Color Segment System</h3>
        </div>
        <button
          type="button"
          onClick={() => handleSelect('navigator-adaptive')}
          className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
            selectedTheme === 'navigator-adaptive'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
        >
          Auto-Adaptive Segments
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {COLOR_PALETTES.map((pal) => (
          <button
            key={pal.id}
            type="button"
            onClick={() => handleSelect(pal.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedTheme === pal.id ? 'ring-2 shadow-md' : 'border-slate-200 hover:bg-slate-50'
            }`}
            style={{
              borderColor: selectedTheme === pal.id ? pal.primaryHex : undefined
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black text-slate-900">{pal.name}</span>
              {selectedTheme === pal.id && <Check className="w-4 h-4 text-emerald-600" />}
            </div>
            <div className="flex rounded-lg overflow-hidden h-7 border border-slate-300">
              <div 
                className="flex-1 flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: pal.primaryHex, color: pal.secondaryHex }}
              >
                {pal.primaryName} ({pal.primaryHex})
              </div>
              <div 
                className="flex-1 flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: pal.secondaryHex, color: pal.primaryHex }}
              >
                {pal.secondaryName} ({pal.secondaryHex})
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
