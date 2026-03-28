# Artist on the Hill — Developer Handoff
## For: Mark Bell, Bell Wade Technology
## From: Tony Parsons
## Site: artistonthehill.co.uk

---

## What you're receiving

A complete static HTML website in a zip file containing:

```
index.html          — main site (single page, all sections)
map.html            — full-screen interactive painting map
process.html        — commission process / Instagram video page
llms.txt            — AI crawler briefing document
images/             — all image assets
  itchenor.jpg
  buoy.jpg
  richmond.jpg
  undercliff.jpg
  delawarr.jpg
  saltdeanandpeacehaven.jpg
  porchester.jpg
  hengistbury.jpg
  reflection.jpg
  palma.jpg
  jersey-orgueil.jpg
  charleston-gates.jpg
  rory-portrait.jpg
  tony.avif
```

No framework. No build process. No CMS. Pure HTML/CSS/JS. Drop the folder on any web server and it works.

---

## External dependencies (CDN — all load from public URLs)

- **Google Fonts** — Cormorant Garamond + Karla (loaded in `<head>`)
- **Leaflet.js 1.9.4** — map rendering (map.html only, from cdnjs.cloudflare.com)
- **CartoDB dark tiles** — map background tiles (map.html, no API key needed)
- **Instagram embed.js** — process.html video embeds (loads from Instagram CDN)
- **Google Analytics 4** — placeholder in index.html, needs real Measurement ID

---

## Things that need activating (placeholders in the code)

### 1. Google Analytics
In `index.html`, find:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX">
```
Replace both instances of `G-XXXXXXXXXX` with Tony's real GA4 Measurement ID.
Tony gets this from: analytics.google.com → create account → create property → get Measurement ID.

### 2. Mailchimp popup
In `index.html`, find:
```html
<form action="https://YOUR-MAILCHIMP-FORM-ACTION-URL"
```
Replace with Tony's Mailchimp embedded form action URL.
Also replace `b_REPLACE_WITH_MAILCHIMP_HIDDEN` with the real honeypot field name from the Mailchimp embed code.
Tony gets this from: Mailchimp → Audience → Signup forms → Embedded forms → copy form action URL.

### 3. Private viewing room codes
In `index.html`, find:
```js
if (['SALTMARSH','COLLECTOR','PRIVATE'].includes(code))
```
Update the codes array as needed. Currently just shows an alert — needs wiring to an actual private page when ready.

---

## The map (map.html) — how to add paintings

All painting data lives in a JavaScript array at the bottom of `map.html`. Each entry looks like:

```js
{
  title: "Painting Title",
  meta: "80×30cm · Oil on board",
  price: "£2,300",
  lat: 50.800576,      // GPS latitude — exact spot painted
  lng: -0.044967,      // GPS longitude
  region: "uk",        // "uk" or "world" — controls which view it appears in
  img: "images/filename.jpg",   // local file OR full Wix CDN URL
  category: "marine"  // "marine" or "landscape" — for filter buttons
}
```

To add a new painting: append an entry to the array. That's it.

Currently 52 paintings are mapped. Around 400 more are in Tony's Wix catalogue — we'll be feeding these in batches as Tony makes decisions on them.

**Image URLs from Wix** — paintings not yet photographed locally use Wix CDN URLs in the format:
```
https://static.wixstatic.com/media/[HASH]~mv2.jpg/v1/fill/w_400,h_300,al_c,q_80,enc_avif,quality_auto/[HASH]~mv2.jpg
```
These are publicly accessible and don't require authentication. They can stay as-is until Tony supplies proper photography.

---

## The "Fresh from the Field" section — how Tony adds new paintings

In `index.html`, find the `fieldPaintings` array near the bottom of the script:

```js
const fieldPaintings = [
  // Add entries here
];
```

Tony (or you) adds an entry like:
```js
{ 
  title: "Stormy Beachy Head", 
  meta: "80×30cm · Painted today", 
  price: "£2,300", 
  img: "images/beachy-head.jpg"
},
```

The section automatically appears at the top of the works grid when there's at least one entry, and hides itself when empty.

**Longer term:** Tony would love a simple phone-based upload form so he can add paintings from the field without touching code. The form would need to:
1. Accept: photo, title, size, price, GPS coordinates (from phone)
2. Upload image to server storage
3. Append entry to a JSON file that index.html reads
4. This is a small backend job — a Cloudflare Worker or similar would be ideal given the TOAT server infrastructure.

---

## Hosting notes

- Pure static files — works on any host (Cloudflare Pages, Netlify, S3+CloudFront, nginx, Apache)
- No server-side processing required for current functionality
- `llms.txt` should be accessible at `artistonthehill.co.uk/llms.txt`
- All pages should be served over HTTPS for Instagram embeds and WhatsApp links to work correctly
- Instagram embeds (process.html) **require a live domain** — they won't render when opening the file locally

---

## SEO / Schema already implemented

`index.html` contains:
- Full meta tags (title, description, keywords)
- Open Graph tags (Facebook, WhatsApp, LinkedIn previews)
- Twitter/X card tags
- Schema.org JSON-LD: Person (artist), ItemList (artworks), ProfessionalService
- Canonical URL tag (currently set to artistonthehill.co.uk — update if domain changes)
- `llms.txt` for AI crawler briefing

---

## Nav structure

| Page | File | Notes |
|------|------|-------|
| Main site | index.html | All sections on one page |
| Map | map.html | Full-screen, linked from nav |
| Process / Videos | process.html | Commission process + Instagram reels |

The main nav in index.html links to map.html and process.html as separate pages. All three pages link back to each other.

---

## WhatsApp number

All WhatsApp CTAs use: `+447880601709`
If this changes, find/replace `447880601709` across all three HTML files.

---

## Questions?

Tony: artistonthehill@gmail.com / 07880 601709
Claude conversation: all build decisions documented in Tony's Claude chat history.
