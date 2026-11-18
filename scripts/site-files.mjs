import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const siteFiles = [
  'index.html', 'css', 'js', 'assets', 'site.webmanifest', '.nojekyll',
  'favicon.svg', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png',
];
export const defaultSiteUrl = 'https://atikulislamx.github.io/The-Art-of-You/';
