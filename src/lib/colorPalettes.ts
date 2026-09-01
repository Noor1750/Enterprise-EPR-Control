export interface ColorPalette {
  id: string;
  name: string;
  primaryName: string;
  primaryHex: string;
  secondaryName: string;
  secondaryHex: string;
  category: string;
  description: string;
  // Pre-calculated styling helper classes or inline style definitions
  gradientFrom: string;
  gradientTo: string;
  accentTextColor: string;
  darkTextColor: string;
  bgLightTint: string;
  bgPageWash: string;
  borderAccent: string;
  pillBg: string;
  pillText: string;
  glowShadow: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'ink-teal-warm-sand',
    name: 'Ink Teal & Warm Sand',
    primaryName: 'Ink Teal',
    primaryHex: '#053D3A',
    secondaryName: 'Warm Sand',
    secondaryHex: '#FFE2B8',
    category: 'Operations & Executive',
    description: 'Deep oceanic ink teal contrasted with soothing warm sand tones',
    gradientFrom: '#053D3A',
    gradientTo: '#0A5A55',
    accentTextColor: '#FFE2B8',
    darkTextColor: '#053D3A',
    bgLightTint: 'rgba(255, 226, 184, 0.28)',
    bgPageWash: 'linear-gradient(145deg, #F8FAFC 0%, rgba(255, 226, 184, 0.35) 45%, #F1F5F9 100%)',
    borderAccent: '#053D3A',
    pillBg: '#FFE2B8',
    pillText: '#053D3A',
    glowShadow: '0 10px 25px -5px rgba(5, 61, 58, 0.22)'
  },
  {
    id: 'dark-olive-fresh-lemon',
    name: 'Dark Olive & Fresh Lemon',
    primaryName: 'Dark Olive',
    primaryHex: '#283113',
    secondaryName: 'Fresh Lemon',
    secondaryHex: '#F3FF74',
    category: 'Daily Tasks & Action Center',
    description: 'Rich dark olive with ultra-high-contrast energetic fresh lemon highlights',
    gradientFrom: '#283113',
    gradientTo: '#3C491D',
    accentTextColor: '#F3FF74',
    darkTextColor: '#283113',
    bgLightTint: 'rgba(243, 255, 116, 0.22)',
    bgPageWash: 'linear-gradient(145deg, #F8FAFC 0%, rgba(243, 255, 116, 0.28) 45%, #F4F7F2 100%)',
    borderAccent: '#283113',
    pillBg: '#F3FF74',
    pillText: '#283113',
    glowShadow: '0 10px 25px -5px rgba(40, 49, 19, 0.25)'
  },
  {
    id: 'slate-ocean-cloud-mint',
    name: 'Slate Ocean & Cloud Mint',
    primaryName: 'Slate Ocean',
    primaryHex: '#2F4858',
    secondaryName: 'Cloud Mint',
    secondaryHex: '#DDFBEF',
    category: 'Machines & Maintenance',
    description: 'Refined industrial slate ocean blue paired with crisp, clean cloud mint',
    gradientFrom: '#2F4858',
    gradientTo: '#3D5E73',
    accentTextColor: '#DDFBEF',
    darkTextColor: '#2F4858',
    bgLightTint: 'rgba(221, 251, 239, 0.45)',
    bgPageWash: 'linear-gradient(145deg, #F8FAFC 0%, rgba(221, 251, 239, 0.55) 45%, #F1F6F8 100%)',
    borderAccent: '#2F4858',
    pillBg: '#DDFBEF',
    pillText: '#2F4858',
    glowShadow: '0 10px 25px -5px rgba(47, 72, 88, 0.22)'
  },
  {
    id: 'nordic-indigo-vanilla-mist',
    name: 'Nordic Indigo & Vanilla Mist',
    primaryName: 'Nordic Indigo',
    primaryHex: '#263BAA',
    secondaryName: 'Vanilla Mist',
    secondaryHex: '#FFF4D6',
    category: 'Workforce & Human Resources',
    description: 'Corporate royal nordic indigo blended with warm, elegant vanilla mist',
    gradientFrom: '#263BAA',
    gradientTo: '#354EC9',
    accentTextColor: '#FFF4D6',
    darkTextColor: '#263BAA',
    bgLightTint: 'rgba(255, 244, 214, 0.45)',
    bgPageWash: 'linear-gradient(145deg, #F8FAFC 0%, rgba(255, 244, 214, 0.55) 45%, #F2F5FD 100%)',
    borderAccent: '#263BAA',
    pillBg: '#FFF4D6',
    pillText: '#263BAA',
    glowShadow: '0 10px 25px -5px rgba(38, 59, 170, 0.22)'
  },
  {
    id: 'chrome-black-digital-lilac',
    name: 'Chrome Black & Digital Lilac',
    primaryName: 'Chrome Black',
    primaryHex: '#0D0D0D',
    secondaryName: 'Digital Lilac',
    secondaryHex: '#D9B8FF',
    category: 'KPIs, Reports & Security',
    description: 'Ultra-modern chrome black elevated by luminous futuristic digital lilac',
    gradientFrom: '#0D0D0D',
    gradientTo: '#252525',
    accentTextColor: '#D9B8FF',
    darkTextColor: '#0D0D0D',
    bgLightTint: 'rgba(217, 184, 255, 0.32)',
    bgPageWash: 'linear-gradient(145deg, #F8FAFC 0%, rgba(217, 184, 255, 0.40) 45%, #F5F3F9 100%)',
    borderAccent: '#0D0D0D',
    pillBg: '#D9B8FF',
    pillText: '#0D0D0D',
    glowShadow: '0 10px 25px -5px rgba(13, 13, 13, 0.35)'
  },
  {
    id: 'royal-iris-mint-frost',
    name: 'Royal Iris & Mint Frost',
    primaryName: 'Royal Iris',
    primaryHex: '#4C1D95',
    secondaryName: 'Mint Frost',
    secondaryHex: '#B7F7D4',
    category: '5S Visual & Best Practices',
    description: 'Majestic royal iris violet paired with refreshing frosty mint illumination',
    gradientFrom: '#4C1D95',
    gradientTo: '#6024B8',
    accentTextColor: '#B7F7D4',
    darkTextColor: '#4C1D95',
    bgLightTint: 'rgba(183, 247, 212, 0.35)',
    bgPageWash: 'linear-gradient(145deg, #F8FAFC 0%, rgba(183, 247, 212, 0.45) 45%, #F8F5FE 100%)',
    borderAccent: '#4C1D95',
    pillBg: '#B7F7D4',
    pillText: '#4C1D95',
    glowShadow: '0 10px 25px -5px rgba(76, 29, 149, 0.24)'
  }
];

