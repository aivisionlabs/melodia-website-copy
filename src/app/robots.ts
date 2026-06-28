import { MetadataRoute } from 'next'

const DISALLOWED_PATHS = [
  '/api/',
  '/admin-login',
  '/song-admin-portal/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-forgot-password-otp',
  '/profile/',
  '/payment',
  '/create-song-request',
  '/generate-lyrics',
  '/song-options',
  '/request-capture-success',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: ['GPTBot', 'ChatGPT-User'],
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: ['PerplexityBot'],
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: ['ClaudeBot', 'Claude-Web'],
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: ['Applebot-Extended'],
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: ['cohere-ai', 'Bytespider'],
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: 'https://www.melodia-songs.com/sitemap.xml',
  }
}