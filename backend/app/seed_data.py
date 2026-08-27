SEED_STOCKS = [
    {"ticker": "PETR4", "name": "Petrobras PN", "sector": "Oil & Gas", "cvm_code": "9512"},
    {"ticker": "VALE3", "name": "Vale ON", "sector": "Mining", "cvm_code": "4170"},
    {"ticker": "ITUB4", "name": "Itaú Unibanco PN", "sector": "Banks", "cvm_code": "19348"},
    {"ticker": "BBAS3", "name": "Banco do Brasil ON", "sector": "Banks", "cvm_code": "1023"},
    {"ticker": "WEGE3", "name": "WEG ON", "sector": "Industrials", "cvm_code": "5410"},
    {"ticker": "ABEV3", "name": "Ambev ON", "sector": "Consumer", "cvm_code": "23264"},
    {"ticker": "BBDC4", "name": "Bradesco PN", "sector": "Banks", "cvm_code": "906"},
    {"ticker": "B3SA3", "name": "B3 ON", "sector": "Financial Services", "cvm_code": "22633"},
    {"ticker": "RENT3", "name": "Localiza ON", "sector": "Consumer", "cvm_code": "19720"},
    {"ticker": "MGLU3", "name": "Magazine Luiza ON", "sector": "Retail", "cvm_code": "22470"},
    {"ticker": "SUZB3", "name": "Suzano ON", "sector": "Paper & Pulp", "cvm_code": "13986"},
    {"ticker": "PRIO3", "name": "Prio ON", "sector": "Oil & Gas", "cvm_code": "22187"},
]

# Fallback fundamentals when CVM/brapi unavailable (order-of-magnitude realistic)
SEED_INDICATORS = {
    "PETR4": {"pe": 6.2, "pb": 1.1, "ev_ebitda": 3.4, "dividend_yield": 0.12, "roe": 0.28, "roa": 0.12, "roic": 0.18, "net_margin": 0.22, "ebitda_margin": 0.40, "debt_equity": 0.7, "current_ratio": 1.2, "revenue_growth": 0.05, "earnings_growth": 0.08},
    "VALE3": {"pe": 7.5, "pb": 1.4, "ev_ebitda": 4.1, "dividend_yield": 0.08, "roe": 0.22, "roa": 0.10, "roic": 0.15, "net_margin": 0.18, "ebitda_margin": 0.35, "debt_equity": 0.5, "current_ratio": 1.5, "revenue_growth": -0.02, "earnings_growth": -0.05},
    "ITUB4": {"pe": 8.5, "pb": 1.6, "ev_ebitda": None, "dividend_yield": 0.06, "roe": 0.20, "roa": 0.015, "roic": None, "net_margin": 0.28, "ebitda_margin": None, "debt_equity": None, "current_ratio": None, "revenue_growth": 0.10, "earnings_growth": 0.12},
    "BBAS3": {"pe": 5.1, "pb": 0.9, "ev_ebitda": None, "dividend_yield": 0.08, "roe": 0.18, "roa": 0.012, "roic": None, "net_margin": 0.22, "ebitda_margin": None, "debt_equity": None, "current_ratio": None, "revenue_growth": 0.08, "earnings_growth": 0.09},
    "WEGE3": {"pe": 28.0, "pb": 8.5, "ev_ebitda": 20.0, "dividend_yield": 0.015, "roe": 0.32, "roa": 0.18, "roic": 0.25, "net_margin": 0.16, "ebitda_margin": 0.20, "debt_equity": 0.2, "current_ratio": 2.0, "revenue_growth": 0.14, "earnings_growth": 0.16},
    "ABEV3": {"pe": 14.0, "pb": 2.4, "ev_ebitda": 9.0, "dividend_yield": 0.05, "roe": 0.18, "roa": 0.10, "roic": 0.16, "net_margin": 0.18, "ebitda_margin": 0.30, "debt_equity": 0.1, "current_ratio": 1.1, "revenue_growth": 0.04, "earnings_growth": 0.03},
    "BBDC4": {"pe": 7.8, "pb": 1.1, "ev_ebitda": None, "dividend_yield": 0.07, "roe": 0.14, "roa": 0.01, "roic": None, "net_margin": 0.18, "ebitda_margin": None, "debt_equity": None, "current_ratio": None, "revenue_growth": 0.06, "earnings_growth": 0.05},
    "B3SA3": {"pe": 16.0, "pb": 3.2, "ev_ebitda": 11.0, "dividend_yield": 0.04, "roe": 0.22, "roa": 0.12, "roic": 0.20, "net_margin": 0.45, "ebitda_margin": 0.65, "debt_equity": 0.3, "current_ratio": 1.8, "revenue_growth": 0.07, "earnings_growth": 0.08},
    "RENT3": {"pe": 18.0, "pb": 2.8, "ev_ebitda": 7.5, "dividend_yield": 0.02, "roe": 0.16, "roa": 0.05, "roic": 0.08, "net_margin": 0.10, "ebitda_margin": 0.40, "debt_equity": 1.5, "current_ratio": 1.0, "revenue_growth": 0.12, "earnings_growth": 0.10},
    "MGLU3": {"pe": None, "pb": 1.8, "ev_ebitda": 12.0, "dividend_yield": 0.0, "roe": -0.05, "roa": -0.02, "roic": -0.03, "net_margin": -0.02, "ebitda_margin": 0.04, "debt_equity": 1.2, "current_ratio": 1.3, "revenue_growth": 0.02, "earnings_growth": -0.10},
    "SUZB3": {"pe": 9.0, "pb": 1.5, "ev_ebitda": 5.5, "dividend_yield": 0.03, "roe": 0.15, "roa": 0.06, "roic": 0.09, "net_margin": 0.12, "ebitda_margin": 0.35, "debt_equity": 1.0, "current_ratio": 1.4, "revenue_growth": 0.03, "earnings_growth": 0.04},
    "PRIO3": {"pe": 8.0, "pb": 2.0, "ev_ebitda": 4.0, "dividend_yield": 0.01, "roe": 0.30, "roa": 0.15, "roic": 0.22, "net_margin": 0.35, "ebitda_margin": 0.55, "debt_equity": 0.6, "current_ratio": 1.6, "revenue_growth": 0.20, "earnings_growth": 0.25},
}

