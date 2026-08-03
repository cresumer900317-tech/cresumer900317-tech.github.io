/* ============================================================
   메이플키우기 라운지 — 프리미엄 홈 (Warm Editorial)
   자체 완결형: home-premium.css만 사용, 공용 style.css/renderShell 미사용.
   실데이터 매핑 + SWR 캐싱 유지.
   ============================================================ */

const FRIENDS = new Set(["친구들", "친구둘", "친구삼", "친구넷", "친구닷"]);

// ── 탭 전환 ─────────────────────────────────────────────────
window.showOfficialTab = function (btn, kind) {
  btn.parentElement.querySelectorAll(".mini-tab").forEach((b) => b.classList.toggle("active", b === btn));
  document.querySelectorAll("#officialList .feed-row").forEach((r) => {
    r.style.display = (kind === "전체" || r.dataset.kind === kind) ? "" : "none";
  });
};
window.showCommTab = function (btn, id) {
  btn.parentElement.querySelectorAll(".mini-tab").forEach((b) => b.classList.toggle("active", b === btn));
  ["commLatest", "commPopular"].forEach((x) => {
    const el = document.getElementById(x);
    if (el) el.style.display = x === id ? "" : "none";
  });
};
window.showCrTab = function (i) {
  document.querySelectorAll(".cr-tab").forEach((b, idx) => b.classList.toggle("active", idx === i));
  document.querySelectorAll(".cr-panel").forEach((p, idx) => p.classList.toggle("active", idx === i));
};
window.copyCoupon = function (code, btn) {
  navigator.clipboard.writeText(code).then(() => {
    const el = btn.querySelector(".copy");
    if (el) { el.textContent = "복사됨!"; setTimeout(() => { el.textContent = "복사"; }, 1500); }
  }).catch(() => { prompt("쿠폰 코드를 복사하세요:", code); });
};

// ── 아이콘 ──────────────────────────────────────────────────
const ICON = {
  leaf: '🍁',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>',
  trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2 8 4-16 2 8h6"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 9.5 8.5 4 9l4 4-1 6 5-3 5 3-1-6 4-4-5.5-.5z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m10 8 6 4-6 4V8Z"/><rect x="2" y="4" width="20" height="16" rx="4"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 18h.01"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  apple: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7 1.9-1.1 2.6-2.1c.8-1.2 1.2-2.4 1.2-2.4s-2.4-.9-2.4-3.5zM14.2 5.9c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.5.6-1 1.6-.9 2.6 1 .1 2-.5 2.6-1.2z"/></svg>',
  play2: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1L13 12.1v-.2L3.7 2.2zM16.3 15.4l-3.1-3.1v-.2l3.1-3.1.1.1 3.7 2.1c1.1.6 1.1 1.6 0 2.2zM15.6 16.1l-3.2-3.2-9.4 9.4c.4.4 1 .4 1.7.1z"/></svg>',
};

// ── 아바타 (이미지 위 초성 폴백) ───────────────────────────
function av(name, cls) {
  const nm = String(name || "").trim();
  const url = `https://mgf.gg/ranking/ranking_image.php?n=${encodeURIComponent(nm)}`;
  const init = escapeHtml((nm || "?").slice(0, 1));
  return `<span class="av ${cls || ""}"><span>${init}</span><img src="${url}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"></span>`;
}

// 7일 전투력 합 시계열 → 막대 차트 (시안)
// 월초 등 포인트가 적으면 막대 1~3개만 떠서 빈약함 → 4개 미만이면 성장TOP 폴백
const SPARK_MIN_POINTS = 4;
function sparkline(series) {
  const pts = (series || []).map(s => Number(s.total) || 0);
  if (pts.length < SPARK_MIN_POINTS) return "";
  const mx = Math.max(...pts), mn = Math.min(...pts) * 0.985, rng = (mx - mn) || 1;
  return `<div class="hero-bars">${pts.map((v, i) =>
    `<span class="hero-bar${i === pts.length - 1 ? " on" : ""}" style="height:${Math.round(22 + (v - mn) / rng * 78)}%"></span>`
  ).join("")}</div>`;
}

function guildChip(guild) {
  const gn = String(guild || "").normalize("NFC").trim();
  if (!gn || gn === "길드 없음") return "";
  return FRIENDS.has(gn)
    ? `<span class="guild-chip">${escapeHtml(gn)}</span>`
    : `<span class="guild-chip neutral">${escapeHtml(gn)}</span>`;
}

