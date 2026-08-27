# Penpot UX — Stock Picker BR

## Setup

1. Open [design.penpot.app](https://design.penpot.app) (cloud preferred).
2. New file: `Stock Picker BR`.
3. Import color + text styles from [`tokens.json`](./tokens.json).
4. Frames at **1440×900**: Dashboard, Stock Detail, Screener, Portfolio, Alerts.

Self-host only if needed — use Penpot **≥ 2.17.0** (fixes 2026 auth/RCE issues).

## Layout rules

- Soft `#F7F6F3` canvas, white elevated panels, **32px** page padding, **40px** section gaps.
- Left nav 240px: logo mark + 5 links. No badge clutter.
- Cards only for interactive modules (filters, tables, score blocks).
- One accent green `#0F6E56` for positive / high scores; muted ink for body.

## Wireframe HTML

Open [`wireframes/index.html`](./wireframes/index.html) in a browser for clickable reference screens that match Penpot tokens. Use these as the visual contract while building the Next.js app.
