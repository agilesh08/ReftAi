/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6A89A7',
          light: '#BDDDFC',
          dark: '#4A6B8A',
        },
        secondary: {
          DEFAULT: '#88BDF2',
        },
        darkNeutral: '#384959',
        surface: {
          DEFAULT: '#FFFFFF',
          variant: '#F1F5F9',
        },
        appBg: '#F6F9FC',
        appBorder: {
          DEFAULT: '#E2E8F0',
          subtle: '#EDF2F7',
        },
        textSecondary: '#64748B',
        textMuted: '#94A3B8',
        assessment: {
          consistent: '#059669',
          consistentBg: '#ECFDF5',
          reviewRequired: '#D97706',
          reviewRequiredBg: '#FFFBEB',
          inconsistent: '#DC2626',
          inconsistentBg: '#FEF2F2',
        },
        decision: {
          approved: '#047857',
          approvedBg: '#ECFDF5',
          rejected: '#B91C1C',
          rejectedBg: '#FEF2F2',
          manualReview: '#0369A1',
          manualReviewBg: '#F0F9FF',
        },
        status: {
          held: '#E65100',
          heldBg: '#FFF3E0',
          created: '#64748B',
          inProgress: '#0284C7',
          analyzed: '#7C3AED',
          completed: '#059669',
          expired: '#64748B',
          cancelled: '#DC2626',
        }
      },
      fontFamily: {
        sans: ['Roboto', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        floating: '0 10px 25px -5px rgba(56, 73, 89, 0.1), 0 8px 10px -6px rgba(56, 73, 89, 0.05)',
      }
    },
  },
  plugins: [],
}