// ── 헤더 ────────────────────────────────────────────────────
function premiumHeader(user) {
  const NAV = [
    ["./", "홈", true], ["./ranking", "랭킹"], ["./profile", "전적검색"],
    ["./notice", "공지"], ["./tips", "공략"], ["./level-calc", "계산기"],
  ];
  const navLinks = NAV.map(([h, l, a]) => `<a href="${h}"${a ? ' class="active"' : ""}>${l}</a>`).join("");
  const guildDrop = `<div class="nav-drop" id="guildDrop">
    <button type="button" id="guildDropBtn">길드${ICON.chev}</button>
    <div class="nav-pop">
      <a href="./members">길드원</a>
      <a href="./weekly">월간성장</a>
      <a href="./join">가입 문의</a>
    </div>
  </div>`;

  const auth = user
    ? `<div class="user-menu" id="userMenu">
         <button class="user-btn" type="button" id="userBtn">${escapeHtml(user.character_name)}${ICON.chev}</button>
         <div class="user-pop">
           <div class="user-pop-head"><strong>${escapeHtml(user.character_name)}</strong><span>${escapeHtml(user.guild || "라운지 회원")}</span></div>
           <a href="./mypage">회원정보</a>
           <a href="./login?tab=changepw">비밀번호 변경</a>
           <button class="logout" onclick="logout()">로그아웃</button>
         </div>
       </div>`
    : `<a class="btn-login" href="./login">로그인</a>`;

  return `
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="./">
          <span class="brand-mark">🍁</span>
          <span class="brand-text"><span class="brand-name">메이플키우기 라운지</span><span class="brand-sub">스카니아11 서버</span></span>
        </a>
        <nav class="nav">${navLinks}${guildDrop}</nav>
        <div class="header-right">
          <form class="search-pill" onsubmit="event.preventDefault(); var v=this.q.value.trim(); if(v) location.href='./profile?n='+encodeURIComponent(v);">
            ${ICON.search}<input name="q" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
          </form>
          ${auth}
          <button class="mnav-btn" type="button" id="mnavBtn" aria-label="메뉴">${ICON.menu}</button>
        </div>
      </div>
      <div class="mnav-panel" id="mnavPanel">
        <div class="container mnav-links">
          <form class="mnav-search" onsubmit="event.preventDefault(); var v=this.q.value.trim(); if(v) location.href='./profile?n='+encodeURIComponent(v);">
            ${ICON.search}<input name="q" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
          </form>
          ${NAV.map(([h, l, a]) => `<a href="${h}"${a ? ' class="active"' : ""}>${l}</a>`).join("")}
          <a href="./members">길드원</a><a href="./weekly">월간성장</a>
          ${user ? `<a href="./mypage">회원정보</a><a href="#" onclick="logout();return false;">로그아웃</a>` : `<a href="./login">로그인 / 회원가입</a>`}
        </div>
      </div>
    </header>`;
}

function bindHeader() {
  const mnavBtn = document.getElementById("mnavBtn");
  const mnavPanel = document.getElementById("mnavPanel");
  if (mnavBtn && mnavPanel) mnavBtn.addEventListener("click", () => mnavPanel.classList.toggle("open"));
  const userBtn = document.getElementById("userBtn");
  const userMenu = document.getElementById("userMenu");
  if (userBtn && userMenu) {
    userBtn.addEventListener("click", (e) => { e.stopPropagation(); userMenu.classList.toggle("open"); });
    document.addEventListener("click", (e) => { if (!userMenu.contains(e.target)) userMenu.classList.remove("open"); });
  }
  const guildDropBtn = document.getElementById("guildDropBtn");
  const guildDrop = document.getElementById("guildDrop");
  if (guildDropBtn && guildDrop) {
    guildDropBtn.addEventListener("click", (e) => { e.stopPropagation(); guildDrop.classList.toggle("open"); });
    document.addEventListener("click", (e) => { if (!guildDrop.contains(e.target)) guildDrop.classList.remove("open"); });
  }
}

