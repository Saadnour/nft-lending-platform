/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    important: '#root',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#e5f9ff',
                    100: '#b8efff',
                    200: '#8ae5ff',
                    300: '#5cdbff',
                    400: '#2ed1ff',
                    500: '#00d4ff',
                    600: '#00a9cc',
                    700: '#007e99',
                    800: '#005466',
                    900: '#002933',
                },
                secondary: {
                    50: '#ffe5ff',
                    100: '#ffb8ff',
                    200: '#ff8aff',
                    300: '#ff5cff',
                    400: '#ff2eff',
                    500: '#ff00ff',
                    600: '#cc00cc',
                    700: '#990099',
                    800: '#660066',
                    900: '#330033',
                },
                dark: {
                    900: '#0a0e27',
                    800: '#141b38',
                    700: '#1e2749',
                    600: '#28335a',
                    500: '#323f6b',
                },
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui'],
                mono: ['Fira Code', 'ui-monospace', 'monospace'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 2s infinite',
                'spin-slow': 'spin 3s linear infinite',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
        },
    },
    plugins: [],
    // Compatible avec Material-UI
    corePlugins: {
        preflight: false,
    },
}