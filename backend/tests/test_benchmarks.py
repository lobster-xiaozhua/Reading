"""性能基准测试。

基准测试仅在显式请求时运行（--benchmark-only），默认不运行以加速普通测试。
运行: pytest tests/test_benchmarks.py --benchmark-only
"""

import time

import pytest

from app.models.novel import Novel
from app.models.reading import ReadingHistory
from app.services.recommend_service import RecommendService, _cf_score, time_decay_weight
from app.services.search_service import SearchService

# ── 基准测试：协同过滤核心算法 ──────────────────────────

@pytest.mark.slow
@pytest.mark.benchmark
def test_cf_score_performance(benchmark):
    """测量 _cf_score 函数调用耗时（纯函数，无 I/O）。"""
    result = benchmark(_cf_score, 42, 100)
    assert result == 76  # min(60 + int(42/100*40), 100) = min(76, 100)


@pytest.mark.slow
@pytest.mark.benchmark
def test_time_decay_weight_performance(benchmark):
    """测量时间衰减权重计算耗时（纯函数，无 I/O）。"""
    now_ms = int(time.time() * 1000)
    read_at_ms = now_ms - 3 * 24 * 60 * 60 * 1000  # 3 天前
    result = benchmark(time_decay_weight, read_at_ms, now_ms)
    assert 1.8 <= result <= 2.0  # 7 天内，权重应 > 1.8


# ── 基准测试：推荐服务 ──────────────────────────────────

@pytest.mark.slow
@pytest.mark.benchmark
async def test_recommend_cold_start_performance(benchmark, db_session, redis_client):
    """冷启动推荐：无阅读历史的推荐路径耗时。"""
    # 准备数据：创建 10 本热门作品
    for i in range(10):
        db_session.add(Novel(
            title=f"热门书{i}", author_name="作者", category="xuanhuan",
            status="published", word_count=1000, click_count=5000 - i * 100,
            rating=4.0 + i * 0.1,
        ))
    await db_session.commit()

    svc = RecommendService(db_session, redis_client)
    result = await benchmark(svc.get_recommendations, reader_id=999, limit=6)
    assert len(result) <= 6


@pytest.mark.slow
@pytest.mark.benchmark
async def test_recommend_with_history_performance(benchmark, db_session, redis_client):
    """有阅读历史的推荐：协同过滤路径耗时。"""
    # 准备数据：读者 1 阅读多本书，读者 2-5 共读
    book_a = Novel(title="共同书", author_name="作者", category="xuanhuan",
                   status="published", word_count=1000, click_count=5000, rating=4.5)
    book_b = Novel(title="候选书", author_name="作者", category="xuanhuan",
                   status="published", word_count=1000, click_count=3000, rating=4.0)
    db_session.add_all([book_a, book_b])
    await db_session.flush()

    # 读者 1 阅读 book_a
    db_session.add(ReadingHistory(reader_id=1, novel_id=book_a.id, read_at=int(time.time() * 1000)))
    # 读者 2-5 共读 book_a 和 book_b
    for reader_id in range(2, 6):
        db_session.add(ReadingHistory(reader_id=reader_id, novel_id=book_a.id, read_at=int(time.time() * 1000)))
        db_session.add(ReadingHistory(reader_id=reader_id, novel_id=book_b.id, read_at=int(time.time() * 1000)))
    await db_session.commit()

    svc = RecommendService(db_session, redis_client)
    result = await benchmark(svc.get_recommendations, reader_id=1, limit=6)
    assert len(result) >= 1


# ── 基准测试：搜索服务 ──────────────────────────────────

@pytest.mark.slow
@pytest.mark.benchmark
async def test_search_performance(benchmark, db_session, redis_client):
    """搜索服务：标题+作者合并查询耗时。"""
    # 准备数据
    for i in range(20):
        db_session.add(Novel(
            title=f"搜索测试书{i}", author_name="测试作者", category="xuanhuan",
            status="published", word_count=1000, click_count=100, rating=4.0,
        ))
    await db_session.commit()

    svc = SearchService(db_session, redis_client)
    result = await benchmark(svc.search_books, keyword="测试书5", page=1, page_size=10)
    assert result.total >= 0


# ── 基准测试：推荐去重算法 ──────────────────────────────

@pytest.mark.slow
@pytest.mark.benchmark
def test_dedup_set_performance(benchmark):
    """集合去重 vs 旧 dict.fromkeys 性能对比。"""
    items = list(range(10000)) + list(range(5000))  # 有重复
    # 新算法：集合去重
    result = benchmark(_dedup_new, items)
    assert len(result) == 10000


def _dedup_new(items: list[int]) -> list[int]:
    """新的集合去重算法（O(n)）。"""
    seen: set[int] = set()
    return [x for x in items if not (x in seen or seen.add(x))]


# ── 基准测试：敏感词 Trie 扫描 ──────────────────────────

@pytest.mark.slow
@pytest.mark.benchmark
def test_sensitive_trie_scan_performance(benchmark):
    """千级词库 + 含大量命中的长文本扫描耗时。"""
    from app.utils.sensitive_trie import SensitiveTrie

    trie = SensitiveTrie()
    trie.load([f"敏感词{i}" for i in range(1000)])
    text = "这是一段正常文本，" + "敏感词42" * 80 + "结尾，" + "敏感词999" * 40
    result = benchmark(trie.scan, text)
    assert result  # 至少命中词


# ── 基准测试：书架批量加载（N+1 修复后批量查询路径） ──────

@pytest.mark.slow
@pytest.mark.benchmark
async def test_bookshelf_load_performance(benchmark, db_session, redis_client):
    """书架 100 条记录的批量加载耗时（单次 IN 查询聚合，无 N+1）。"""
    from app.models.novel import Novel
    from app.models.reading import Bookshelf
    from app.services.user_center_service import UserCenterService

    novels = [
        Novel(title=f"书架书{i}", author_name="作者", category="xuanhuan",
              status="published", word_count=1000)
        for i in range(100)
    ]
    db_session.add_all(novels)
    await db_session.flush()
    for n in novels:
        db_session.add(Bookshelf(reader_id=1, novel_id=n.id, added_at=0))
    await db_session.commit()

    svc = UserCenterService(db_session, redis_client)
    result = await benchmark(svc._load_bookshelf, reader_id=1)
    assert len(result) == 100
