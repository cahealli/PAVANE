/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pavane: {
          bg: "#0d0d0f",
          surface: "#141416",
          border: "#1e1e22",
          muted: "#2a2a30",
          accent: "#6366f1",
          "accent-hover": "#4f51d8",
          text: "#e4e4eb",
          "text-muted": "#6b6b7a",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
          info: "#3b82f6",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
