"""B 端 API 集成测试。"""


class TestBEndAuth:
    async def test_login_demo_admin(self, client, db_session):
        """demo 管理员登录（需先建管理员记录）。"""
        from app.core.security import hash_password
        from app.models.user import Admin

        admin = Admin(
            username="admin",
            nickname="管理员",
            password_hash=hash_password("admin123"),
            enabled=1,
        )
        db_session.add(admin)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/b/auth/login",
            json={
                "username": "admin",
                "password": "admin123",
                "remember": False,
            },
        )
        body = resp.json()
        assert body["code"] == 0
        assert "token" in body["data"]
        assert body["data"]["user"]["username"] == "admin"

    async def test_login_wrong_password(self, client, db_session):
        from app.core.security import hash_password
        from app.models.user import Admin

        db_session.add(Admin(username="admin2", password_hash=hash_password("correct"), enabled=1))
        await db_session.commit()
        resp = await client.post(
            "/api/v1/b/auth/login", json={"username": "admin2", "password": "wrong"}
        )
        body = resp.json()
        assert body["code"] != 0
        assert "密码" in body["message"] or "错误" in body["message"]

    async def test_get_current_user_no_token(self, client):
        """未携带 token 时 demo 模式返回演示管理员。"""
        resp = await client.get("/api/v1/b/auth/me")
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["username"] == "admin"


class TestBEndWorkbench:
    async def test_get_kpi(self, client):
        resp = await client.get("/api/v1/b/workbench/kpi")
        body = resp.json()
        assert body["code"] == 0
        assert "totalNovels" in body["data"]

    async def test_get_word_trend(self, client):
        resp = await client.get("/api/v1/b/workbench/word-trend?days=7")
        body = resp.json()
        assert body["code"] == 0
        assert "daily" in body["data"]


class TestBEndNovels:
    async def test_list_novels_empty(self, client):
        resp = await client.get("/api/v1/b/novels")
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["total"] == 0

    async def test_create_and_list_novel(self, client):
        # 创建
        resp = await client.post(
            "/api/v1/b/novels",
            json={
                "title": "测试作品",
                "category": "xuanhuan",
                "intro": "简介",
            },
        )
        body = resp.json()
        assert body["code"] == 0
        novel_id = body["data"]["id"]

        # 查询列表
        resp = await client.get("/api/v1/b/novels")
        body = resp.json()
        assert body["data"]["total"] == 1
        assert body["data"]["list"][0]["title"] == "测试作品"

        # 查询详情
        resp = await client.get(f"/api/v1/b/novels/{novel_id}")
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["title"] == "测试作品"

    async def test_batch_submit_audit(self, client):
        resp = await client.post(
            "/api/v1/b/novels", json={"title": "待审核作品", "category": "urban"}
        )
        novel_id = resp.json()["data"]["id"]
        resp = await client.post(
            "/api/v1/b/novels/submit-audit", json={"ids": [int(novel_id)], "action": "submit-audit"}
        )
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["success"] is True


class TestBEndChapters:
    async def test_create_chapter(self, client, db_session):
        from app.models.novel import Novel

        novel = Novel(title="测试", status="draft", word_count=0)
        db_session.add(novel)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/b/chapters",
            json={
                "novelId": str(novel.id),
                "title": "第一章",
                "content": "这是正文",
            },
        )
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["title"] == "第一章"
        assert body["data"]["wordCount"] > 0

    async def test_import_chapters(self, client, db_session):
        """批量导入章节（multipart）。"""
        from app.models.novel import Novel

        novel = Novel(title="导入测试", status="draft", word_count=0)
        db_session.add(novel)
        await db_session.commit()

        content = "第一章 开篇\n这是第一章正文。\n\n第2章 发展中\n第二章正文内容。\n"
        resp = await client.post(
            "/api/v1/b/chapters/import",
            data={
                "novel_id": str(novel.id),
                "is_vip": "false",
                "split": "true",
            },
            files={
                "files": ("整卷.txt", content.encode("utf-8"), "text/plain"),
            },
        )
        body = resp.json()
        assert body["code"] == 0
        assert len(body["data"]["list"]) == 2
        assert body["data"]["list"][0]["title"] == "第一章 开篇"
        assert body["data"]["list"][1]["title"] == "第2章 发展中"
        assert body["data"]["errors"] == []

    async def test_import_chapters_reject_non_txt(self, client, db_session):
        from app.models.novel import Novel

        novel = Novel(title="拒绝非txt", status="draft", word_count=0)
        db_session.add(novel)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/b/chapters/import",
            data={"novel_id": str(novel.id)},
            files={"files": ("图片.png", b"not a text", "image/png")},
        )
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["list"] == []
        assert "仅支持" in body["data"]["errors"][0]["reason"]


class TestBEndUpload:
    async def test_upload_image(self, client):
        """上传 PNG 图片。"""
        png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 128
        resp = await client.post(
            "/api/v1/b/uploads/image",
            files={"file": ("cover.png", png, "image/png")},
        )
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["url"].startswith("/uploads/covers/")
        assert body["data"]["url"].endswith(".png")

    async def test_upload_image_reject_non_image(self, client):
        """非图片文件应被拒绝。"""
        resp = await client.post(
            "/api/v1/b/uploads/image",
            files={"file": ("fake.jpg", b"not an image", "image/jpeg")},
        )
        body = resp.json()
        assert body["code"] != 0
        assert "仅支持" in body["message"]


class TestBEndAudit:
    async def test_get_audit_queue_empty(self, client):
        resp = await client.get("/api/v1/b/audits/queue")
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["stats"]["pendingCount"] == 0


class TestBEndRoyalties:
    async def test_list_royalties_empty(self, client):
        resp = await client.get("/api/v1/b/royalties")
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["list"] == []


class TestBEndRoles:
    async def test_list_roles_empty(self, client):
        resp = await client.get("/api/v1/b/roles")
        body = resp.json()
        assert body["code"] == 0

    async def test_list_permissions_empty(self, client):
        resp = await client.get("/api/v1/b/permissions")
        body = resp.json()
        assert body["code"] == 0


class TestBEndSensitive:
    async def test_get_sensitive_word_lib_empty(self, client):
        resp = await client.get("/api/v1/b/sensitive-words")
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["words"] == []

    async def test_add_and_remove_word(self, client):
        # 新增
        resp = await client.post(
            "/api/v1/b/sensitive-words",
            json={"text": "测试敏感词", "level": 1, "suggestion": "高危"},
        )
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["text"] == "测试敏感词"

        # 查询确认
        resp = await client.get("/api/v1/b/sensitive-words")
        body = resp.json()
        assert any(w["text"] == "测试敏感词" for w in body["data"]["words"])

        # 删除
        resp = await client.delete("/api/v1/b/sensitive-words?text=测试敏感词")
        body = resp.json()
        assert body["code"] == 0
        assert body["data"] is True


class TestBEndCharts:
    async def test_workbench_trend(self, client):
        resp = await client.get("/api/v1/b/charts/workbench-trend?range=7")
        body = resp.json()
        assert body["code"] == 0

    async def test_category_distribution(self, client):
        resp = await client.get("/api/v1/b/charts/category-distribution")
        body = resp.json()
        assert body["code"] == 0


class TestBEndSystem:
    async def test_get_config(self, client):
        resp = await client.get("/api/v1/b/system/config")
        body = resp.json()
        assert body["code"] == 0
        assert "siteName" in body["data"]


class TestBEndUsers:
    async def test_list_users_empty(self, client):
        resp = await client.get("/api/v1/b/users")
        body = resp.json()
        assert body["code"] == 0
        assert body["data"]["total"] == 0
