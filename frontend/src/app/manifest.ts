import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CivicImpact - Community Platform',
    short_name: 'CivicImpact',
    description: 'Social platform for citizens, NGOs, and volunteers to create positive community impact.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F9FA',
    theme_color: '#2C3E50',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icons/icon-72x72.svg', sizes: '72x72', type: 'image/svg+xml' },
      { src: '/icons/icon-96x96.svg', sizes: '96x96', type: 'image/svg+xml' },
      { src: '/icons/icon-128x128.svg', sizes: '128x128', type: 'image/svg+xml' },
      { src: '/icons/icon-144x144.svg', sizes: '144x144', type: 'image/svg+xml' },
      { src: '/icons/icon-152x152.svg', sizes: '152x152', type: 'image/svg+xml' },
      { src: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-384x384.svg', sizes: '384x384', type: 'image/svg+xml' },
      { src: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}