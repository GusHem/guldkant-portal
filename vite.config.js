import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // **KRITISKT FÖR GITHUB PAGES:**
  // Sätt denna till namnet på ert repository.
  // Detta säkerställer att alla fil-länkar är korrekta.
  base: '/guldkant-portal/', 
})
