export interface BoardTheme {
  id: string;
  name: string;
  description: string;
  bgGradient: string;
  canvasBg: string;
  listBorder: string;
  accentColor: string;
  previewColor: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'indigo-nebula',
    name: 'Indigo Nebula',
    description: 'Deep cosmic space gradient with subtle purple particle glows',
    bgGradient: 'from-slate-950 via-indigo-950/80 to-slate-900',
    canvasBg: 'bg-gradient-to-br from-slate-950 via-indigo-950/70 to-slate-900',
    listBorder: 'border-indigo-500/20',
    accentColor: 'indigo',
    previewColor: 'bg-indigo-600'
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Cyber Matrix',
    description: 'High-tech dark emerald and teal glow layout',
    bgGradient: 'from-slate-950 via-emerald-950/70 to-slate-900',
    canvasBg: 'bg-gradient-to-br from-slate-950 via-emerald-950/60 to-slate-900',
    listBorder: 'border-emerald-500/20',
    accentColor: 'emerald',
    previewColor: 'bg-emerald-600'
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Twilight',
    description: 'Warm twilight glow combining dark rose and golden amber',
    bgGradient: 'from-slate-950 via-rose-950/70 to-amber-950/60',
    canvasBg: 'bg-gradient-to-br from-slate-950 via-rose-950/60 to-amber-950/50',
    listBorder: 'border-amber-500/20',
    accentColor: 'amber',
    previewColor: 'bg-amber-600'
  },
  {
    id: 'cyber-neon',
    name: 'Cyberpunk Neon',
    description: 'Electric cyan and magenta high-density workspace theme',
    bgGradient: 'from-slate-950 via-cyan-950/80 to-purple-950/70',
    canvasBg: 'bg-gradient-to-br from-slate-950 via-cyan-950/70 to-purple-950/60',
    listBorder: 'border-cyan-500/30',
    accentColor: 'cyan',
    previewColor: 'bg-cyan-500'
  },
  {
    id: 'obsidian-gold',
    name: 'Obsidian Gold',
    description: 'Executive luxury dark obsidian canvas with warm golden highlights',
    bgGradient: 'from-zinc-950 via-stone-900 to-amber-950/40',
    canvasBg: 'bg-gradient-to-br from-zinc-950 via-stone-900 to-amber-950/30',
    listBorder: 'border-amber-400/20',
    accentColor: 'amber',
    previewColor: 'bg-yellow-500'
  },
  {
    id: 'glass-aurora',
    name: 'Glass Aurora',
    description: 'Luminous multi-hue aurora mesh with frosted glass panels',
    bgGradient: 'from-slate-950 via-blue-950/70 to-teal-950/60',
    canvasBg: 'bg-gradient-to-br from-slate-950 via-blue-950/60 to-teal-950/50',
    listBorder: 'border-teal-500/20',
    accentColor: 'teal',
    previewColor: 'bg-teal-500'
  }
];

export const TAG_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  bug: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  feature: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  security: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  urgent: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', dot: 'bg-red-500 animate-ping' },
  ai: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30', dot: 'bg-cyan-400' },
  agent: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30', dot: 'bg-cyan-400' },
  'ui/ux': { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  frontend: { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
  backend: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  ops: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30', dot: 'bg-slate-400' },
  routine: { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/30', dot: 'bg-teal-400' },
  planning: { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/30', dot: 'bg-violet-400' }
};

export function getTagStyle(tag: string) {
  const normalized = tag.toLowerCase().trim();
  if (TAG_COLOR_MAP[normalized]) {
    return TAG_COLOR_MAP[normalized];
  }
  // Default fallback for custom tags
  return {
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-300',
    border: 'border-indigo-500/30',
    dot: 'bg-indigo-400'
  };
}
