# Publish-button update v8

Upload `editor.html` and `editor.js` to the root of the GitHub Pages repository, replacing the existing files. Do not replace `layout.js`.

## One-time GitHub setup
Create a fine-grained personal access token in GitHub:
- Resource owner: `jackscottpaton-debug`
- Repository access: **Only select repositories** → `jackscottpaton-debug.github.io`
- Repository permissions → **Contents: Read and write**
- No other write permissions are needed.

Paste the token into the editor's **GitHub token** box. It is kept in `sessionStorage`, so it survives refreshes in that tab but is not written into the website files. Closing the browser tab clears it.

Then **Publish to website** commits the current editor layout directly as `layout.js` on the `main` branch. GitHub Pages deploys from that commit automatically.
