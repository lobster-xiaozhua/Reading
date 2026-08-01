"""C 端 API 集成测试。"""



class TestCEndHealth:
    async def test_health(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestCEndBanners:
    async def test_get_banners_empty(self, client):
        resp = await client.get("/api/v1/c/banners")
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] == 0
        assert body["data"] == []

    async def test_get_banners_with_data(self, client, db_session):
        from app.models.novel import Banner
        db_session.add(Banner(
            book_id="1", title="测试Banner", subtitle="副标题", sort=1
        ))
        await db_session.commit()
        resp = await client.get("/api/v1/c/banners")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["title"] == "测试Banner"


class TestCEndCategories:
    async def test_get_categories_empty(self, client):
        resp = await client.get("/api/v1/c/categories")
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    async def test_get_categories_with_data(self, client, db_session):
        from app.models.novel import Category
        db_session.add(Category(code="xuanhuan", name="玄幻", sort=1, novel_count=10))
        db_session.add(Category(code="urban", name="都市", sort=2, novel_count=5))
        await db_session.commit()
        resp = await client.get("/api/v1/c/categories")
        data = resp.json()["data"]
        assert len(data) == 2
        assert data[0]["name"] == "玄幻"


class TestCEndBooks:
    async def test_get_book_not_found(self, client):
        resp = await client.get("/api/v1/c/books/99999")
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] != 0  # 业务错误

    async def test_get_book_success(self, client, db_session):
        from app.models.novel import Novel
        novel = Novel(
            title="测试书", author_name="作者", category="xuanhuan",
            status="published", word_count=10000, rating=4.5,
        )
        db_session.add(novel)
        await db_session.commit()
        resp = await client.get(f"/api/v1/c/books/{novel.id}")
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["title"] == "测试书"
        assert body["data"]["status"] == "ongoing"

    async def test_get_category_books(self, client, db_session):
        from app.models.novel import Novel
        db_session.add(Novel(
            title="书A", category="xuanhuan", status="published", word_count=100
        ))
        db_session.add(Novel(
            title="书B", category="urban", status="published", word_count=200
        ))
        await db_session.commit()
        resp = await client.get("/api/v1/c/books?category=xuanhuan")
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["total"] == 1


class TestCEndSearch:
    async def test_search_suggestions_empty(self, client):
        resp = await client.get("/api/v1/c/search/suggestions?keyword=测试")
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    async def test_search_suggestions_with_data(self, client, db_session):
        from app.models.novel import Novel
        db_session.add(Novel(
            title="斗破苍穹", category="xuanhuan", status="published", word_count=100
        ))
        await db_session.commit()
        resp = await client.get("/api/v1/c/search/suggestions?keyword=斗破")
        body = resp.json()
        assert body["code"] == 0
        assert len(body["data"]) > 0
        assert body["data"][0]["type"] == "book"

    async def test_hot_searches(self, client):
        resp = await client.get("/api/v1/c/search/hot")
        assert resp.status_code == 200


class TestCEndVip:
    async def test_get_vip_plans(self, client):
        resp = await client.get("/api/v1/c/vip/plans")
        body = resp.json()
        assert body["code"] == 0
        assert len(body["data"]) == 3

    async def test_get_payment_methods(self, client):
        resp = await client.get("/api/v1/c/payment/methods")
        body = resp.json()
        assert body["code"] == 0
        assert len(body["data"]) == 3
