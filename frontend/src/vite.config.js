import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@contracts': path.resolve(__dirname, './src/contracts'),
        },
    },
    server: {
        port: 5173,
        open: true,
        // Proxy pour l'API backend si nécessaire
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'mui-vendor': ['@mui/material', '@mui/icons-material'],
                    'ethers-vendor': ['ethers'],
                },
            },
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', '@mui/material', 'ethers'],
    },
})