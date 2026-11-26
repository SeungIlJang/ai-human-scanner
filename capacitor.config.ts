import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.moduseries.humanscanner',
  appName: '모두의 인성측정',
  webDir: 'dist',
  backgroundColor: '#0a0f1c',
  server: {
    androidScheme: 'https',
  },
}

export default config
