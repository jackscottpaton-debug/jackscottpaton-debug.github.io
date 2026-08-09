# Jack Paton portfolio — editable v3

Open `editor.html` on the live GitHub Pages site.

## Images
- The editor automatically shows thumbnails for images already in the repository's `assets` folder.
- Click a thumbnail to add it; if a media item is selected, clicking a thumbnail replaces it.
- `+ Add image from Mac` lets you choose a local image. Large still photos are resized to max 2400 px and converted to WebP at web quality. GIFs are kept as GIFs.
- After choosing a local file, click `Download web copy`, then upload that downloaded file into the GitHub `assets` folder.

## Publish layout changes
Click `Download layout.js` in the editor and replace the repository's existing `layout.js` with the downloaded file. Upload any newly prepared images to `assets` at the same time.

The editor cannot directly write files into GitHub because GitHub Pages is a static site and no account token is stored in the editor.


## v4: one-page navigation
The homepage editor can now make any text object act as a menu button that scrolls to another object on the same homepage. Select the button text, then choose a target under **Scroll to position on this homepage**. The target follows the object even if you later drag that object elsewhere. External links and mailto links still work when no scroll target is selected.

The homepage/editor now also request a fresh `layout.js` on reload to reduce stale-layout browser caching.
