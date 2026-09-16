import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    
    server: {
      port: 5173,
      strictPort: false,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        }
      }
    },
    
    build: {
      minify: 'terser',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // ✅ ELIMINÉ 'react-router-dom' de manualChunks
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge'],
            'utils-vendor': ['axios', 'react-hot-toast']
          },
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]'
        }
      },
      assetsDir: 'assets',
      cssCodeSplit: true,
      emptyOutDir: true
    },
    
    // ✅ optimizeDeps solo con lo básico
    optimizeDeps: {
      include: ['react', 'react-dom']
    },
    
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    }
  };
});