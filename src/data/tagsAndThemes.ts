export interface BoardTheme {
  id: string;
  name: string;
  description: string;
  canvasBg: string;
  previewColor: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'indigo-nebula',
    name: 'Indigo Nebula',
    description: 'Deep cosmic space gradient with subtle purple particle glows',
    canvasBg: 'bg-bg-0',
    previewColor: 'bg-indigo-600'
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Cyber Matrix',
    description: 'High-tech dark emerald and teal glow layout',
    canvasBg: 'bg-emerald-950/10',
    previewColor: 'bg-emerald-600'
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Twilight',
    description: 'Warm twilight glow combining dark rose and golden amber',
    canvasBg: 'bg-amber-950/10',
    previewColor: 'bg-amber-600'
  },
  {
    id: 'cyber-neon',
    name: 'Cyberpunk Neon',
    description: 'Electric cyan and magenta high-density workspace theme',
    canvasBg: 'bg-cyan-950/10',
    previewColor: 'bg-cyan-500'
  },
  {
    id: 'obsidian-gold',
    name: 'Obsidian Gold',
    description: 'Executive luxury dark obsidian canvas with warm golden highlights',
    canvasBg: 'bg-stone-950/10',
    previewColor: 'bg-yellow-500'
  },
  {
    id: 'glass-aurora',
    name: 'Glass Aurora',
    description: 'Luminous multi-hue aurora mesh with frosted glass panels',
    canvasBg: 'bg-teal-950/10',
    previewColor: 'bg-teal-500'
  }
];

export interface TagStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const PRESET_TAG_COLORS: Record<string, TagStyle & { name: string; hex: string }> = {
  rose: { name: 'Rose', hex: '#f43f5e', bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  red: { name: 'Crimson', hex: '#ef4444', bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', dot: 'bg-red-400' },
  emerald: { name: 'Emerald', hex: '#10b981', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  teal: { name: 'Teal', hex: '#14b8a6', bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/30', dot: 'bg-teal-400' },
  cyan: { name: 'Cyan', hex: '#06b6d4', bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30', dot: 'bg-cyan-400' },
  blue: { name: 'Blue', hex: '#3b82f6', bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  indigo: { name: 'Indigo', hex: '#6366f1', bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
  purple: { name: 'Purple', hex: '#a855f7', bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  violet: { name: 'Violet', hex: '#8b5cf6', bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  amber: { name: 'Amber', hex: '#f59e0b', bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  orange: { name: 'Orange', hex: '#f97316', bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  yellow: { name: 'Yellow', hex: '#eab308', bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  pink: { name: 'Neon Pink', hex: '#ec4899', bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30', dot: 'bg-pink-400' },
  lime: { name: 'Lime', hex: '#84cc16', bg: 'bg-lime-500/20', text: 'text-lime-300', border: 'border-lime-500/30', dot: 'bg-lime-400' },
  slate: { name: 'Slate', hex: '#64748b', bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30', dot: 'bg-slate-400' }
};

export const TAG_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  bug: PRESET_TAG_COLORS.rose,
  feature: PRESET_TAG_COLORS.emerald,
  security: PRESET_TAG_COLORS.purple,
  urgent: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', dot: 'bg-red-500' },
  ai: PRESET_TAG_COLORS.cyan,
  agent: PRESET_TAG_COLORS.cyan,
  'ui/ux': PRESET_TAG_COLORS.amber,
  frontend: PRESET_TAG_COLORS.indigo,
  backend: PRESET_TAG_COLORS.blue,
  ops: PRESET_TAG_COLORS.slate,
  routine: PRESET_TAG_COLORS.teal,
  planning: PRESET_TAG_COLORS.violet
};

export function getTagStyle(tag: string, customColorOverrides?: Record<string, string>): TagStyle {
  const normalized = tag.toLowerCase().trim();
  
  if (customColorOverrides && customColorOverrides[normalized]) {
    const colorKey = customColorOverrides[normalized];
    if (PRESET_TAG_COLORS[colorKey]) {
      return PRESET_TAG_COLORS[colorKey];
    }
  }

  // Fallback to localStorage saved tag color overrides
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('kb3_custom_tag_colors') : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed[normalized] && PRESET_TAG_COLORS[parsed[normalized]]) {
        return PRESET_TAG_COLORS[parsed[normalized]];
      }
    }
  } catch {
    // ignore storage errors
  }

  if (TAG_COLOR_MAP[normalized]) {
    return TAG_COLOR_MAP[normalized];
  }

  // Consistent fallback based on hash of string
  const presetKeys = Object.keys(PRESET_TAG_COLORS);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const key = presetKeys[Math.abs(hash) % presetKeys.length];
  return PRESET_TAG_COLORS[key] || PRESET_TAG_COLORS.indigo;
}
