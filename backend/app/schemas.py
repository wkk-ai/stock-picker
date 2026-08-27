from typing import Any, Optional

from pydantic import BaseModel, Field


class QuoteOut(BaseModel):
    price: Optional[float] = None
    change_percent: Optional[float] = None
    market_cap: Optional[float] = None
    volume: Optional[float] = None
    fetched_at: Optional[str] = None


class IndicatorOut(BaseModel):
    pe: Optional[float] = None
    pb: Optional[float] = None
    ev_ebitda: Optional[float] = None
    dividend_yield: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    roic: Optional[float] = None
    net_margin: Optional[float] = None
    ebitda_margin: Optional[float] = None
    debt_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None
    source: Optional[str] = None


class ScoreOut(BaseModel):
    quality: float
    value: float
    moat: float
    macro_fit: float
    composite: float
    band: str
    rationale: str


class MoatOut(BaseModel):
    scale: int
    regulation: int
    brand: int
    cost_advantage: int
    switching_costs: int
    network: int
    summary: str


class MoatUpdate(BaseModel):
    scale: Optional[int] = Field(None, ge=1, le=10)
    regulation: Optional[int] = Field(None, ge=1, le=10)
    brand: Optional[int] = Field(None, ge=1, le=10)
    cost_advantage: Optional[int] = Field(None, ge=1, le=10)
    switching_costs: Optional[int] = Field(None, ge=1, le=10)
    network: Optional[int] = Field(None, ge=1, le=10)
    summary: Optional[str] = None


class StockListItem(BaseModel):
    ticker: str
    name: str
    sector: str
    price: Optional[float] = None
    change_percent: Optional[float] = None
    pe: Optional[float] = None
    roe: Optional[float] = None
    composite: Optional[float] = None
    band: Optional[str] = None


class StockDetail(BaseModel):
    ticker: str
    name: str
    sector: str
    quote: Optional[QuoteOut] = None
    indicators: Optional[IndicatorOut] = None
    score: Optional[ScoreOut] = None
    moat: Optional[MoatOut] = None
    fair_value: dict[str, Any] = {}
    statements: list[dict[str, Any]] = []
    news: list[dict[str, Any]] = []
    peers: list[StockListItem] = []
    thesis: Optional[dict[str, Any]] = None
    checklist: list[dict[str, Any]] = []


class MacroOut(BaseModel):
    code: str
    name: str
    date: Optional[str]
    value: Optional[float]


class WatchIn(BaseModel):
    ticker: str
    note: str = ""


class PortfolioIn(BaseModel):
    ticker: str
    quantity: float
    avg_price: float
    note: str = ""


class AlertIn(BaseModel):
    kind: str
    ticker: Optional[str] = None
    rule: str
    threshold: Optional[float] = None


class ThesisIn(BaseModel):
    bull: str = ""
    base: str = ""
    bear: str = ""
    checklist: dict[str, bool] = {}


class ScreenerQuery(BaseModel):
    sector: Optional[str] = None
    max_pe: Optional[float] = None
    min_roe: Optional[float] = None
    min_score: Optional[float] = None
    preset: Optional[str] = None
