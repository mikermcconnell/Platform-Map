# Platform Map LG TV - Session Summary (Dec 12, 2025)

## Current Status: ALMOST WORKING 🟡

The app runs on the LG TV (Phase 3 reached), but **map image not visible** yet. Latest fix (remove flexbox) was just pushed.

---

## LG TV Browser Info
```
UA: Mozilla/5.0 (Linux; Netcast; U) AppleWebKit/537.36 (KHTML, like Gecko)
Platform: LG Netcast (older than webOS)
Resolution: 1920x1080
```

---

## Architecture (Rewritten from React)

| Component | Before | After |
|-----------|--------|-------|
| Frontend | React + Vite | Vanilla JS (ES5) |
| Bundle Size | ~140KB | 6.2KB |
| Build | Vite | esbuild + Babel (Chrome 38) |
| Styling | Tailwind | Plain CSS |
| Protobuf | Client-side | Server-side (Vercel API) |
| API | `/api/gtfs` (binary) | `/api/vehicles` (JSON) |

---

## Key Files Created/Modified

### Server API
- `api/vehicles.js` - Vercel serverless function (JS, not TS)
  - Uses `node-fetch` (required for Vercel)
  - Decodes Protobuf → returns JSON
  - No Accept header (caused 406 error)

### Frontend
- `frontend/src/platform-map/main.js` - Vanilla JS app
  - NO `'use strict'` (caused parse error on Netcast)
  - NO arrow functions, const/let
  - Uses `.then()` not async/await
  - Affine transformation for GPS→screen coords

- `frontend/src/platform-map/styles.css` - Plain CSS
  - NO `display: flex` (not supported on old WebKit) ← JUST FIXED
  - Uses `position: relative` like working reference

- `frontend/src/platform-map/index.html` - Debug-enabled template
  - Early debug panel at top
  - Phased logging (BOOT → PHASE 2 → PHASE 3)

### Build
- `scripts/build-frontend.js` - esbuild + Babel
- `scripts/js-transform.js` - Babel targeting Chrome 38
- `vercel.json` - Uses `framework: null`, `outputDirectory: "frontend/dist"`

---

## Issues Fixed This Session

| Issue | Cause | Fix |
|-------|-------|-----|
| Build failed | TS runtime version format | Removed explicit runtime config |
| 502 API error | Missing node-fetch | Added to dependencies |
| 406 API error | `Accept: application/x-protobuf` header | Removed header |
| White screen (Phase 2 stuck) | `'use strict'` directive | Removed from main.js |
| Map not visible | `display: flex` in CSS | Removed flexbox ← JUST PUSHED |

---

## Vercel Deployment

**URL**: `https://platform-map.vercel.app/platform.map`

**Build command**: `npm run build:frontend`
**Output**: `frontend/dist/`

---

## Next Steps

1. **Test on TV** - Refresh after Vercel deploys (~60 sec)
2. **If map still not visible** - Check if `object-fit: contain` is supported
3. **If buses not showing** - Check debug panel for fetch errors
4. **Remove debug panels** once working

---

## Working Reference

The `Bus Tracker Map/` subdirectory has the working implementation to compare against:
- `Bus Tracker Map/frontend/src/platform-map/main.js`
- `Bus Tracker Map/frontend/src/platform-map/styles.css`
- `Bus Tracker Map/api/index.js`

---

## Debug Commands

Check transpiled JS for ES6:
```powershell
Select-String -Path "frontend\dist\assets\platformMap.*.js" -Pattern "=>" -AllMatches
Select-String -Path "frontend\dist\assets\platformMap.*.js" -Pattern "\bconst\b|\blet\b" -AllMatches
```

Build and deploy:
```powershell
npm run build:frontend && git add -A && git commit -m "message" && git push
```