// Mapping of Navigator Module IDs to specific palette pairings
export const NAVIGATOR_PALETTE_MAP: Record<string, string> = {
  // 1. Ink Teal & Warm Sand
  'dashboard': 'ink-teal-warm-sand',

  // 2. Dark Olive & Fresh Lemon
  'tasks': 'dark-olive-fresh-lemon',

  // 3. Slate Ocean & Cloud Mint
  'machine': 'slate-ocean-cloud-mint',
  'breakdown': 'slate-ocean-cloud-mint',
  'skill-dashboard': 'slate-ocean-cloud-mint',
  'skill': 'slate-ocean-cloud-mint',

  // 4. Nordic Indigo & Vanilla Mist
  'directory': 'nordic-indigo-vanilla-mist',
  'leave': 'nordic-indigo-vanilla-mist',
  'overtime': 'nordic-indigo-vanilla-mist',
  'shifts': 'nordic-indigo-vanilla-mist',

  // 5. Chrome Black & Digital Lilac
  'kpi': 'chrome-black-digital-lilac',
  'reports': 'chrome-black-digital-lilac',
  'settings': 'chrome-black-digital-lilac',

  // 6. Royal Iris & Mint Frost
  '5s-management': 'royal-iris-mint-frost',
  'practices': 'royal-iris-mint-frost'
};

const THEME_STORAGE_KEY = 'erp_color_theme_preference';

export function getActiveThemePreference(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'navigator-adaptive';
  } catch {
    return 'navigator-adaptive';
  }
}

export function setActiveThemePreference(themeId: string) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    window.dispatchEvent(new CustomEvent('erp-theme-changed', { detail: { themeId } }));
  } catch {
    // Ignore storage issues
  }
}

/**
 * Returns the resolved palette for the current active module / navigator
 */
export function resolvePaletteForModule(moduleId: string, themeOverride?: string): ColorPalette {
  const activePref = themeOverride || getActiveThemePreference();
  
  if (activePref !== 'navigator-adaptive') {
    const found = COLOR_PALETTES.find(p => p.id === activePref);
    if (found) return found;
  }

  const mappedPaletteId = NAVIGATOR_PALETTE_MAP[moduleId] || 'ink-teal-warm-sand';
  return COLOR_PALETTES.find(p => p.id === mappedPaletteId) || COLOR_PALETTES[0];
}

/**
 * Dynamically applies CSS custom variables to document root for seamless page-wide theme coordination
 */
export function applyPaletteToDocument(palette: ColorPalette) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--erp-primary', palette.primaryHex);
  root.style.setProperty('--erp-secondary', palette.secondaryHex);
  root.style.setProperty('--erp-grad-from', palette.gradientFrom);
  root.style.setProperty('--erp-grad-to', palette.gradientTo);
  root.style.setProperty('--erp-pill-bg', palette.pillBg);
  root.style.setProperty('--erp-pill-text', palette.pillText);
  root.style.setProperty('--erp-bg-tint', palette.bgLightTint);
  root.style.setProperty('--erp-border', palette.borderAccent);
  root.style.setProperty('--erp-glow', palette.glowShadow);
}
