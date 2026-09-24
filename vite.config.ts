import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: '/my-stuff-ai/',
    plugins: [react()],
});