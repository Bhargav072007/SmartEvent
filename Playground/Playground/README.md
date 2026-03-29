# SmartVenue PSU MVP

A polished single-page hackathon demo for a Penn State / Beaver Stadium-inspired crowd flow app.

## What it includes

- Sign-up first-run flow
- Ticket scan step with demo passes
- Penn State-themed live event dashboard
- Fastest gate, queue density, ADA route protection, and camera zone summaries
- Operator mode with before/after simulation metrics and intervention cards

## Run locally

### Quick open

Open `/Users/abhiram/Documents/Playground/index.html` in any browser.

On macOS from Terminal:

```bash
cd /Users/abhiram/Documents/Playground
open index.html
```

### Local server

If you want to run it like an app in the browser with a local URL:

```bash
cd /Users/abhiram/Documents/Playground
python3 serve.py
```

Then open:

```text
http://localhost:8000
```

## Demo flow

1. Create an account.
2. Choose a demo ticket or use `PSU-BVR-WE07-1842`.
3. Open the event view.
4. Switch to Operator view to cycle through pregame, halftime, and postgame scenarios.
