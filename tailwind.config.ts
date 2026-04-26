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
          green: '#292524',
          'green-light': '#44403b',
          cream: '#EDD5C8',
          'cream-light': '#F8EDE6',
          'off-white': '#EDE5DC',
          sage: '#A86848',
          muted: '#79716b',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
