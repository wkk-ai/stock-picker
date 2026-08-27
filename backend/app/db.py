from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


class Stock(Base):
    __tablename__ = "stocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticker: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    sector: Mapped[str] = mapped_column(String(128), default="")
    cvm_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    quote: Mapped[Optional["Quote"]] = relationship(back_populates="stock", uselist=False)
    indicators: Mapped[Optional["Indicator"]] = relationship(back_populates="stock", uselist=False)
    score: Mapped[Optional["Score"]] = relationship(back_populates="stock", uselist=False)
    moat: Mapped[Optional["MoatProfile"]] = relationship(back_populates="stock", uselist=False)
    statements: Mapped[list["FinancialStatement"]] = relationship(back_populates="stock")
    news: Mapped[list["NewsItem"]] = relationship(back_populates="stock")


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), unique=True)
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    change_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    market_cap: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    volume: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="BRL")
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    stock: Mapped["Stock"] = relationship(back_populates="quote")


class Indicator(Base):
    __tablename__ = "indicators"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), unique=True)
    pe: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ev_ebitda: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dividend_yield: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    roe: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    roa: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    roic: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    net_margin: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ebitda_margin: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    debt_equity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    revenue_growth: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    earnings_growth: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="seed")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    stock: Mapped["Stock"] = relationship(back_populates="indicators")


class FinancialStatement(Base):
    __tablename__ = "financial_statements"
    __table_args__ = (
        UniqueConstraint("stock_id", "period", "statement_type", "account", name="uq_stmt"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), index=True)
    period: Mapped[str] = mapped_column(String(16))
    statement_type: Mapped[str] = mapped_column(String(16))  # income|balance|cashflow
    account: Mapped[str] = mapped_column(String(128))
    value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="cvm")

    stock: Mapped["Stock"] = relationship(back_populates="statements")


class MacroSeries(Base):
    __tablename__ = "macro_series"
    __table_args__ = (UniqueConstraint("code", "date", name="uq_macro"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), index=True)
    name: Mapped[str] = mapped_column(String(64))
    date: Mapped[str] = mapped_column(String(16))
    value: Mapped[float] = mapped_column(Float)


class Score(Base):
    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), unique=True)
    quality: Mapped[float] = mapped_column(Float, default=50)
    value: Mapped[float] = mapped_column(Float, default=50)
    moat: Mapped[float] = mapped_column(Float, default=50)
    macro_fit: Mapped[float] = mapped_column(Float, default=50)
    composite: Mapped[float] = mapped_column(Float, default=50)
    band: Mapped[str] = mapped_column(String(16), default="Watch")
    rationale: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    stock: Mapped["Stock"] = relationship(back_populates="score")


class MoatProfile(Base):
    __tablename__ = "moat_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), unique=True)
    scale: Mapped[int] = mapped_column(Integer, default=5)
    regulation: Mapped[int] = mapped_column(Integer, default=5)
    brand: Mapped[int] = mapped_column(Integer, default=5)
    cost_advantage: Mapped[int] = mapped_column(Integer, default=5)
    switching_costs: Mapped[int] = mapped_column(Integer, default=5)
    network: Mapped[int] = mapped_column(Integer, default=3)
    summary: Mapped[str] = mapped_column(Text, default="")
    editable: Mapped[bool] = mapped_column(Boolean, default=True)

    stock: Mapped["Stock"] = relationship(back_populates="moat")


class NewsItem(Base):
    __tablename__ = "news_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    stock_id: Mapped[Optional[int]] = mapped_column(ForeignKey("stocks.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(512))
    url: Mapped[str] = mapped_column(String(1024), default="")
    source: Mapped[str] = mapped_column(String(128), default="")
    published_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    summary: Mapped[str] = mapped_column(Text, default="")

    stock: Mapped[Optional["Stock"]] = relationship(back_populates="news")


class WatchlistItem(Base):
    __tablename__ = "watchlist"
    __table_args__ = (UniqueConstraint("ticker", name="uq_watch"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticker: Mapped[str] = mapped_column(String(16), index=True)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PortfolioPosition(Base):
    __tablename__ = "portfolio_positions"
    __table_args__ = (UniqueConstraint("ticker", name="uq_pos"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticker: Mapped[str] = mapped_column(String(16), index=True)
    quantity: Mapped[float] = mapped_column(Float, default=0)
    avg_price: Mapped[float] = mapped_column(Float, default=0)
    note: Mapped[str] = mapped_column(Text, default="")


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(32))  # price|indicator|filing|macro
    ticker: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    rule: Mapped[str] = mapped_column(String(255))
    threshold: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="Armed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ThesisNote(Base):
    __tablename__ = "thesis_notes"
    __table_args__ = (UniqueConstraint("ticker", name="uq_thesis"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticker: Mapped[str] = mapped_column(String(16), index=True)
    bull: Mapped[str] = mapped_column(Text, default="")
    base: Mapped[str] = mapped_column(Text, default="")
    bear: Mapped[str] = mapped_column(Text, default="")
    checklist_json: Mapped[str] = mapped_column(Text, default="{}")


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
