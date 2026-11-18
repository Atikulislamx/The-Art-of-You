# Make the keepsake yours

Edit `js/config.js`. Text is inserted as plain text, not HTML. The animations and layout do not need editing for the usual changes.

| Setting | What to change |
| --- | --- |
| `recipient`, `birthdayDate` | Leave blank for an anonymous keepsake. The optional date uses `YYYY-MM-DD`; it is displayed on the Wish chapter, without a timezone shift. |
| `birthdayTitle`, `wishSubtitle` | The birthday heading is shared by the Wish and Bloom chapters. |
| `letter` | Edit the greeting, paragraphs, closing, and signature. Each string in `paragraphs` is one paragraph. |
| `secret`, `finale` | The hidden wish and closing lines. |
| `timing` | Milliseconds for the transition, impact, Wish typography and the tree. The Bloom text is timed to the tree’s growth. |
| `animation` | Change the seed for a different arrangement of blossoms, cap pixel density, or set particle counts. Reduced motion always takes precedence. |
| `theme` | Change the global brand colors. The photography and some illustrated tints are fixed; use `css/site.css` to tune art-specific shades. Maintain sufficient contrast. |
| `audio`, `features` | Switch audio off entirely, start it only from the Sound button, turn off chimes, hide Share, or disable ambient particles. Volume is `0` to `1`. |

The `{name}` token inserts the recipient’s name into any configurable text. When `recipient` is blank the token becomes `you`. Use `./assets/audio/background.mp3` for the supplied score, replace that file with music you have permission to use, or change `audio.source` to another local file. Audio isn’t needed to complete the story.

With public GitHub Pages, even the hidden wish is public: anyone can read `js/config.js` or see prior Git commits. Don’t publish private details or rely on the wax seal as access control. Test your letter on a narrow phone before sharing, especially if you make it longer.
