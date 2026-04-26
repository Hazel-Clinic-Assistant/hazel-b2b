import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hazel: {
          green: '#2B2624',
          'green-light': '#3D3533',
          cream: '#E7DED3',
          'cream-light': '#F6F3EE',
          'off-white': '#F6F3EE',
          sage: '#A7B8A0',
          muted: '#8B7F73',
          mint: '#D9F1E2',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
