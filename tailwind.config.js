/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ember: "#ff8a3d",
        blood: "#9b1c31",
        bronze: "#b7833b",
        parchment: "#ead9b8",
        "parchment-dark": "#b79a6b",
        obsidian: "#121014",
        "stone-900": "#17181c",
        "stone-800": "#23242a",
      },
      boxShadow: {
        glow: "0 0 24px rgba(255, 138, 61, 0.35)",
        card: "0 16px 50px rgba(0, 0, 0, 0.45)",
      },
      fontFamily: {
        display: ["Cinzel", "Georgia", "serif"],
        body: ["Inter", "Segoe UI", "sans-serif"],
      },
      backgroundImage: {
        "parchment-grain":
          "radial-gradient(circle at 18% 20%, rgba(255,255,255,.23), transparent 20%), radial-gradient(circle at 80% 0%, rgba(126,80,26,.18), transparent 28%), linear-gradient(135deg, #f0dfbd, #c7a86f)",
        "stone-grid":
          "linear-gradient(135deg, rgba(255,255,255,.06), transparent 40%), radial-gradient(circle at 60% 20%, rgba(255,138,61,.08), transparent 30%), linear-gradient(180deg, #15161a, #0d0c10)",
      },
    },
  },
  plugins: [],
};
