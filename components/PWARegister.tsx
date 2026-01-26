'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa/service-worker';

export default function PWARegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
