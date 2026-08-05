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

        db_session.add(Banner(book_id="1", title="测试Banner", subtitle="副标题", sort=1))
        await db_session.commit()
        resp = await client.get("/api/v1/c/banners")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["title"] == "测试Banner"


class TestCEndDiscoverHome:
    async def test_home_empty(self, client):
        resp = await client.get("/api/v1/c/discovery/home")
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] == 0
        data = body["data"]
        assert data["banners"] == []
        assert data["hotBooks"] == []
        assert data["freeBooks"] == []
        assert data["editorPicks"] == []
        assert data["categories"] == []
        assert set(data["rankings"].keys()) == {"hot", "follow", "ticket", "new"}

    async def test_home_with_data(self, client, db_session):
        from app.models.novel import Banner, Novel

        db_session.add(Banner(book_id="1", title="聚合Banner", sort=1))
        db_session.add(
            Novel(
                title="聚合热书",
                category="xuanhuan",
                status="published",
                word_count=100,
                click_count=999,
            )
        )
        await db_session.commit()
        resp = await client.get("/api/v1/c/discovery/home")
        body = resp.json()
        assert body["code"] == 0
        data = body["data"]
        assert len(data["banners"]) == 1
        assert data["banners"][0]["title"] == "聚合Banner"
        assert len(data["rankings"]["hot"]) >= 1

    async def test_home_redis_cached(self, client, db_session):
        from app.models.novel import Novel

        db_session.add(
            Novel(
                title="缓存热书",
                category="xuanhuan",
                status="published",
                word_count=100,
                click_count=100,
                flags="hot",
            )
        )
        await db_session.commit()
        first = await client.get("/api/v1/c/discovery/home")
        first_body = first.json()
        assert first_body["code"] == 0
        first_hot = first_body["data"]["hotBooks"]
        assert any(b["title"] == "缓存热书" for b in first_hot)
        db_session.add(
            Novel(
                title="缓存后新增",
                category="urban",
                status="published",
                word_count=200,
                click_count=200,
                flags="hot",
            )
        )
        await db_session.commit()
        second = await client.get("/api/v1/c/discovery/home")
        second_body = second.json()
        assert second_body["code"] == 0
        # 命中聚合缓存：结果与首次完全一致，不包含新增小说
        assert second_body["data"]["hotBooks"] == first_hot


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
            title="测试书",
            author_name="作者",
            category="xuanhuan",
            status="published",
            word_count=10000,
            rating=4.5,
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

        db_session.add(Novel(title="书A", category="xuanhuan", status="published", word_count=100))
        db_session.add(Novel(title="书B", category="urban", status="published", word_count=200))
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

        db_session.add(
            Novel(title="斗破苍穹", category="xuanhuan", status="published", word_count=100)
        )
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
