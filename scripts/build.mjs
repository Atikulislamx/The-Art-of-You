import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultSiteUrl, root, siteFiles } from './site-files.mjs';

const base = new URL(process.env.PUBLIC_SITE_URL || defaultSiteUrl);
if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || /[&<>"']/u.test(base.href)) {
  throw new Error('PUBLIC_SITE_URL must be a clean public HTTPS URL.');
}
if (!base.pathname.endsWith('/')) base.pathname += '/';
const destination = join(root, 'dist');
await rm(destination, { recursive: true, force: true });
await mkdir(destination);
await Promise.all(siteFiles.map(file => cp(join(root, file), join(destination, file), { recursive: true })));
const html = await readFile(join(destination, 'index.html'), 'utf8');
await writeFile(join(destination, 'index.html'), html.replaceAll(defaultSiteUrl, base.href));
console.log(`Built dist/ for ${base.href}`);
