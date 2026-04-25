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
          green: '#1C3A2E',
          'green-light': '#2A4A3C',
          cream: '#E8D5B0',
          'cream-light': '#F5ECD8',
          'off-white': '#FAF8F3',
          sage: '#7A9E8E',
          muted: '#4A6358',
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
