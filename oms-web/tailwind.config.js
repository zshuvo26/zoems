/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { primary: '#0F1117', secondary: '#1A1D2E', card: '#252A3D', hover: '#2D3347' },
        accent: { blue: '#3D7FFF', 'blue-dark': '#2D6FEF' },
        bull: '#00D09C',
        bear: '#FF6B6B',
        amber: '#FFB547',
        muted: '#8B9CB6',
        border: '#2D3347',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
