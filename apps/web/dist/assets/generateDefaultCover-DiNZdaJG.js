const i=[["#667eea","#764ba2"],["#f093fb","#f5576c"],["#4facfe","#00f2fe"],["#43e97b","#38f9d7"],["#fa709a","#fee140"],["#a18cd1","#fbc2eb"],["#fccb90","#d57eeb"],["#e0c3fc","#8ec5fc"],["#f5576c","#ff6f91"],["#667eea","#a8edea"],["#ffecd2","#fcb69f"],["#89f7fe","#66a6ff"],["#fddb92","#d1fdff"],["#c1dfc4","#deecdd"],["#d299c2","#fef9d7"],["#a1c4fd","#c2e9fb"]];function d(f){let e=0;for(let t=0;t<f.length;t++)e=(e<<5)-e+f.charCodeAt(t),e|=0;return Math.abs(e)}function l(f){const e=d(f)%i.length,t=i[e];return t||["#667eea","#764ba2"]}function g(f){const e=f.trim();if(!e)return"?";const t=e[0];return/[\u4e00-\u9fff]/.test(t)?t:t.toUpperCase()}function h(f,e){const[t,r]=l(f),s=g(f),c=f.replace(/[&<>"]/g,o=>o==="&"?"&amp;":o==="<"?"&lt;":o===">"?"&gt;":"&quot;"),n=e?e.replace(/[&<>"]/g,o=>o==="&"?"&amp;":o==="<"?"&lt;":o===">"?"&gt;":"&quot;"):"",a=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${t}"/>
      <stop offset="100%" style="stop-color:${r}"/>
    </linearGradient>
    <linearGradient id="shade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(0,0,0,0);stop-opacity:0"/>
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.3);stop-opacity:0.3"/>
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#bg)" rx="8"/>
  <rect width="400" height="600" fill="url(#shade)" rx="8"/>
  <text x="200" y="280" text-anchor="middle" dominant-baseline="central"
    font-family="serif" font-size="120" font-weight="bold"
    fill="rgba(255,255,255,0.85)">${s}</text>
  <text x="200" y="420" text-anchor="middle" dominant-baseline="central"
    font-family="sans-serif" font-size="22" font-weight="500"
    fill="rgba(255,255,255,0.9)">${c}</text>
  ${n?`<text x="200" y="460" text-anchor="middle" dominant-baseline="central"
    font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.6)">${n}</text>`:""}
</svg>`;return`data:image/svg+xml;base64,${typeof window<"u"?window.btoa(unescape(encodeURIComponent(a))):Buffer.from(a).toString("base64")}`}export{h as g};
