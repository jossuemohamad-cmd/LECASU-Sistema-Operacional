with open('tailwind.config.js', 'w', encoding='utf-8') as f:
    f.write('''export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
''')

with open('postcss.config.js', 'w', encoding='utf-8') as f:
    f.write('''export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
''')

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write('''@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  background-color: #f8fafc;
  color: #0f172a;
}
''')

print("Arquivos corrigidos com sucesso!")