MOAT_SEED = {
    "PETR4": {"scale": 9, "regulation": 9, "brand": 6, "cost_advantage": 8, "switching_costs": 5, "network": 3, "summary": "Dominant integrated oil producer with scale and state-linked competitive position in Brazil."},
    "VALE3": {"scale": 9, "regulation": 6, "brand": 5, "cost_advantage": 8, "switching_costs": 4, "network": 2, "summary": "World-class iron ore assets; cost curve advantage, commodity cyclical."},
    "ITUB4": {"scale": 8, "regulation": 8, "brand": 8, "cost_advantage": 7, "switching_costs": 7, "network": 6, "summary": "Large private bank franchise; deposit stickiness and brand."},
    "BBAS3": {"scale": 8, "regulation": 8, "brand": 7, "cost_advantage": 6, "switching_costs": 6, "network": 5, "summary": "Public bank with agribusiness reach and policy role."},
    "WEGE3": {"scale": 7, "regulation": 4, "brand": 8, "cost_advantage": 7, "switching_costs": 6, "network": 4, "summary": "Industrial compounder with global niche leadership in motors/automation."},
    "ABEV3": {"scale": 8, "regulation": 5, "brand": 9, "cost_advantage": 8, "switching_costs": 4, "network": 3, "summary": "Beverage scale and brand portfolio; distribution moat."},
    "BBDC4": {"scale": 8, "regulation": 8, "brand": 7, "cost_advantage": 6, "switching_costs": 7, "network": 5, "summary": "Large retail bank; franchise and switching costs."},
    "B3SA3": {"scale": 9, "regulation": 9, "brand": 7, "cost_advantage": 8, "switching_costs": 8, "network": 9, "summary": "Exchange monopoly-like infrastructure with network effects."},
    "RENT3": {"scale": 7, "regulation": 4, "brand": 7, "cost_advantage": 6, "switching_costs": 4, "network": 3, "summary": "Fleet scale in car rental; competitive industry."},
    "MGLU3": {"scale": 6, "regulation": 3, "brand": 7, "cost_advantage": 4, "switching_costs": 3, "network": 5, "summary": "Retail/e-commerce brand; thin moat, high competition."},
    "SUZB3": {"scale": 8, "regulation": 5, "brand": 4, "cost_advantage": 8, "switching_costs": 3, "network": 2, "summary": "Pulp cost leadership and forestry assets."},
    "PRIO3": {"scale": 5, "regulation": 6, "brand": 4, "cost_advantage": 7, "switching_costs": 3, "network": 2, "summary": "Efficient offshore oil operator; smaller scale than Petrobras."},
}

SECTOR_MACRO_SENSITIVITY = {
    "Banks": {"selic": 0.8, "ipca": 0.2, "fx": 0.1},
    "Oil & Gas": {"selic": -0.2, "ipca": 0.1, "fx": 0.7},
    "Mining": {"selic": -0.1, "ipca": 0.1, "fx": 0.8},
    "Industrials": {"selic": -0.3, "ipca": -0.2, "fx": 0.3},
    "Consumer": {"selic": -0.5, "ipca": -0.4, "fx": 0.2},
    "Retail": {"selic": -0.7, "ipca": -0.5, "fx": 0.2},
    "Financial Services": {"selic": 0.4, "ipca": 0.1, "fx": 0.2},
    "Paper & Pulp": {"selic": -0.2, "ipca": 0.1, "fx": 0.6},
}
