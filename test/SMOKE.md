# Zapwebp Manual Smoke Test Checklist

> **Purpose**: Pre-release human verification checklist for the two primary developer surfaces: the Web Application and the VS Code Extension. Must be executed and verified before every production release.
> **Estimated Execution Time**: ~15 minutes.

---

## 1. Web Application (`https://zapwebp.vercel.app` or `http://localhost:3000`)

| Step | Action | Expected Result | Pass / Fail |
|---|---|---|---|
| **W01** | Open `https://zapwebp.vercel.app` in Chrome / Firefox | Landing page loads with instant dropzone, clear branding, and zero console errors | [ ] |
| **W02** | Drag `test/fixtures/svg/tabler-home.svg` onto the dropzone | In-place card appears in < 2 seconds showing converted WebP preview | [ ] |
| **W03** | Click the single **Download** button on the result card | Downloads a valid `.webp` file matching source dimensions | [ ] |
| **W04** | Inspect downloaded file or view in browser | WebP renders with crisp transparent background (no black discoloration) | [ ] |
| **W05** | Drag 20 SVG icons at once into the dropzone | Queue processes concurrently with live progress updates | [ ] |
| **W06** | Verify all 20 result cards | All 20 items complete successfully with individual saved bytes reported | [ ] |
| **W07** | Click **Download All (.zip)** | Downloads in-memory `zapwebp-<timestamp>.zip` containing all converted images | [ ] |
| **W08** | Open the downloaded `.zip` archive | All files inside are uncorrupted `.webp` images matching original basenames | [ ] |
| **W09** | Click delete icon on a single card | Card is removed and aggregate saved byte counter decrements | [ ] |
| **W10** | Click **Clear All** and confirm prompt | Queue resets to clean initial dropzone state | [ ] |
| **W11** | Reload the page | Session restores previous state if configured, or starts cleanly | [ ] |
| **W12** | Toggle theme (Dark / Light) | Colors transition smoothly; checkerboard pattern remains visible | [ ] |
| **W13** | Reload page after theme toggle | Selected theme mode persists from `localStorage` | [ ] |
| **W14** | Open Settings panel | Adjust quality slider to `50` and close settings | [ ] |
| **W15** | Convert `test/fixtures/jpg/unsplash-thumb.jpg` | Output file size is significantly smaller than at default 85 quality | [ ] |
| **W16** | Select target format **AVIF** | Converted outputs emit `.avif` binaries with `image/avif` MIME type | [ ] |
| **W17** | Drag `test/fixtures/ico/high-res.ico` container | Container extracts highest-resolution entry (`256×256`) into WebP | [ ] |
| **W18** | Drop malicious `test/fixtures/edge-cases/script-injection.svg` | Immediately rejected with visible `E_UNSAFE_SVG` error toast; conversion blocked | [ ] |
| **W19** | Drop `test/fixtures/edge-cases/empty.svg` (0 bytes) | Immediately rejected with `E_EMPTY_FILE` error toast | [ ] |

---

## 2. VS Code Extension (`zapwebp`)

| Step | Action | Expected Result | Pass / Fail |
|---|---|---|---|
| **V01** | Package and install `.vsix` (`pnpm build:vscode && code --install-extension ...`) | Extension activates cleanly with Zapwebp status bar indicator | [ ] |
| **V02** | Open a project containing images in VS Code Explorer | Image files show Zapwebp context actions on right-click | [ ] |
| **V03** | Right-click `test/fixtures/svg/tabler-home.svg` → **Zap to WebP** | Output `tabler-home.webp` is written adjacent to the SVG; success toast displayed | [ ] |
| **V04** | Verify adjacent `.webp` file on disk | File size > 0 and binary WebP container verified | [ ] |
| **V05** | Select 5 SVG icons in Explorer → Right-click → **Zap to WebP** | All 5 files convert in parallel with batch progress notifications | [ ] |
| **V06** | Verify all 5 `.webp` files | Files written without filename collisions or original source deletion | [ ] |
| **V07** | Hover over `tabler-home.svg` in editor | Rich hover preview modal displays with image dimensions and checkerboard | [ ] |
| **V08** | Right-click a folder containing mixed images → **Zap Folder** | Interactive Webview Panel opens showing format breakdown and target selectors | [ ] |
| **V09** | Open VS Code Settings → Search `zapwebp.convertOnSave` → Enable | Setting enables without restarting editor | [ ] |
| **V10** | Edit an SVG in editor and press `Ctrl+S` (`Cmd+S`) | WebP output updates automatically within 1 second | [ ] |
| **V11** | Right-click `test/fixtures/edge-cases/script-injection.svg` → **Zap to WebP** | Error toast displays `E_UNSAFE_SVG: SVG contains unsafe active content`; no file written | [ ] |
| **V12** | Change `zapwebp.quality` to `50` in settings | Subsequent conversions produce smaller file size than quality `90` | [ ] |
| **V13** | Right-click PNG image | QuickPick dynamically excludes PNG target and vector multiplier options | [ ] |
| **V14** | Verify non-destructive guarantee | Source images are never modified, overwritten, or deleted unless `--delete-original` is explicitly confirmed | [ ] |

---

## 3. Sign-off

- **Release Version**: `v`____________
- **Tester Name**: ___________________
- **Date**: _________________________
- **Platform**: [ ] Windows 11  [ ] macOS Sonoma  [ ] Ubuntu 24.04
- **Browsers Tested**: [ ] Chrome  [ ] Firefox  [ ] Safari / Edge
- **Status**: [ ] APPROVED FOR RELEASE  [ ] BLOCKED
