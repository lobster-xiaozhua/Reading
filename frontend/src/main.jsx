import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/_variables.css";
import "./styles/_base.css";
import "./styles/_layout.css";
import "./styles/_animations.css";
import "./styles/_utilities.css";

// 离线/在线状态监听
window.addEventListener("online", () => {
  document.body.removeAttribute("data-offline");
});
window.addEventListener("offline", () => {
  document.body.setAttribute("data-offline", "true");
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
