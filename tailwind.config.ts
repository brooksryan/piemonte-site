import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1a1a',
        paper: '#fafaf7',
        surface: '#ffffff',
        border: '#e5e5dc',
        muted: '#6b6b66',
        accent: '#8c2f1f',
        'accent-2': '#3a5a40',
        langhe: '#b08a3e',
        liguria: '#2f6b8a',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config
