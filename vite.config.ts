import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { netlifyFunctionsDev } from './vite-plugins/netlifyFunctionsDev';

export default defineConfig(({ mode }) => ({
    plugins: [react(), netlifyFunctionsDev(loadEnv(mode, process.cwd(), ''))],
}));