// ── 페이지 부트 ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const user = getUser();
  document.getElementById("app-shell").innerHTML = premiumHeader(user);
  bindHeader();
  pingVisitor();
  setInterval(pingVisitor, 3 * 60 * 1000);

  document.querySelector("main").innerHTML = `
    <section class="hero"><div class="container">
      <div class="hero-card"><div style="width:100%"><div class="sk sk-line" style="width:180px"></div><div class="sk sk-title" style="margin-top:16px;height:52px"></div><div class="sk sk-line" style="width:260px;margin-top:16px"></div></div></div>
    </div></section>
    <section class="section" style="padding-top:20px"><div class="container">
      <div class="kpi-row">${Array(4).fill('<div class="kpi"><div class="sk sk-line" style="width:60%"></div><div class="sk sk-title" style="margin-top:12px;height:36px;width:50%"></div></div>').join("")}</div>
    </div></section>
    <section class="section"><div class="container"><div class="grid-3">${Array(3).fill('<div class="panel"><div class="sk sk-card" style="margin:16px;height:220px"></div></div>').join("")}</div></div></section>`;

  const HOME_CACHE_KEY = "homeDataCache_v5";

  async function loadHomeData() {
    return Promise.all([
      getHomeData(),
      getGuildsData(),
      fetch(`${API_BASE}/api/visitors/stats`, { cache: "no-store" }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch(`${API_BASE}/api/notices?summary=true`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/tips?summary=true`, { cache: "no-store", headers: authHeaders() }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/server-ranking?limit=15`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/server-guild-ranking?limit=30`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/server-stats`, { cache: "no-store" }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch(`${API_BASE}/api/guild-health?limit=30`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/coupons`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/home-videos`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/official-notices`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/popular-searches`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/guild-dashboard`, { cache: "no-store" }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch(`${API_BASE}/api/content-records`, { cache: "no-store" }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]);
  }

  function renderHome([summary, members, visitorRes, noticesRes, tipsRes, serverTopRes, serverGuildRes, serverStatsRes, serverHealthRes, couponsRes, videosRes, officialRes, popularRes, dashRes, crRes]) {
    const u = getUser();
    const serverTotal = Number((serverStatsRes && serverStatsRes.totalPlayers) || 0);
    const visitorStats = visitorRes || {};
    const rows = Array.isArray(members) ? members : [];
    const memberCount = (summary && summary.member_count) || rows.length;

    // 친구패밀리 이번 주 성장률 (실데이터)
    const sumWeekly = rows.reduce((s, r) => s + Number(r.weeklyDiff || 0), 0);
    const curTotal = rows.reduce((s, r) => s + Number(r.power || 0), 0);
    const prevTotal = curTotal - sumWeekly;
    const familyGrowthPct = prevTotal > 0 ? (sumWeekly / prevTotal * 100) : 0;
    const growers = rows.filter(r => Number(r.weeklyDiff || 0) > 0).length;

    const growthTop = [...rows].filter(x => Number(x.weeklyDiff || 0) > 0)
      .sort((a, b) => Number(b.weeklyDiff || 0) - Number(a.weeklyDiff || 0)).slice(0, 4);

    const serverTop = (Array.isArray(serverTopRes) ? serverTopRes : [])
      .filter(r => r && r.nickname).sort((a, b) => Number(a.serverRank || 0) - Number(b.serverRank || 0)).slice(0, 12);
    const serverGuildTop = (Array.isArray(serverGuildRes) ? serverGuildRes : [])
      .filter(g => g && g.guildName).sort((a, b) => Number(a.guildRank || 0) - Number(b.guildRank || 0)).slice(0, 12);

    const clampH = v => Math.max(0, Math.min(100, v));
    const healthAll = (Array.isArray(serverHealthRes) ? serverHealthRes : [])
      .filter(g => g && g.guildName && Number(g.memberSampled || 0) >= 3)
      .map(g => {
        const depth = Number(g.medianPower || 0) > 0 ? clampH(50 + 12.5 * Math.log10(Number(g.medianPower) / 1e12)) : 0;
        const bal = g.effContributors != null ? clampH((Number(g.effContributors) - 1) / 9 * 100) : null;
        const act = g.activeRatio != null ? Number(g.activeRatio) * 100 : null;
        const grow = g.growthRatio != null ? Number(g.growthRatio) * 100 : null;
        const parts = (grow != null && bal != null && act != null)
          ? [[grow, 0.30], [act, 0.25], [depth, 0.25], [bal, 0.20]]
          : [[depth, 0.42], [act, 0.33], [bal, 0.25]].filter(p => p[0] != null);
        const wsum = parts.reduce((a, [, w]) => a + w, 0) || 1;
        return { name: g.guildName, score: Math.round(parts.reduce((a, [v, w]) => a + v * w, 0) / wsum) };
      }).sort((a, b) => b.score - a.score);
    const healthTop = healthAll.slice(0, 12);

    // 친구패밀리 KPI — 이미 가져온 데이터로 계산
    const friendRanks = (Array.isArray(serverGuildRes) ? serverGuildRes : [])
      .filter(g => FRIENDS.has(normalizeGuildName(g.guildName || "")))
      .map(g => Number(g.guildRank || 0)).filter(n => n > 0);
    const friendGuildRank = friendRanks.length ? Math.min(...friendRanks) : null;
    const friendHealth = healthAll.find(g => FRIENDS.has(normalizeGuildName(g.name || "")));
    const friendHealthScore = friendHealth ? friendHealth.score : null;
    const friendHealthRank = friendHealth ? healthAll.indexOf(friendHealth) + 1 : null;
    const healthTotal = healthAll.length;

    // 대시보드(백엔드 집계) — 히어로/KPI/차트. 없으면 클라 계산값으로 폴백.
    const dash = (dashRes && typeof dashRes === "object" && !Array.isArray(dashRes)) ? dashRes : {};
    const dSeries = Array.isArray(dash.series) ? dash.series : [];
    const dGrowth = Number(dash.growthPct || 0);
    const dGrowers = Number(dash.growersYesterday || 0);
    const dTotal = Number(dash.totalMembers || 0);
    const dMonth = Number(dash.growersMonth || 0);
    const dMonthLabel = dash.monthLabel || "이번 달";
    const heroGrowth = dGrowth > 0 ? dGrowth : familyGrowthPct;
    const heroGrowers = dGrowers > 0 ? dGrowers : growers;

    // 커뮤니티 피드
    const feedDate = (iso) => {
      if (!iso) return "";
      const d = new Date(iso), now = new Date(), diffH = (now - d) / 36e5;
      if (diffH < 1) return "방금";
      if (diffH < 24) return `${Math.floor(diffH)}시간 전`;
      if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}일 전`;
      return d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
    };
    const noticeRows = Array.isArray(noticesRes) ? noticesRes : [];
    const tipsRows = Array.isArray(tipsRes) ? tipsRes : [];
    const merged = [
      ...noticeRows.map(p => ({ ...p, board: "공지", href: `./notice-view?id=${p.id}` })),
      ...tipsRows.map(p => ({ ...p, board: "공략", href: `./tips-view?id=${p.id}` })),
    ].filter(p => p.created_at);
    const communityFeed = [...merged].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
    const popularFeed = [...merged].filter(p => Number(p.likes) > 0)
      .sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0) || new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
    const officialRows = Array.isArray(officialRes) ? officialRes : [];
    const videos = Array.isArray(videosRes) ? videosRes : [];
    const coupons = Array.isArray(couponsRes) ? couponsRes : [];
    const popular = Array.isArray(popularRes) ? popularRes : [];

    const lastUpdate = rows.length && rows[0].capturedAt
      ? new Date(rows[0].capturedAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "-";

    const online = visitorStats.online || 0;
    const feedTagClass = (b) => b === "공지" ? "notice" : b === "공략" ? "guide" : "notice";
    const officialTagClass = (k) => k === "이벤트" ? "event" : k === "패치" ? "patch" : "notice";
    const feedRow = (p) => `
      <a class="feed-row" href="${p.href}">
        <span class="feed-tag ${feedTagClass(p.board)}">${p.board}</span>
        <span class="feed-ttl">${escapeHtml(p.title || "(제목 없음)")}</span>
        ${Number(p.likes) > 0 ? `<span class="feed-date" style="color:var(--amber)">❤ ${p.likes}</span>` : ""}
        <span class="feed-date">${feedDate(p.created_at)}</span>
      </a>`;

    // ── 히어로 (친구패밀리 대시보드 내러티브) ──
    const heroChart = dSeries.length >= SPARK_MIN_POINTS
      ? `<div class="hero-chart">${sparkline(dSeries)}</div>`
      : (growthTop.length ? `
        <div class="hero-side-panel">
          <div class="hero-side-title">이번 주 성장 TOP <a href="./weekly">더보기</a></div>
          ${growthTop.map((it, i) => `
            <a class="mini-item" href="./profile?n=${encodeURIComponent(it.name || "")}">
              <span class="mini-rank">${i + 1}</span>${av(it.name, "sm")}
              <div class="mini-main"><div class="mini-name">${escapeHtml(it.name || "-")}</div><div class="mini-sub">${escapeHtml((it.guild || "").normalize("NFC").trim() || "라운지")}</div></div>
              <span class="mini-val" style="color:var(--green)">+${formatCompactPower(it.weeklyDiff || 0)}</span>
            </a>`).join("")}
        </div>` : "");

    const heroHtml = `
      <div class="hero-card">
        <div class="hero-copy">
          <span class="hero-live"><span class="pulse"></span><span class="hero-live-txt">${
            heroGrowers > 0
              ? `어제 <b>${heroGrowers}명</b>이 전투력을 올렸어요`
              : (u ? `반갑습니다, <b>${escapeHtml(u.character_name)}</b>님` : "함께 성장하는 친구패밀리")
          }</span></span>
          ${heroGrowth > 0
            ? `<h1 class="hero-title">${dMonthLabel}, 친구패밀리 다같이 <span class="pct">+${heroGrowth.toFixed(1)}%</span> 성장 중</h1>
               ${dSeries.length >= 2
                  ? `<p class="hero-sub">${dMonthLabel} 친구패밀리 전투력 합 <b>${fmtPowerShort(dSeries[0].total)}</b><span class="arrow">→</span><b>${fmtPowerShort(dSeries[dSeries.length - 1].total)}</b></p>`
                  : `<p class="hero-sub">친구패밀리가 함께 성장하고 있어요</p>`}`
            : `<h1 class="hero-title">메이플키우기 <span class="pct">라운지</span></h1>
               <p class="hero-sub">전적 · 서버랭킹 · 커뮤니티</p>`}
          <div class="hero-cta-row" style="margin-top:20px">
            ${u
              ? `<a class="cta ghost" href="./profile?n=${encodeURIComponent(u.character_name)}">내 전적 보기 ${ICON.arrow}</a>`
              : `<a class="cta primary" href="./ranking">서버 랭킹 ${ICON.arrow}</a><a class="cta ghost" href="./login">로그인 / 가입</a>`}
          </div>
        </div>
        <div class="hero-right">
          ${heroChart}
          ${u ? "" : `<a class="hero-recruit" href="./join">
            <span>같이 할 길드를 찾고 있다면</span>
            <b>친구패밀리 가입 문의 ${ICON.arrow}</b>
          </a>`}
        </div>
      </div>`;

    // ── KPI ──
    const kpi = (label, icon, value, unit, foot) => `
      <div class="kpi">
        <div class="kpi-label">${icon} ${label}</div>
        <div class="kpi-value">${value}${unit ? `<span class="unit">${unit}</span>` : ""}</div>
        <div class="kpi-foot">${foot}</div>
      </div>`;
    const kpiRow = `
      <div class="kpi-row">
        ${kpi("친구패밀리 길드원", ICON.users, memberCount ? formatNumber(memberCount) : "—", memberCount ? "명" : "", `${FRIENDS.size}개 길드가 함께해요`)}
        ${kpi("전투력 합", ICON.bolt, curTotal > 0 ? fmtPowerShort(curTotal) : "—", "", sumWeekly > 0 ? `이번 주 <span class="delta up">+${fmtPowerShort(sumWeekly)}</span>` : "친구패밀리 전체 합산")}
        ${kpi("길드 순위", ICON.trophy, friendGuildRank ? `${friendGuildRank}` : "—", friendGuildRank ? "위" : "", "친구패밀리 최고 길드")}
        ${kpi("건강도", ICON.heart, friendHealthScore != null ? `${friendHealthScore}` : "—", "", friendHealthRank ? `${healthTotal}개 중 ${friendHealthRank}위` : "활력 점수")}
      </div>`;

    // ── 컨텐츠 기록 (길드 탭: 친구들·친구둘, 각 고정 2 + 현재 시즌 1) ──
    const crData = (crRes && typeof crRes === "object" && !Array.isArray(crRes)) ? crRes : {};
    const crGuilds = Array.isArray(crData.guilds) ? crData.guilds : [];
    const crPrevSeason = crData.prevSeason || null;
    const fmtScore = (n) => Number(n || 0).toLocaleString("ko-KR");
    const crPct = (a, b) => (b > 0 ? Math.round((a - b) / b * 100) : null);
    const crBars = (hist) => {
      const h = (hist && hist.length) ? hist : [0];
      const mx = Math.max(...h, 1);
      return h.map((v, i) => `<div class="cc-bar${i === h.length - 1 ? " on" : ""}" style="height:${Math.max(12, Math.round(v / mx * 100))}%"></div>`).join("");
    };
    const seasonProg = (c) => {
      if (!c || !c.startsAt || !c.endsAt) return null;
      const s = new Date(c.startsAt + "T00:00:00"), e = new Date(c.endsAt + "T00:00:00"), now = new Date();
      const wk = 7 * 86400000;
      if (!(e > s)) return null;
      const total = Math.max(1, Math.ceil((e - s) / wk));
      const cur = Math.min(total, Math.max(1, Math.ceil((now - s) / wk)));
      const pct = Math.min(100, Math.max(3, Math.round((now - s) / (e - s) * 100)));
      return { total, cur, pct, endStr: `${e.getMonth() + 1}/${e.getDate()}` };
    };
    const crFixedCard = (c) => {
      if (c.pending || c.score == null) {
        return `<div class="content-card cc-pending">
          <div class="cc-top"><span class="cc-name">${escapeHtml(c.name || "")}</span><span class="cc-badge">고정</span></div>
          <div class="cc-score"><b>—</b><span class="unit">점</span></div>
          <div class="cc-meta">아직 기록이 없어요</div>
          <div class="cc-bars">${Array(7).fill('<div class="cc-bar" style="height:26%"></div>').join("")}</div>
          <div class="cc-foot"><span>운영진 점수 입력 대기</span><span class="go">곧 업데이트</span></div>
        </div>`;
      }
      const d = c.prevScore != null ? crPct(c.score, c.prevScore) : null;
      return `<div class="content-card">
        <div class="cc-top"><span class="cc-name">${escapeHtml(c.name || "")}</span><span class="cc-badge">고정</span></div>
        <div class="cc-score"><b>${fmtScore(c.score)}</b><span class="unit">점${c.roundLabel ? ` · ${escapeHtml(c.roundLabel)}` : ""}</span></div>
        <div class="cc-meta">${d != null ? `<span class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? ICON.up : ""}지난 회차 ${d >= 0 ? "+" : ""}${d}%</span> · ` : ""}최고 ${fmtScore(c.best)}</div>
        <div class="cc-bars">${crBars(c.history)}</div>
        <div class="cc-foot"><span>${c.participants ? `참여 ${c.participants}명` : "&nbsp;"}</span><span class="go">기록 ${ICON.arrow}</span></div>
      </div>`;
    };
    const crSeasonCard = (c) => {
      const d = c.prevScore != null ? crPct(c.score, c.prevScore) : null;
      const p = seasonProg(c);
      return `<div class="content-card season-cur">
        <div class="cc-top"><span class="cc-name">${escapeHtml(c.name || "")}</span><span class="cc-badge season">시즌 진행 중</span></div>
        <div class="cc-score"><b>${fmtScore(c.score)}</b><span class="unit">점${c.roundLabel ? ` · ${escapeHtml(c.roundLabel)}` : ""}</span></div>
        <div class="cc-meta">${d != null ? `<span class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? ICON.up : ""}지난주 ${d >= 0 ? "+" : ""}${d}%</span>` : ""}${c.participants ? `${d != null ? " · " : ""}참여 ${c.participants}명` : ""}</div>
        <div class="cc-prog">
          <div class="cc-track"><div class="cc-fill" style="width:${p ? p.pct : 25}%"></div></div>
          <div class="cc-prog-cap">${p ? `${p.total}주 중 ${p.cur}주차 · ~${p.endStr} 종료` : (c.roundLabel || "진행 중")}</div>
        </div>
        <div class="cc-foot">${crPrevSeason ? `<span>이전 시즌 <b style="color:var(--ink-soft)">${escapeHtml(crPrevSeason)}</b></span>` : `<span>&nbsp;</span>`}<a class="go" href="./archive">아카이브 ${ICON.arrow}</a></div>
      </div>`;
    };
    // 길드에 입력된 점수가 하나도 없으면 대기 카드 나열 대신 안내 한 장으로 압축
    const crGuildCards = (gd) => {
      const fixed = gd.fixed || [];
      const hasAnyScore = fixed.some(c => !c.pending && c.score != null) || gd.season;
      if (!hasAnyScore) {
        const names = fixed.map(c => escapeHtml(c.name || "")).filter(Boolean).join(" · ");
        return [`<div class="content-card cc-pending cc-empty">
          <div class="cc-top"><span class="cc-name">컨텐츠 기록 준비 중</span><span class="cc-badge">대기</span></div>
          <div class="cc-meta">${names || "길드 컨텐츠"} — 운영진이 점수를 입력하면 이곳에 기록이 표시돼요.</div>
        </div>`];
      }
      return [...fixed.map(crFixedCard), ...(gd.season ? [crSeasonCard(gd.season)] : [])];
    };
    const crHasAny = crGuilds.some(gd => (gd.fixed && gd.fixed.length) || gd.season);
    const contentSection = crHasAny ? `
      <section class="section"><div class="container">
        <div class="section-head">
          <div><span class="section-eyebrow">GUILD ACTIVITY</span><div class="section-title">컨텐츠 기록</div><div class="section-sub">친구들·친구둘 컨텐츠 참여 기록</div></div>
          <a class="section-link" href="./archive">전체 기록 보기 ${ICON.arrow}</a>
        </div>
        <div class="cr-tabs">${crGuilds.map((gd, i) => `<button class="cr-tab${i === 0 ? " active" : ""}" onclick="showCrTab(${i})">${escapeHtml(gd.guild)}</button>`).join("")}</div>
        ${crGuilds.map((gd, i) => `<div class="cr-panel${i === 0 ? " active" : ""}" id="cr-panel-${i}"><div class="content-grid">${crGuildCards(gd).join("")}</div></div>`).join("")}
      </div></section>` : "";

    // ── 랭킹 3열 ──
    const rankSection = (serverTop.length || serverGuildTop.length || healthTop.length) ? `
      <section class="section"><div class="container">
        <div class="section-head">
          <div><span class="section-eyebrow">SCANIA 11</span><div class="section-title">서버 랭킹</div><div class="section-sub">스카니아11 서버 실시간 순위</div></div>
          <a class="section-link" href="./ranking">전체 랭킹 보기 ${ICON.arrow}</a>
        </div>
        <div class="rank-3">
          ${serverTop.length ? `
          <div class="panel" style="padding:6px 10px 10px">
            <div style="padding:12px 8px 6px;font-size:0.82rem;font-weight:700;color:var(--ink-soft)">전투력 TOP</div>
            <div class="rank-list rank-scroll">
              ${serverTop.map((it, i) => `
                <a class="rank-row${i < 3 ? " top" : ""}" href="./profile?n=${encodeURIComponent(it.nickname || "")}">
                  <span class="rank-no">${i + 1}</span>${av(it.nickname)}
                  <div class="rank-main"><div class="rank-name">${escapeHtml(it.nickname || "")} ${guildChip(it.guild)}</div><div class="rank-meta">${it.job ? escapeHtml(it.job) + " · " : ""}Lv ${it.level || "-"}</div></div>
                  <span class="rank-power">${escapeHtml(getPowerDisplay(it))}</span>
                </a>`).join("")}
            </div>
          </div>` : ""}
          ${serverGuildTop.length ? `
          <div class="panel" style="padding:6px 10px 10px">
            <div style="padding:12px 8px 6px;font-size:0.82rem;font-weight:700;color:var(--ink-soft)">길드 TOP</div>
            <div class="rank-list rank-scroll">
              ${serverGuildTop.map(g => {
                const isF = FRIENDS.has(normalizeGuildName(g.guildName || ""));
                return `<div class="grank-row${isF ? " friend" : ""}"><span class="grank-no">${g.guildRank || "-"}</span><span class="grank-name">${escapeHtml(g.guildName || "-")}</span><span class="grank-meta">Lv.${g.level || "-"} · ${formatNumber(g.members || 0)}명</span><span class="grank-val">${formatCompactPower(g.power || 0)}</span></div>`;
              }).join("")}
            </div>
          </div>` : ""}
          ${healthTop.length ? `
          <div class="panel" style="padding:6px 10px 10px">
            <div style="padding:12px 8px 6px;font-size:0.82rem;font-weight:700;color:var(--ink-soft)">길드 건강도</div>
            <div class="rank-list rank-scroll">
              ${healthTop.map((g, i) => {
                const isF = FRIENDS.has(normalizeGuildName(g.name || ""));
                const col = g.score >= 70 ? "var(--green)" : g.score >= 55 ? "var(--amber)" : g.score >= 40 ? "#fb923c" : "var(--ink-faint)";
                return `<div class="grank-row${isF ? " friend" : ""}"><span class="grank-no">${i + 1}</span><span class="grank-name">${escapeHtml(g.name || "-")}</span><span class="grank-val" style="color:${col}">${g.score}</span></div>`;
              }).join("")}
            </div>
          </div>` : ""}
        </div>
      </div></section>` : "";

    // ── 사이드 (내 이번주 / 앱) ──
    const myRow = u ? rows.find(r => String(r.name || "").normalize("NFC") === String(u.character_name || "").normalize("NFC")) : null;
    const myWeek = u ? `
      <div class="myweek">
        <div class="myweek-label">내 이번 주</div>
        <div class="myweek-value">${myRow && Number(myRow.weeklyDiff || 0) > 0 ? "+" + formatCompactPower(myRow.weeklyDiff) : (myRow ? "±0" : "—")}</div>
        <div class="myweek-foot">${myRow ? (Number(myRow.weeklyDiff || 0) > 0 ? "꾸준히 성장 중이에요 🔥" : "오늘은 아직 변화가 없어요") : "전적 데이터를 찾지 못했어요"}</div>
      </div>` : "";

    document.querySelector("main").innerHTML = `
      <section class="hero"><div class="container">${heroHtml}</div></section>

      <div class="live-bar"><div class="container live-bar-inner">
        <div class="live-bar-left"><span class="live-dot"></span>
          <span class="live-msg">${online > 0 ? `지금 <b>${online}명</b>이 함께 보고 있어요` : (Number(visitorStats.today || 0) > 0 ? `오늘 <b>${formatNumber(visitorStats.today)}명</b>이 다녀갔어요` : "메이플키우기 라운지에 오신 걸 환영해요")}</span>
          <span class="live-sep">·</span><span class="live-extra">${serverTotal ? `스카니아11 ${formatNumber(serverTotal)}명 · ` : ""}누적 ${formatNumber(visitorStats.total || 0)}명 방문</span>
        </div>
        <span class="live-update">마지막 업데이트 ${lastUpdate}</span>
      </div></div>

      ${coupons.length ? `<div class="coupon-bar"><div class="container coupon-bar-inner"><span class="coupon-label">🎟 쿠폰</span>
        ${coupons.map(c => `<button class="coupon-chip" onclick="copyCoupon('${escapeHtml(c.code).replace(/'/g, "\\'")}', this)"><b>${escapeHtml(c.code)}</b>${c.reward ? `<span class="reward">${escapeHtml(c.reward)}</span>` : ""}<span class="copy">복사</span></button>`).join("")}
      </div></div>` : ""}

      <section class="section" style="padding-top:20px"><div class="container">${kpiRow}</div></section>

      ${contentSection}

      <section class="section"><div class="container"><div class="grid-3">
        <div class="panel">
          <div class="panel-head"><span class="panel-title">${ICON.chat} 커뮤니티</span>
            <div class="mini-tabs"><button class="mini-tab active" onclick="showCommTab(this,'commLatest')">최신</button><button class="mini-tab" onclick="showCommTab(this,'commPopular')">인기</button></div>
          </div>
          <div class="feed" id="commLatest">${communityFeed.length ? communityFeed.map(feedRow).join("") : '<div style="padding:24px;text-align:center;color:var(--ink-faint);font-size:0.85rem">아직 글이 없어요 — 첫 글을 남겨보세요!</div>'}</div>
          <div class="feed" id="commPopular" style="display:none">${popularFeed.length ? popularFeed.map(feedRow).join("") : '<div style="padding:24px;text-align:center;color:var(--ink-faint);font-size:0.85rem">아직 좋아요 받은 글이 없어요</div>'}</div>
          <a class="panel-foot" href="./tips">공략 게시판 →</a>
        </div>

        <div class="panel">
          <div class="panel-head"><span class="panel-title">${ICON.star} 메키 공식</span>
            <div class="mini-tabs"><button class="mini-tab active" onclick="showOfficialTab(this,'전체')">전체</button><button class="mini-tab" onclick="showOfficialTab(this,'공지')">공지</button><button class="mini-tab" onclick="showOfficialTab(this,'패치')">패치</button></div>
          </div>
          <div class="feed" id="officialList">
            ${officialRows.length ? officialRows.slice(0, 6).map(n => `
              <a class="feed-row" data-kind="${n.kind || "공지"}" href="${escapeHtml(n.url || "#")}" target="_blank" rel="noopener noreferrer">
                <span class="feed-tag ${officialTagClass(n.kind)}">${n.kind || "공지"}</span>
                <span class="feed-ttl">${escapeHtml(n.title || "")}</span>
                <span class="feed-date">${(n.date || "").slice(5)}</span>
              </a>`).join("") : '<div style="padding:24px;text-align:center;color:var(--ink-faint);font-size:0.85rem">공식 소식을 불러오지 못했어요</div>'}
          </div>
          <a class="panel-foot" href="https://forum.nexon.com/maplestoryidle-kr/" target="_blank" rel="noopener noreferrer">넥슨 공식 커뮤니티 →</a>
        </div>

        <div class="side">
          ${myWeek}
          ${videos.length ? `<div class="side-card"><div class="side-card-title">${ICON.play} 추천 영상</div><div class="videos">${videos.slice(0, 2).map(v => `<a class="video-thumb" href="https://www.youtube.com/watch?v=${escapeHtml(v.videoId)}" target="_blank" rel="noopener noreferrer" style="background-image:url('https://i.ytimg.com/vi/${escapeHtml(v.videoId)}/mqdefault.jpg');background-size:cover;background-position:center"></a>`).join("")}</div></div>` : ""}
          <div class="side-card">
            <div class="side-card-title">${ICON.phone} 길드라운지 앱</div>
            <p class="app-desc">콘텐츠 시작·마감 푸시 알림을 놓치지 마세요.</p>
            <div class="app-btns">
              <a class="app-btn dark" href="https://apps.apple.com/kr/app/id6782071379" target="_blank" rel="noopener noreferrer">${ICON.apple} App Store</a>
              <a class="app-btn ghost" href="https://play.google.com/store/apps/details?id=com.jisoar.chingufamily" target="_blank" rel="noopener noreferrer">${ICON.play2} Google Play</a>
            </div>
          </div>
        </div>
      </div></div></section>

      ${rankSection}

      <section class="section" style="padding-top:8px"><div class="container">
        <div class="recruit">
          <div>
            <div class="recruit-title">같이 할 길드, 찾고 계신가요?</div>
            <div class="recruit-desc">스카니아11에서 친구패밀리 5개 길드${rows.length ? `, 길드원 ${formatNumber(rows.length)}명` : ""}이 함께 성장하고 있어요. 초보든 복귀든 부담 없이 문의 주세요.</div>
          </div>
          <a class="btn-amber" href="./join">가입 문의하기 ${ICON.arrow}</a>
        </div>
      </div></section>

      <footer class="footer"><div class="container footer-inner">
        <div class="footer-brand">메이플키우기 라운지 · 스카니아11 서버</div>
        <div class="footer-links">
          <a href="./profile">전적검색</a><a href="./ranking">서버 랭킹</a><a href="./level-calc">계산기</a>
          <a href="https://apps.apple.com/kr/app/id6782071379" target="_blank" rel="noopener noreferrer">앱 (iOS)</a>
          <a href="https://play.google.com/store/apps/details?id=com.jisoar.chingufamily" target="_blank" rel="noopener noreferrer">앱 (Android)</a>
          <a href="./join">친구패밀리 가입 문의</a>
        </div>
        <div class="footer-copy">© ${new Date().getFullYear()} 메이플키우기 라운지 · 운영 친구패밀리. All rights reserved.</div>
      </div></footer>`;

  }

  // SWR: 캐시 즉시 렌더 → 최신 데이터 백그라운드 갱신
  let cachedStr = null, fromCache = false;
  try {
    const c = JSON.parse(localStorage.getItem(HOME_CACHE_KEY) || "null");
    if (c && Array.isArray(c.d) && Date.now() - c.t < 3600000) { renderHome(c.d); cachedStr = JSON.stringify(c.d); fromCache = true; }
  } catch (_) {}
  try {
    const fresh = await loadHomeData();
    try { localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ t: Date.now(), d: fresh })); } catch (_) {}
    if (!fromCache || JSON.stringify(fresh) !== cachedStr) renderHome(fresh);
  } catch (error) {
    console.error(error);
    if (!fromCache) document.querySelector("main").innerHTML = `<div class="container" style="padding:60px 0;text-align:center;color:var(--ink-faint)">데이터를 불러오지 못했어요. 잠시 후 새로고침해 주세요.</div>`;
  }
});
