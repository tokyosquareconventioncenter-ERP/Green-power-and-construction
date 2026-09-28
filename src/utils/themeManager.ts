export interface ThemePreset {
  id: string;
  nameBn: string;
  nameEn: string;
  copper: string;
  amber: string;
  badge: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'green_power',
    nameBn: '🌿 গ্রীন পাওয়ার (লোগোর রঙ: সবুজ ও গোল্ড)',
    nameEn: '🌿 Green Power (Logo: Emerald & Gold)',
    copper: '#059669',
    amber: '#10b981',
    badge: 'bg-emerald-600',
  },
  {
    id: 'gold_copper',
    nameBn: '⚡ ক্লাসিক কপার ও গোল্ডেন অ্যাম্বার',
    nameEn: '⚡ Classic Copper & Amber',
    copper: '#c8793f',
    amber: '#e0a52c',
    badge: 'bg-amber-600',
  },
  {
    id: 'electric_blue',
    nameBn: '🔵 ইলেকট্রিক ব্লু ও সিয়ান',
    nameEn: '🔵 Electric Blue & Cyan',
    copper: '#2563eb',
    amber: '#06b6d4',
    badge: 'bg-blue-600',
  },
  {
    id: 'construction_orange',
    nameBn: '🏗️ কনস্ট্রাকশন অরেঞ্জ ও ইয়েলো',
    nameEn: '🏗️ Construction Industrial Orange',
    copper: '#ea580c',
    amber: '#f59e0b',
    badge: 'bg-orange-600',
  },
];

export function applyThemeColors(copper: string, amber: string) {
  const root = document.documentElement;
  root.style.setProperty('--copper', copper);
  root.style.setProperty('--copper-hover', copper);
  root.style.setProperty('--amber', amber);
  root.style.setProperty('--amber-hover', amber);

  localStorage.setItem('custom_theme_colors', JSON.stringify({ copper, amber }));
}

export function initThemeColors(): { copper: string; amber: string } {
  const stored = localStorage.getItem('custom_theme_colors');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.copper && parsed.amber) {
        applyThemeColors(parsed.copper, parsed.amber);
        return parsed;
      }
    } catch {
      // Fallback
    }
  }

  // Default to Green Power logo color
  const defaultColors = { copper: '#059669', amber: '#10b981' };
  applyThemeColors(defaultColors.copper, defaultColors.amber);
  return defaultColors;
}
