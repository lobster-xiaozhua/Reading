import { Link } from "react-router-dom";
import { NovelBookClosed, NovelMoon, NovelEye, NovelHeart } from "@novel/icons";
import "./Footer.css";

/**
 * 底部信息栏
 */
export function Footer() {
  return (
    <footer className="novel-footer" role="contentinfo">
      <div className="novel-footer__inner container-page">
        {/* 品牌区 */}
        <div className="novel-footer__brand">
          <div className="novel-footer__logo-wrap">
            <span className="novel-footer__logo-mark" aria-hidden>
              <NovelBookClosed size="md" aria-hidden />
            </span>
            <span className="novel-footer__logo-text">Atlas 阅读</span>
          </div>
          <p className="novel-footer__slogan">
            沉浸阅读，发现好书
          </p>
          <ul className="novel-footer__features">
            <li>
              <NovelMoon size="xs" aria-hidden />
              <span>多主题沉浸式阅读</span>
            </li>
            <li>
              <NovelEye size="xs" aria-hidden />
              <span>智能推荐，懂你所想</span>
            </li>
            <li>
              <NovelHeart size="xs" aria-hidden />
              <span>书架同步，随时续读</span>
            </li>
          </ul>
        </div>

        {/* 导航区 */}
        <div className="novel-footer__cols">
          <nav className="novel-footer__col" aria-label="页面导航">
            <div className="novel-footer__col-title">导航</div>
            <Link to="/">首页</Link>
            <Link to="/category">分类</Link>
            <Link to="/search">搜索</Link>
            <Link to="/profile">个人中心</Link>
          </nav>
          <nav className="novel-footer__col" aria-label="法律信息">
            <div className="novel-footer__col-title">法律</div>
            <a href="#privacy" target="_self">隐私政策</a>
            <a href="#terms" target="_self">用户协议</a>
            <a href="#copyright" target="_self">版权声明</a>
          </nav>
        </div>

        {/* 底部元信息 */}
        <div className="novel-footer__meta">
          <p className="novel-footer__copy">
            © 2026 Atlas Reader · 仅供学习演示
          </p>
          <p className="novel-footer__icp">
            京 ICP 备 0000000 号 · 举报电话 000-00000000
          </p>
        </div>
      </div>
    </footer>
  );
}
