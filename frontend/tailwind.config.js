module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Default theme (Ravenforge) colors
        'ravenforge': {
          'neutral-darkest': '#0a0a0a',
          'neutral-darker': '#1f2937',
          'neutral-dark': '#374151',
          'neutral-mid': '#6b7280',
          'neutral-light': '#d1d5db',
          'neutral-overlay': '#000000',

          'blue-base': '#3b82f6',
          'blue-light': '#60a5fa',
          'blue-dark': '#2563eb',
          'blue-soft': 'rgba(59, 130, 246, 0.1)',
          'blue-border': 'rgba(59, 130, 246, 0.3)',
          'blue-ring': 'rgba(59, 130, 246, 0.5)',

          'purple-base': '#8b5cf6',
          'purple-light': '#a78bfa',

          'emerald-base': '#10b981',
          'emerald-light': '#6ee7b7',
          'emerald-soft': 'rgba(16, 185, 129, 0.1)',
          'emerald-border': 'rgba(16, 185, 129, 0.3)',

          'amber-base': '#f59e0b',
          'amber-light': '#fbbf24',
          'amber-soft': 'rgba(245, 158, 11, 0.1)',
          'amber-border': 'rgba(245, 158, 11, 0.3)',

          'red-base': '#ef4444',
          'red-light': '#f87171',
          'red-soft': 'rgba(239, 68, 68, 0.1)',
          'red-border': 'rgba(239, 68, 68, 0.3)',
        },

        // Emerald theme colors
        'emerald-wave': {
          'neutral-darkest': '#0a0a0a',
          'neutral-darker': '#1f2937',
          'neutral-dark': '#374151',
          'neutral-mid': '#6b7280',
          'neutral-light': '#d1d5db',
          'neutral-overlay': '#000000',

          'emerald-base': '#10b981',
          'emerald-light': '#6ee7b7',
          'emerald-dark': '#059669',
          'emerald-soft': 'rgba(16, 185, 129, 0.1)',
          'emerald-border': 'rgba(16, 185, 129, 0.3)',
          'emerald-ring': 'rgba(16, 185, 129, 0.5)',

          'teal-base': '#14b8a6',
          'teal-light': '#5eead4',

          'cyan-base': '#06b6d4',
          'cyan-light': '#67e8f9',

          'amber-base': '#f59e0b',
          'amber-light': '#fbbf24',
          'amber-soft': 'rgba(245, 158, 11, 0.1)',
          'amber-border': 'rgba(245, 158, 11, 0.3)',

          'red-base': '#ef4444',
          'red-light': '#f87171',
          'red-soft': 'rgba(239, 68, 68, 0.1)',
          'red-border': 'rgba(239, 68, 68, 0.3)',
        },

        // Violet theme colors
        'violet-dreams': {
          'neutral-darkest': '#0a0a0a',
          'neutral-darker': '#1f2937',
          'neutral-dark': '#374151',
          'neutral-mid': '#6b7280',
          'neutral-light': '#d1d5db',
          'neutral-overlay': '#000000',

          'violet-base': '#8b5cf6',
          'violet-light': '#a78bfa',
          'violet-dark': '#7c3aed',
          'violet-soft': 'rgba(139, 92, 246, 0.1)',
          'violet-border': 'rgba(139, 92, 246, 0.3)',
          'violet-ring': 'rgba(139, 92, 246, 0.5)',

          'purple-base': '#a855f7',
          'purple-light': '#c084fc',

          'pink-base': '#ec4899',
          'pink-light': '#f472b6',

          'emerald-base': '#10b981',
          'emerald-light': '#6ee7b7',
          'emerald-soft': 'rgba(16, 185, 129, 0.1)',
          'emerald-border': 'rgba(16, 185, 129, 0.3)',

          'amber-base': '#f59e0b',
          'amber-light': '#fbbf24',
          'amber-soft': 'rgba(245, 158, 11, 0.1)',
          'amber-border': 'rgba(245, 158, 11, 0.3)',

          'red-base': '#ef4444',
          'red-light': '#f87171',
          'red-soft': 'rgba(239, 68, 68, 0.1)',
          'red-border': 'rgba(239, 68, 68, 0.3)',
        },

        // Sunset theme colors
        'sunset-blaze': {
          'neutral-darkest': '#0a0a0a',
          'neutral-darker': '#1f2937',
          'neutral-dark': '#374151',
          'neutral-mid': '#6b7280',
          'neutral-light': '#d1d5db',
          'neutral-overlay': '#000000',

          'orange-base': '#f97316',
          'orange-light': '#fb923c',
          'orange-dark': '#ea580c',
          'orange-soft': 'rgba(249, 115, 22, 0.1)',
          'orange-border': 'rgba(249, 115, 22, 0.3)',
          'orange-ring': 'rgba(249, 115, 22, 0.5)',

          'red-base': '#ef4444',
          'red-light': '#f87171',

          'pink-base': '#ec4899',
          'pink-light': '#f472b6',

          'amber-base': '#f59e0b',
          'amber-light': '#fbbf24',
          'amber-soft': 'rgba(245, 158, 11, 0.1)',
          'amber-border': 'rgba(245, 158, 11, 0.3)',

          'emerald-base': '#10b981',
          'emerald-light': '#6ee7b7',
          'emerald-soft': 'rgba(16, 185, 129, 0.1)',
          'emerald-border': 'rgba(16, 185, 129, 0.3)',
        },

        'rose-passion': {
          // Adding colors for rosePassion
          'neutral-darkest': '#111827', // A very dark neutral, close to black
          'neutral-darker': '#1f2937',  // A slightly lighter dark neutral
          'neutral-dark': '#374151',    // Darker neutral gray, good for background text
          'neutral-mid': '#6b7280',     // Mid gray
          'neutral-light': '#d1d5db',   // Light neutral gray for softer backgrounds
          'neutral-overlay': '#000000',  // Equivalent of bg-black/95

          // Pink shades
          'pink-base': '#f472b6',        // Tailwind's pink-500 (vibrant pink)
          'pink-light': '#f9a8d4',       // Tailwind's pink-400 (lighter pink)
          'pink-soft': 'rgba(244, 114, 182, 0.1)', // Soft transparent pink (pink-500/10)
          'pink-border': 'rgba(244, 114, 182, 0.3)', // Transparent pink with more opacity (pink-500/30)
          'pink-ring': 'rgba(244, 114, 182, 0.5)',   // More opaque pink (pink-500/50)

          // Rose shades
          'rose-base': '#f43f5e',        // Tailwind's rose-500 (rich rose color)
          'rose-light': '#f87171',       // Tailwind's rose-400 (light rose)
          'rose-soft': 'rgba(244, 63, 94, 0.1)',  // Soft transparent rose (rose-500/10)
          'rose-border': 'rgba(244, 63, 94, 0.3)', // Transparent rose with more opacity (rose-500/30)

          // Red shades
          'red-base': '#ef4444',         // Tailwind's red-500 (classic red)
          'red-light': '#f87171',        // Tailwind's red-400 (lighter red)
          'red-soft': 'rgba(239, 68, 68, 0.1)', // Soft transparent red (red-500/10)
          'red-border': 'rgba(239, 68, 68, 0.3)', // Transparent red with more opacity (red-500/30)

          // Emerald shades
          'emerald-base': '#10b981',     // Tailwind's emerald-500 (vibrant emerald)
          'emerald-to': '#059669',       // Tailwind's emerald-600 (darker emerald)
          'emerald-light': '#6ee7b7',    // Tailwind's emerald-400 (lighter emerald)
          'emerald-soft': 'rgba(16, 185, 129, 0.1)', // Soft transparent emerald (emerald-500/10)
          'emerald-border': 'rgba(16, 185, 129, 0.3)', // Transparent emerald with more opacity (emerald-500/30)

          // Amber shades
          'amber-base': '#f59e0b',       // Tailwind's amber-500 (vibrant amber)
          'amber-light': '#fbbf24',      // Tailwind's amber-400 (lighter amber)
          'amber-soft': 'rgba(245, 158, 11, 0.1)', // Soft transparent amber (amber-500/10)
          'amber-border': 'rgba(245, 158, 11, 0.3)', // Transparent amber with more opacity (amber-500/30)

          // Purple shades
          'purple-base': '#8b5cf6',      // Tailwind's purple-500 (vibrant purple)

          // Dark shades of pink for background component
          'pink-darkest': '#1a0e13',  // Nearly black with a warm pink-maroon tint
          'pink-darker': '#2a121c',  // Very dark, just a hint lighter
          'pink-dark': '#3b1a26',  // Deep muted rose
        },
        'indigo-depth': {
          // Neutrals (cooler grays)
          'neutral-darkest': '#0a0a0a',    // Nearly black
          'neutral-darker': '#111111',    // Dark charcoal
          'neutral-dark': '#1b1b2b',    // Blue‑tinted charcoal
          'neutral-mid': '#e0e9f9',    // Steel gray
          'neutral-light': '#e0e9f9',    // Cool gray
          'neutral-lighter': '#c3c3d4',    // Frosted gray

          // Overlay
          'neutral-overlay': '#000000',    // 95% black (unchanged)

          // Indigo Shades (colder, slightly desaturated)
          'indigo-base': '#5e69f0',       // A touch cooler than 6366f1
          'indigo-light': '#7a8afc',       // Ice‑blue indigo
          'indigo-dark': '#4a3fd9',       // Cooler, deeper indigo
          'indigo-soft': 'rgba(94,105,240,0.1)',
          'indigo-border': 'rgba(94,105,240,0.3)',
          'indigo-ring': 'rgba(94,105,240,0.5)',

          'purple-base': '#af00ff',

          // Blue shades (secondary accents)
          'blue-base': '#3b82f6',        // Retained
          'blue-light': '#60a5fa',
          'blue-border': 'rgba(59,130,246,0.3)',
          'blue-soft': 'rgba(59,130,246,0.1)',

          // Cyan & Teal (tertiary accents)
          'cyan-base': '#04a8cc',        // Slightly greener‑blue
          'teal-base': '#12a093',        // Cooler teal
          'cyan-border': 'rgba(4,168,204,0.3)',
          'teal-border': 'rgba(18,160,147,0.3)',

          // Emerald (Success - keep it fresh)
          'emerald-base': '#10b981',
          'emerald-light': '#6ee7b7',
          'emerald-border': 'rgba(16,185,129,0.3)',
          'emerald-soft': 'rgba(16,185,129,0.1)',

          // Amber (Warning - you can shift to cooler yellow if desired)
          'amber-base': '#d4a017',        // Slightly muted amber
          'amber-light': '#e3b637',
          'amber-border': 'rgba(212,160,23,0.3)',
          'amber-soft': 'rgba(212,160,23,0.1)',

          // Red (Error - unchanged to retain clarity)
          'red-base': '#ef4444',
          'red-light': '#f87171',
          'red-border': 'rgba(239,68,68,0.3)',
          'red-soft': 'rgba(239,68,68,0.1)',
        },

        // Transition settings for quick durations
        transitionDuration: {
          fast: '200ms',
          medium: '300ms',
        },
      }
    },
  },
  plugins: [],
}