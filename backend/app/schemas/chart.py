"""图表 Schema（§8.8）。"""

from typing import Any

from app.schemas.common import CamelModel


class TrendPoint(CamelModel):
    date: str
    value: int = 0


class CategoryDistribution(CamelModel):
    category: str
    name: str = ""
    count: int
    percent: float


class FunnelStage(CamelModel):
    stage: str
    label: str
    count: int
    percent: float


class ChartHeatmapCell(CamelModel):
    """7×24 热力图格子。"""

    day: int
    hour: int
    value: int


class WordCountTrend(CamelModel):
    daily: list[TrendPoint] = []
    cumulative: list[TrendPoint] = []


class BasicChartData(CamelModel):
    type: str
    data: list[Any] = []
