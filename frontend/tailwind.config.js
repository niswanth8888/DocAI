/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: {
            start: '#050505',
            end: '#080808',
            card: '#111111',
            sidebar: '#050505',
            secondary: '#0D0D0D',
            elevated: '#181818',
            border: '#2A2A2A',
          },
          text: {
            primary: '#F5F5F5',
            secondary: '#A3A3A3',
            muted: '#737373',
          },
          accent: {
            cyan: {
              DEFAULT: '#E5E5E5',
              glow: 'rgba(255, 255, 255, 0.02)',
              border: '#333333',
            },
            violet: {
              DEFAULT: '#A3A3A3',
              glow: 'rgba(255, 255, 255, 0.02)',
              border: '#333333',
            }
          }
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
