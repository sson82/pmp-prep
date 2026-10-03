import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 단일 HTML로 빌드: claude.ai 아티팩트나 정적 호스팅 어디에든 파일 하나로 배포
export default defineConfig({
  plugins: [react(), viteSingleFile()],
})
