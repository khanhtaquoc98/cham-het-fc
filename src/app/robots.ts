import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin-111/', '/api/'],
      },
    ],
    sitemap: 'https://chamhetfc.vercel.app/sitemap.xml',
  };
}
