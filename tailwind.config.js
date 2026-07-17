/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',  // ohmybead 蓝色强调
          rgb: '59, 130, 246',
          light: '#dbeafe',
          lighter: '#eff6ff',
          dark: '#2563eb',
        },
        surface: {
          DEFAULT: '#ffffff',
          container: '#f1f5f9',
          'container-low': '#f8fafc',
          'container-high': '#e2e8f0',
          'container-highest': '#cbd5e1',
        },
        ui: {
          'bg-base': 'var(--ui-bg-base)',
          'bg-surface': 'var(--ui-bg-surface)',
          'bg-tertiary': 'var(--ui-bg-tertiary)',
          border: 'var(--ui-border)',
          'text-primary': 'var(--ui-text-primary)',
          'text-secondary': 'var(--ui-text-secondary)',
          'text-tertiary': 'var(--ui-text-tertiary)',
          accent: 'var(--ui-accent)',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"PingFang SC"', '"Microsoft YaHei"', '"Helvetica Neue"', 'Helvetica', 'Arial', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'bounce-in': 'bounce-in 0.3s cubic-bezier(.175,.885,.32,1.275)',
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s cubic-bezier(.16,1,.3,1)',
        'shake': 'shake 0.4s cubic-bezier(.36,.07,.19,.97)',
      },
      keyframes: {
        'bounce-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(59,130,246,0.15)' },
          '50%': { boxShadow: '0 0 24px rgba(59,130,246,0.35)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
}
