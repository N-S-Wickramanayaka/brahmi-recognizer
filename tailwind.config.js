/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#ffffff',
        linen: '#f4ede0',
        sand: {
          DEFAULT: '#e7dbc4',
          deep: '#d6c5a4',
        },
        rule: '#d9c9aa',
        ink: {
          DEFAULT: '#2a2019',
          soft: '#5b4e42',
        },
        muted: '#6f6254',
        bronze: {
          DEFAULT: '#8a6a36',
          light: '#c2a574',
        },
        verdigris: '#4f6f5e',
        oxblood: '#8e3b2e',
      },
      fontFamily: {
        display: ['Cinzel', '"Trajan Pro"', 'Georgia', 'serif'],
        serif: ['"EB Garamond"', 'Garamond', 'Georgia', 'serif'],
        sans: ['"EB Garamond"', 'Garamond', 'Georgia', 'serif'],
        brahmi: ['"Noto Sans Brahmi"', 'sans-serif'],
        sinhala: ['"Noto Serif Sinhala"', '"Iskoola Pota"', '"Sinhala Sangam MN"', 'serif'],
      },
    },
  },
  plugins: [],
}
