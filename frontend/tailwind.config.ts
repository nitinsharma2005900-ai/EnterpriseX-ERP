import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Strict EnterpriseX Luxury Corporate Theme - Zero Blue!
        emerald: {
          DEFAULT: '#167D58',
          50: '#F0F8F4',
          100: '#DDEFE6',
          200: '#BDDFCED',
          300: '#91CBB0',
          400: '#52AC84',
          500: '#167D58',
          600: '#116546',
          700: '#0E5138',
          800: '#0C412E',
          900: '#0A3626',
        },
        charcoal: {
          DEFAULT: '#182420',
          50: '#2A3C36',
          100: '#23332E',
          200: '#1D2A26',
          300: '#182420',
          400: '#131D1A',
          500: '#0F1614',
          600: '#0B100E',
          700: '#070A09',
        },
        ivory: {
          DEFAULT: '#F7F6F0',
          50: '#FFFFFF',
          100: '#FCFBF8',
          200: '#F7F6F0',
          300: '#ECE9DD',
          400: '#DDD8C4',
        },
        amber: {
          DEFAULT: '#D99A39',
          50: '#FDF7EE',
          100: '#FBEDD5',
          200: '#F6DAA6',
          300: '#EFC16E',
          400: '#E6A743',
          500: '#D99A39',
          600: '#BA7A27',
          700: '#945B20',
        },
        sage: {
          DEFAULT: '#A8C3AE',
          50: '#F4F7F5',
          100: '#E4EDE6',
          200: '#CDDFD2',
          300: '#A8C3AE',
          400: '#87A98F',
          500: '#6A8E73',
          600: '#52725A',
        },
      },
    },
  },
  plugins: [],
};

export default config;
