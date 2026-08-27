"""News via public RSS feeds, matched to tickers by keyword."""
from __future__ import annotations

from datetime import datetime

import feedparser
from sqlalchemy.orm import Session

from app.db import NewsItem, Stock

FEEDS = [
    ("InfoMoney", "https://www.infomoney.com.br/feed/"),
    ("Valor RSS", "https://www.valor.com.br/rss"),
]


def ingest_news(db: Session, limit_per_feed: int = 20) -> dict:
    stocks = db.query(Stock).all()
    added = 0
    for source, url in FEEDS:
        try:
            feed = feedparser.parse(url)
        except Exception:
            continue
        for entry in feed.entries[:limit_per_feed]:
            title = getattr(entry, "title", "") or ""
            link = getattr(entry, "link", "") or ""
            summary = getattr(entry, "summary", "") or ""
            published = getattr(entry, "published", None) or datetime.utcnow().isoformat()
            text = f"{title} {summary}".upper()
            matched = None
            for s in stocks:
                if s.ticker.upper() in text or (s.name.split()[0].upper() in text and len(s.name.split()[0]) > 3):
                    matched = s
                    break
            exists = db.query(NewsItem).filter(NewsItem.title == title[:500]).one_or_none()
            if exists:
                continue
            db.add(
                NewsItem(
                    stock_id=matched.id if matched else None,
                    title=title[:500],
                    url=link[:1000],
                    source=source,
                    published_at=str(published)[:60],
                    summary=summary[:1000],
                )
            )
            added += 1
    db.commit()
    return {"added": added}
