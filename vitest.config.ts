
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        environment: 'jsdom',
        alias: {
            '@': path.resolve(__dirname, './src')
        },
        // Optional: setupFiles: ['./vitest.setup.ts'] or similar if needed for mocks
    },
})
