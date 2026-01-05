/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                background: '#FFFFFF',
                surface: '#F4F4F5',
                primary: '#D14D72',
                text: '#09090B',
                muted: '#71717A',
            },
        },
    },
    plugins: [],
}