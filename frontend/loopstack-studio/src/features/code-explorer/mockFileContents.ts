/**
 * Mock file contents keyed by file path. Used for the code explorer preview.
 */
export const mockFileContents: Record<string, string> = {
  'src/App.tsx': `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4">
      <h1>Vite + React</h1>
      <button onClick={() => setCount((c) => c + 1)}>
        count is {count}
      </button>
    </div>
  );
}

export default App;
`,
  'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
  'src/index.css': `:root {
  font-family: system-ui, sans-serif;
  line-height: 1.5;
  color: #213547;
  background-color: #ffffff;
}

body {
  margin: 0;
  min-height: 100vh;
}
`,
  'src/App.css': `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
`,
  'src/vite-env.d.ts': `/// <reference types="vite/client" />
`,
  'public/robots.txt': `User-agent: *
Allow: /
`,
  '.gitignore': `# Dependencies
node_modules

# Build
dist

# Local env
.env
.env.local
`,
  'package.json': `{
  "name": "my-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "~5.6.0",
    "vite": "^6.0.0"
  }
}
`,
  'README.md': `# My App

A Vite + React + TypeScript project.

## Development

\`\`\`bash
npm run dev
\`\`\`
`,
  'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler"
  },
  "include": ["src"]
}
`,
};
