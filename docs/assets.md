# Artwork, typography and sound

- `assets/images/logo.svg`, `logo-light.svg`, `botanical-sprig.svg` and `favicon.svg` are custom vectors. The small icons and apple-touch image are rasterized from the favicon. The palette is ivory, peach, dusty rose, crimson, burgundy, champagne and white.
- `keepsake-paper.webp`, `wax-heart.webp` and `velvet-night.webp` are generated artwork made for this site, prepared as local WebP files. The heart’s transparent silhouette is animated separately from the paper. The bow, heart burst and flowering tree are drawn in SVG or Canvas, not embedded video.
- `social-preview.png` is the 1200 × 630 website card; `github-social-preview.png` is a dedicated 1280 × 640 repository card. To re-render both cards and the icons after a brand edit, run `npm ci`, `npx playwright install chromium`, then `npm run assets:brand`.
- Playfair Display, Great Vibes and Inter are served from `assets/fonts/`. The bundled font licenses are in the adjacent `OFL-*.txt` files.
- `assets/audio/background.mp3` is **A Year That Blooms**, an original 54.9-second synthesized piano and string score. No commercial recordings or samples are used. To regenerate it, install Python with NumPy and FFmpeg with `libmp3lame`, then run `python scripts/make-score.py`. Set `FFMPEG` if the binary is not on PATH. The small release, impact and bloom cues are synthesized in the browser.
