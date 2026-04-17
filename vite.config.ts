import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // O nome exato do seu repositório entre barras
  base: '/PESQUISA-DE-CORTES-LASER_SERRA/', 
  plugins: [react()],
});
