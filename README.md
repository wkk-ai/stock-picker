# Ações Baratas (stock-picker)

Daily ranking of Brazilian (B3) and US (S&P 500) stocks that look cheap on fundamental indicators, with quality checks and value-trap warnings. Educational tool, not investment advice.

## How it works

1. **Every weekday at 19:37 (São Paulo)** a GitHub Action (`.github/workflows/daily.yml`) runs `python -m pipeline.run`:
   - Brazil: all listed stocks from Fundamentus, kept if daily liquidity ≥ R$ 200 thousand.
   - US: S&P 500 members, fundamentals from Yahoo Finance (yfinance).
   - Macro: Selic and IPCA (Banco Central), US 10-year Treasury yield (CBOE ^TNX via Yahoo).
   - **Weekly** (`.github/workflows/history.yml`, `pipeline/history.py`): 12 years of annual statements from CVM (Brazil) and SEC or Yahoo (US), saved to `pipeline/data/fundamentals.json`. Optional secret `SEC_CONTACT_EMAIL` lets the SEC serve 12 years of US data (SEC requires a contact e-mail).
2. `pipeline/score.py` scores each stock: 60% value (multiples ranked against sector peers) + 40% quality, minus penalties for red flags. Rules come from `.claude/skills/financial-expert/SKILL.md`.
3. Results go to `site/data/*.json` and, when the `DATABASE_URL` secret is set, to the Neon Postgres database (project `stock-picker`, tables `stocks`, `snapshots`, `macro`, `runs`) which keeps daily history.
4. The static site in `site/` is published to GitHub Pages.

## Pages in the site

Ranking · Strategies (Graham, Magic Formula, Bazin, pure value) · Sectors · Favorites (saved in the browser) · Methodology · one page per stock with indicators vs sector median, reasons and warnings.

## Run locally

```bash
pip install -r pipeline/requirements.txt
python -m pipeline.run --us-limit 20   # quick test
cd site && python -m http.server 8000
```

## Older app

`backend/` (FastAPI) and `web/` (Next.js) are the earlier Brazil-only version. They are not used by the GitHub Pages site.
