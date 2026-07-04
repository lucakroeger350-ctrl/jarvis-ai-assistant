import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: '#ff5722',
        'amber-dim': '#a34423',
        green: '#4dff9a',
        red: '#ff3b30',
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', 'Consolas', 'monospace'],
        orbitron: ['Orbitron', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
