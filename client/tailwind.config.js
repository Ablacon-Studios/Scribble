/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        scribble: {
          bg: '#1a1a2e',
          surface: '#16213e',
          border: '#0f3460',
          primary: '#6c63ff',
          'primary-dark': '#3f3d9e',
          muted: '#8892b0',
        },
      },
    },
  },
  plugins: [],
};
