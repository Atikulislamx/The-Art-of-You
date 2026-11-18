# Publish The Art of You

## GitHub Pages

1. Put the project changes on the repository’s default branch, `main`, through the project’s usual pull request process.
2. Open **Settings → Pages** and under **Build and deployment** set **Source** to **GitHub Actions**. The integration used to build this project could not enable Pages on the owner’s behalf.
3. Open **Actions → Verify and publish the keepsake → Run workflow**, choose `main`, and run it. Subsequent pushes to `main` deploy automatically. The `github-pages` environment shows the published URL when the publish job succeeds.
4. After the first deployment, open <https://atikulislamx.github.io/The-Art-of-You/> and the [public Open Graph image URL](https://atikulislamx.github.io/The-Art-of-You/assets/images/social-preview.png). Confirm that both load without signing in. Preview crawlers may cache a card from an earlier deployment.

The workflow uploads only the static files in `dist/`. The canonical URL, `og:url`, `og:image`, and `twitter:image` are rewritten at build time to match GitHub Pages’ configured base URL. Fonts, artwork, scripts and audio use project-relative paths, so they also work beneath a repository path. To test that path locally, open `http://localhost:4173/The-Art-of-You/`.

## Repository sharing image (separate from Pages)

Open **Repository → Settings → General → Social preview → Edit → Upload an image**. Upload [`assets/images/github-social-preview.png`](../assets/images/github-social-preview.png) (1280 × 640). GitHub’s supported CLI and REST API do not expose an upload for this setting. The website uses a different image at `assets/images/social-preview.png` (1200 × 630).

## Other static hosting

Run `PUBLIC_SITE_URL=https://example.com/keepsake/ npm run build` with your real URL, and publish `dist/`. Do not build with a local or private URL if you want public link previews. `npm run dev -- --dist` previews the build locally.
