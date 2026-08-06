import { Link } from "react-router-dom";
import "./Footer.css";

/**
 * 底部信息栏
 */
export function Footer() {
  return (
    <footer className="novel-footer" role="contentinfo">
      <div className="novel-footer__inner container-page">
        <div className="novel-footer__brand">
          <div className="novel-footer__logo">Atlas 小说阅读</div>
          <p className="novel-footer__slogan">沉浸阅读，发现好书</p>
        </div>
        <nav className="novel-footer__nav" aria-label="底部导航">
          <Link to="/">首页</Link>
          <Link to="/category">分类</Link>
          <Link to="/search">搜索</Link>
          <Link to="/profile">个人中心</Link>
        </nav>
        <div className="novel-footer__meta">
          <p>© 2026 Atlas Reader · 仅供学习演示</p>
          <p>京 ICP 备 0000000 号 · 举报电话 000-00000000</p>
        </div>
      </div>
    </footer>
  );
}
