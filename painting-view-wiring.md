# painting-view.html — How to wire it into map.html

## What it does
A single page that displays any painting full-screen, driven by URL parameters.
No separate page per painting — one template serves everything.

## Files to add to your repo
- `painting-view.html` → root of repo (same level as index.html, map.html etc.)

---

## How the URL works

painting-view.html?img=images/alps-sauze-church.jpg&title=Church+Square&location=Sauze+d%27Oulx&meta=Oil+on+canvas+·+80×30cm&price=£2%2C300

Parameters:
- `img`      — path to image file (required)
- `title`    — painting title
- `location` — location name (shown under pin icon)
- `meta`     — size / medium line
- `price`    — price if you want to show it (omit to hide)
- `desc`     — optional short description paragraph
- `back`     — optional explicit back URL (defaults to browser history)

---

## Wiring into map.html

In your map.html, find where you build the info window / popup HTML 
when a pin is clicked. It will look something like this:

```javascript
const content = `
  <div class="info-window">
    <img src="${painting.image}" ...>
    <div>${painting.title}</div>
  </div>
`;
```

Make the thumbnail image a link. Replace the img tag with:

```javascript
// Build the painting-view URL
function paintingViewUrl(p) {
  const params = new URLSearchParams({
    img:      p.image,
    title:    p.title,
    location: p.location || '',
    meta:     p.meta || '',
    price:    p.price || '',
    desc:     p.description || '',
    back:     'map.html'
  });
  return 'painting-view.html?' + params.toString();
}
```

Then in your info window template:
```javascript
const url = paintingViewUrl(painting);
const content = `
  <div class="info-window">
    <a href="${url}">
      <img src="${painting.image}" style="cursor:pointer;" ...>
    </a>
    <div>${painting.title}</div>
    <a href="${url}" style="font-size:0.72rem; ...">View full size →</a>
  </div>
`;
```

---

## If you share map.html here I'll make the exact edit for you.
The above is everything needed — but if you paste map.html into 
this chat I can do the precise find-and-replace so you don't have 
to dig through the JS yourself.

---

## Back button behaviour
- If the visitor came from map.html, the back button returns them there
- If they arrived directly (e.g. you WhatsApp someone a direct link), 
  it falls back to browser history, which is fine
- The `back=map.html` param in the URL ensures it always says 
  "Back to map" on the button
