"""稿费 Schema（§8.6）。"""

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.enums import ContractType, SettlementStatus


class RoyaltyDetailItem(CamelModel):
    id: str
    month: str
    novel_id: str
    novel_title: str = ""
    author_id: str
    author_name: str = ""
    chapter_count: int
    word_count: int
    contract_type: ContractType
    rate: float | None = None
    subscription_revenue: float
    amount: float
    status: SettlementStatus
    settled_at: int | None = None
    withdrawn_at: int | None = None


class RoyaltyStats(CamelModel):
    pending_count: int = 0
    pending_amount: float = 0.0
    settled_count: int = 0
    settled_amount: float = 0.0
    withdrawn_count: int = 0
    withdrawn_amount: float = 0.0
    monthly_total: float = 0.0


class RoyaltyListResponse(CamelModel):
    items: list[RoyaltyDetailItem] = Field(default_factory=list, alias="list")
    total: int = 0
    stats: RoyaltyStats = RoyaltyStats()

    model_config = {"populate_by_name": True}


class BatchSettleParams(CamelModel):
    ids: list[int] = []
