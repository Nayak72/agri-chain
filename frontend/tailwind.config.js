/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        forest: {
          DEFAULT: '#244634',
          dark: '#1b3527',
          light: '#2e5942',
          subtle: '#24463412',
          muted: '#24463422',
        },
        ivory: {
          DEFAULT: '#F6F4EC',
          dark: '#ECE8DB',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F0EDE2',
          subtle: '#F7F5EE',
        },
        border: {
          DEFAULT: '#E5E3D9',
          soft: '#E5E3D9',
          subtle: '#ECEAE1',
        },
        terracotta: {
          DEFAULT: '#C88765',
          light: '#D99E80',
          dark: '#B06F4E',
        },
        harvest: {
          DEFAULT: '#D8BC8D',
          light: '#E6D2B0',
          dark: '#C4A470',
        },
        sage: {
          DEFAULT: '#91A68C',
          light: '#A7BBA3',
          dark: '#7A9176',
        },
        slate: {
          industrial: '#46565D',
        },
        ink: {
          primary: '#26312A',
          secondary: '#70786F',
          tertiary: '#98A197',
        },
        canvas: '#030712',
        panel: '#0b1121',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-left': {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'ping-slow': {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'fade-in-down': 'fade-in-down 0.6s ease-out forwards',
        'fade-in-left': 'fade-in-left 0.8s ease-out forwards',
        'shake': 'shake 0.3s ease-in-out',
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
}

