import React, { Suspense, useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth.jsx";
import { ThemeProvider } from "./ThemeContext.jsx";
import { ToastProvider } from "./ToastContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import SearchBar from "./components/SearchBar.jsx";
import BottomNav from "./components/BottomNav.jsx";
import { useRegisterSW } from "virtual:pwa-register/react";

const BookDetail = React.lazy(() => import("./pages/BookDetail.jsx"));
const Reader = React.lazy(() => import("./pages/Reader.jsx"));
const Admin = React.lazy(() => import("./pages/Admin.jsx"));
const Discover = React.lazy(() => import("./pages/Discover.jsx"));
const SearchResults = React.lazy(() => import("./pages/SearchResults.jsx"));
const Shelf = React.lazy(() => import("./pages/Shelf.jsx"));
const Login = React.lazy(() => import("./pages/Login.jsx"));
const Stats = React.lazy(() => import("./pages/Stats.jsx"));
const Bookmarks = React.lazy(() => import("./pages/Bookmarks.jsx"));

function PageLoading() {
  return (
    <div className="empty-state" style={{ padding: "80px 20px" }}>
      <div className="empty-spinner" />
    </div>
  );
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}

function UserBadge() {
  const { user, logout } = useAuth();
  if (!user) {
    return (
      <Link to="/login" className="btn btn-ghost btn-login-link">
        登录
      </Link>
    );
  }
  return (
    <span className="user-badge">
      {user.username}
      <button onClick={logout} className="btn btn-ghost btn-logout">
        退出
      </button>
    </span>
  );
}

function AppShell() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      // SW registered — silently track
    },
    onRegisterError(error) {
      // SW registration error — silently track
    },
  });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 16px" }}>
        <SearchBar />
        <UserBadge />
      </div>
      {needRefresh && (
        <div className="sw-update-banner" role="alert">
          <span>📦 新版本可用</span>
          <button onClick={() => updateServiceWorker(true)}>更新</button>
        </div>
      )}
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<LazyPage><Discover /></LazyPage>} />
          <Route path="/shelf" element={<LazyPage><Shelf /></LazyPage>} />
          <Route path="/search" element={<LazyPage><SearchResults /></LazyPage>} />
          <Route path="/login" element={<LazyPage><Login /></LazyPage>} />
          <Route path="/book/:bookId" element={<LazyPage><BookDetail /></LazyPage>} />
          <Route path="/book/:bookId/read/:chapterId" element={
            <ErrorBoundary fallback="章节加载失败，请刷新重试">
              <LazyPage><Reader /></LazyPage>
            </ErrorBoundary>
          } />
          <Route path="/admin" element={<LazyPage><Admin /></LazyPage>} />
          <Route path="/stats" element={<LazyPage><Stats /></LazyPage>} />
          <Route path="/bookmarks" element={<LazyPage><Bookmarks /></LazyPage>} />
        </Routes>
      </ErrorBoundary>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}