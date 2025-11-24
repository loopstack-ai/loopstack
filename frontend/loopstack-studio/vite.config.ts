import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';

export default defineConfig(({ mode }) => {
  const isLibrary = mode === 'lib';

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']]
        }
      }),
      tailwindcss(),
      ...(isLibrary
        ? [
            dts({
              insertTypesEntry: true,
              include: ['src']
            })
          ]
        : [])
    ],
    optimizeDeps: {
      include: ['@loopstack/shared', '@loopstack/api-client']
    },
    build: isLibrary
      ? {
          lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            formats: ['es']
          },
          rollupOptions: {
            external: [
              'react',
              'react-dom',
              'react/jsx-runtime',
              'react/compiler-runtime',
              '@loopstack/api-client',
              '@loopstack/shared',
              /^@radix-ui\/.*/,
              /^@tanstack\/.*/,
              /^react-/,
              /^lucide-react/,
              'axios',
              'lodash',
              'zod',
              'sonner',
              'date-fns',
              'clsx',
              'tailwind-merge',
              'class-variance-authority',
            ],
            output: {
              format: 'es',
              preserveModules: true,
              preserveModulesRoot: 'src',
              entryFileNames: '[name].js'
            }
          }
        }
      : {
          outDir: 'dist',
          rollupOptions: {
            input: {
              main: path.resolve(__dirname, 'index.html')
            },
          }
        },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  };
});
