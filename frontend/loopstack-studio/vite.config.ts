import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']]
      }
    }),
    tailwindcss(),
    dts({
      insertTypesEntry: true,
      include: ['src']
    })
  ]
});
