# Venora static restore

This folder contains a restored static version of the saved Webflow page.

## Files

- `index.html` - cleaned homepage HTML
- `assets/css/spar-wine.css` - recovered Webflow stylesheet
- `assets/css/google-fonts.css` - saved font stylesheet
- `assets/js/` - recovered Webflow runtime scripts
- `assets/img/` - local image and SVG assets
- `assets/video/` - hero background video assets, including `wine-vids.mp4`
- `refferrence/` - original saved files and screenshots

## Run locally

From this directory:

```powershell
python -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173
```

Notes: this is a static restoration. Webflow Commerce checkout, cart backend, and form submissions are not recoverable from browser "Save as" files without the original Webflow project/backend.
