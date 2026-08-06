const API_BASE = "https://guild-backend-production-75a6.up.railway.app";

const GUILD_META = {
  "친구들": { className: "guild-f1", label: "친구들" },
  "친구둘": { className: "guild-f2", label: "친구둘" },
  "친구삼": { className: "guild-f3", label: "친구삼" },
  "친구넷": { className: "guild-f4", label: "친구넷" },
  "친구닷": { className: "guild-f5", label: "친구닷" },
  "길드 없음": { className: "guild-none", label: "길드 없음" }
};

async function fetchLocalJson(filename) {
  const key = filename.replace(".json", "");
  const apiKey = {
    "home-summary": "home-summary",
    "members": "members",
    "ranking": "ranking",
    "weekly": "weekly",
    "notices": "notices",
  }[key] || key;
  const response = await fetch(`${API_BASE}/api/${apiKey}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`데이터를 불러오지 못했습니다: ${filename}`);
  return response.json();
}

const getHomeData = () => fetchLocalJson("home-summary.json");
const getRankingData = () => fetchLocalJson("ranking.json");
const getWeeklyData = () => fetchLocalJson("weekly.json");
const getGuildsData = () => fetchLocalJson("members.json");
const getNoticeData = () => fetchLocalJson("notices.json");
const getServerRanking = () => fetchLocalJson("server-ranking.json");
const getGuildRanks = () => fetchLocalJson("guild-ranks.json");
// 캐릭터 일별 서버랭킹 이력 (프로필 성장 그래프용). 데이터 없거나 실패 시 빈 배열.
// (getTipsData 죽은 함수 제거: tips.js가 직접 fetch 사용 — 2026-06-28 클린업)
const getServerRankingHistory = async (name) => {
  try {
    const res = await fetch(`${API_BASE}/api/server-ranking/history?name=${encodeURIComponent(name)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("ko-KR").format(Math.round(num));
}

function formatRate(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "-";
  return `${num.toFixed(2)}%`;
}

function formatCompactPower(value) {
  const num = Number(String(value ?? "0").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num) || num === 0) return "-";
  const gyeong = Math.floor(num / 1e16);
  const jo = Math.floor((num % 1e16) / 1e12);
  const eok = Math.floor((num % 1e12) / 1e8);
  if (gyeong > 0 && jo > 0) return `${formatNumber(gyeong)}경 ${formatNumber(jo)}조`;
  if (gyeong > 0) return `${formatNumber(gyeong)}경`;
  if (jo > 0 && eok > 0) return `${formatNumber(jo)}조 ${formatNumber(eok)}억`;
  if (jo > 0) return `${formatNumber(jo)}조`;
  if (eok > 0) return `${formatNumber(eok)}억`;
  const man = Math.floor(num / 1e4);
  if (man > 0) return `${formatNumber(man)}만`;
  return formatNumber(num);
}

function fullPowerText(text) {
  return formatCompactPower(text);
}

// 짧은 전투력 표기 — "89경 2,656조" 대신 "89.3경" (좁은 UI·모바일용)
function fmtPowerShort(value) {
  const n = Number(value) || 0;
  const one = (v) => v.toFixed(1).replace(/\.0$/, "");
  if (n >= 1e16) return `${one(n / 1e16)}경`;
  if (n >= 1e12) return `${one(n / 1e12)}조`;
  if (n >= 1e8) return `${one(n / 1e8)}억`;
  return formatNumber(Math.floor(n));
}

function normalizeGuildName(guild) {
  const text = String(guild || "").trim();
  return GUILD_META[text] ? text : "길드 없음";
}

function guildBadgeHtml(guild) {
  const normalized = normalizeGuildName(guild);
  const meta = GUILD_META[normalized];
  return `<span class="guild-badge ${meta.className}">${escapeHtml(meta.label)}</span>`;
}

function metricClass(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num === 0) return "metric-neutral";
  return num > 0 ? "metric-up" : "metric-down";
}

function metricHtml(value, suffix = "") {
  const num = Number(value ?? 0);
  const absVal = formatCompactPower(Math.abs(num));
  const text = !Number.isFinite(num) ? "-" : `${num > 0 ? "+" : num < 0 ? "-" : ""}${absVal}${suffix}`;
  return `<span class="${metricClass(num)}">${escapeHtml(text)}</span>`;
}

function rankTrendHtml(item) {
  const diff = Number(item?.serverRankDiff ?? 0);
  const direction = item?.serverRankDirection || (diff > 0 ? "up" : diff < 0 ? "down" : "same");
  if (!diff || direction === "same") return `<span class="rank-trend neutral">-</span>`;
  if (direction === "up") return `<span class="rank-trend up">▲ ${Math.abs(diff)}</span>`;
  return `<span class="rank-trend down">▼ ${Math.abs(diff)}</span>`;
}

function navLink(href, key, label, currentPage) {
  const activeClass = currentPage === key ? "is-active" : "";
  return `<a class="nav-link ${activeClass}" href="${href}">${label}</a>`;
}

// ── 공용 프리미엄 셸 (홈과 동일 헤더 — Warm Editorial) ──────
const SHELL_ICON = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
};

const SHELL_NAV = [
  ["./", "home", "홈"], ["./ranking", "ranking", "랭킹"], ["./profile", "profile", "전적검색"],
  ["./notice", "notice", "공지"], ["./tips", "tips", "공략"],
];
const SHELL_CALC_NAV = [
  ["./level-calc", "level-calc", "레벨업 계산기"],
  ["./item-compare", "item-compare", "아이템 비교 AI"],
];
const SHELL_GUILD_NAV = [
  ["./members", "members", "길드원"], ["./weekly", "weekly", "월간성장"],
  ["./rivals", "rivals", "라이벌"], ["./points", "points", "포인트"], ["./join", "join", "가입 문의"],
];

function renderShell() {
  const root = document.getElementById("app-shell");
  if (!root) return;
  const page = document.body.dataset.page || "home";
  const user = getUser();

  // 공지/팁은 로그인 필요
  if (!requireLogin(page)) return;

  const a = ([h, k, l]) => `<a href="${h}"${k === page ? ' class="active"' : ""}>${l}</a>`;
  const guildActive = SHELL_GUILD_NAV.some(([, k]) => k === page);
  const calcActive = SHELL_CALC_NAV.some(([, k]) => k === page);
  const navLinks = SHELL_NAV.map(a).join("");
  const calcDrop = `<div class="nav-drop" id="calcDrop">
      <button type="button" id="calcDropBtn"${calcActive ? ' class="active"' : ""}>계산기${SHELL_ICON.chev}</button>
      <div class="nav-pop">${SHELL_CALC_NAV.map(a).join("")}</div>
    </div>`;
  const guildDrop = `<div class="nav-drop" id="guildDrop">
      <button type="button" id="guildDropBtn"${guildActive ? ' class="active"' : ""}>길드${SHELL_ICON.chev}</button>
      <div class="nav-pop">${SHELL_GUILD_NAV.map(a).join("")}</div>
    </div>`;

  const auth = user
    ? `<div class="user-menu" id="userMenu">
         <button class="user-btn" type="button" id="userBtn">${escapeHtml(user.character_name)}${SHELL_ICON.chev}</button>
         <div class="user-pop">
           <div class="user-pop-head"><strong>${escapeHtml(user.character_name)}</strong><span>${escapeHtml(user.guild || "라운지 회원")}</span></div>
           <a href="./mypage">회원정보</a>
           <a href="./login?tab=changepw">비밀번호 변경</a>
           <button class="logout" onclick="logout()">로그아웃</button>
         </div>
       </div>`
    : `<a class="btn-login" href="./login">로그인</a>`;

  const searchForm = (cls) => `
    <form class="${cls}" onsubmit="event.preventDefault(); var v=this.q.value.trim(); if(v) location.href='./profile?n='+encodeURIComponent(v);">
      ${SHELL_ICON.search}<input name="q" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
    </form>`;

  root.innerHTML = `
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="./">
          <span class="brand-mark">🍁</span>
          <span class="brand-text"><span class="brand-name">메이플키우기 라운지</span><span class="brand-sub">스카니아11 서버</span></span>
        </a>
        <nav class="nav">${navLinks}${calcDrop}${guildDrop}</nav>
        <div class="header-right">
          ${searchForm("search-pill")}
          ${auth}
          <button class="mnav-btn" type="button" id="mnavBtn" aria-label="메뉴">${SHELL_ICON.menu}</button>
        </div>
      </div>
      <div class="mnav-panel" id="mnavPanel">
        <div class="container mnav-links">
          ${searchForm("mnav-search")}
          ${SHELL_NAV.map(a).join("")}
          <div class="mnav-group-label">계산기</div>
          ${SHELL_CALC_NAV.map(a).join("")}
          <div class="mnav-group-label">길드</div>
          ${SHELL_GUILD_NAV.map(a).join("")}
          ${user
            ? `<div class="mnav-group-label">내 계정</div><a href="./mypage">회원정보</a><a href="#" onclick="logout();return false;">로그아웃</a>`
            : `<a href="./login">로그인 / 회원가입</a>`}
        </div>
      </div>
    </header>`;

  const mnavBtn = document.getElementById("mnavBtn");
  const mnavPanel = document.getElementById("mnavPanel");
  if (mnavBtn && mnavPanel) mnavBtn.addEventListener("click", () => mnavPanel.classList.toggle("open"));
  const userBtn = document.getElementById("userBtn");
  const userMenu = document.getElementById("userMenu");
  if (userBtn && userMenu) {
    userBtn.addEventListener("click", (e) => { e.stopPropagation(); userMenu.classList.toggle("open"); });
    document.addEventListener("click", (e) => { if (!userMenu.contains(e.target)) userMenu.classList.remove("open"); });
  }
  for (const [dropId, btnId] of [["guildDrop", "guildDropBtn"], ["calcDrop", "calcDropBtn"]]) {
    const dropBtn = document.getElementById(btnId);
    const dropEl = document.getElementById(dropId);
    if (dropBtn && dropEl) {
      dropBtn.addEventListener("click", (e) => { e.stopPropagation(); dropEl.classList.toggle("open"); });
      document.addEventListener("click", (e) => { if (!dropEl.contains(e.target)) dropEl.classList.remove("open"); });
    }
  }

  // 방문자 ping (3분마다 재핑)
  pingVisitor();
  setInterval(pingVisitor, 3 * 60 * 1000);
}

function getPowerDisplay(item) {
  const pt = item.powerText || "";
  const parts = pt.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? parts[0] + " " + parts[1] : pt || formatCompactPower(item.power);
}

function bindCardSearch(inputId, resetBtnId, listId, dataAttr) {
  const input = document.getElementById(inputId);
  const resetBtn = document.getElementById(resetBtnId);
  const wrap = document.getElementById(listId);
  if (!input || !wrap) return;
  function apply() {
    const kw = String(input.value || "").trim().toLowerCase();
    const cards = Array.from(wrap.querySelectorAll(`[${dataAttr}]`));
    cards.forEach(c => c.classList.remove("highlight-card", "dim-card"));
    if (!kw) return;
    let first = null;
    cards.forEach(c => {
      if ((c.getAttribute(dataAttr) || "").includes(kw)) {
        c.classList.add("highlight-card");
        if (!first) first = c;
      } else {
        c.classList.add("dim-card");
      }
    });
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  input.addEventListener("input", apply);
  if (resetBtn) resetBtn.addEventListener("click", () => { input.value = ""; apply(); input.focus(); });
}

function renderLoading(targetId, message = "불러오는 중...") {
  const el = document.getElementById(targetId) || document.querySelector("main");
  if (el) el.innerHTML = `<div class="container" style="padding-top:40px;"><div class="loading-box">${escapeHtml(message)}</div></div>`;
}

function renderError(targetId, error) {
  const el = document.getElementById(targetId) || document.querySelector("main");
  if (el) el.innerHTML = `<div class="container" style="padding-top:40px;"><div class="error-box">${escapeHtml(error?.message || "오류가 발생했습니다.")}</div></div>`;
}

function createEmptyBox(message = "데이터가 없습니다.") {
  return `<div class="empty-box">${escapeHtml(message)}</div>`;
}

// 친구패밀리(운영) 길드 — 아바타 LED 프레임 대상
const FRIEND_GUILD_SET = new Set(["친구들", "친구둘", "친구삼", "친구닷", "친구넷"]);

function characterAvatarHtml(item) {
  const name = String(item?.name || "").trim();
  const imageUrl = `https://mgf.gg/ranking/ranking_image.php?n=${encodeURIComponent(name)}`;
  const fallback = escapeHtml((name || "?").slice(0, 1));
  const guild = String(item?.guild || "").normalize("NFC").trim();
  const led = FRIEND_GUILD_SET.has(guild) ? " character-avatar-led" : "";
  return `
    <div class="character-avatar${led}">
      <img src="${imageUrl}" alt="${escapeHtml(name)}" loading="lazy" referrerpolicy="no-referrer"
           onerror="this.parentElement.classList.add('no-image'); this.remove();" />
      <span class="avatar-fallback">${fallback}</span>
    </div>
  `;
}

function renderBoardList(posts, emptyMessage) {
  if (!Array.isArray(posts) || posts.length === 0) return createEmptyBox(emptyMessage);
  return `
    <div class="notice-stack">
      ${posts.map(post => `
        <article class="notice-card">
          <div class="notice-top">
            <span class="notice-chip">${escapeHtml(post.category || "게시글")}</span>
            ${post.isPinned || post.is_pinned ? `<span class="notice-pin">고정</span>` : ""}
          </div>
          <h3 class="notice-title">${escapeHtml(post.title || "")}</h3>
          <p class="notice-content">${escapeHtml(post.content || "")}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function byGuild(rows) {
  const grouped = {};
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const guild = normalizeGuildName(row.guild || "길드 없음");
    grouped[guild] ||= [];
    grouped[guild].push(row);
  });
  return grouped;
}
// ── 방문자 트래킹 ──────────────────────────────────────────
function getSessionId() {
  let sid = sessionStorage.getItem("session_id");
  if (!sid) {
    sid = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem("session_id", sid);
  }
  return sid;
}

function pingVisitor() {
  const user = getUser();
  const name = user ? user.character_name : ("guest_" + getSessionId().slice(-4));
  fetch(`${API_BASE}/api/visitors/ping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: getSessionId(), character_name: name }),
  }).catch(() => {});
}

// ── 인증 유틸 ──────────────────────────────────────────────
function getUser() {
  try {
    const u = sessionStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

function getToken() {
  return sessionStorage.getItem("token") || "";
}

function authHeaders() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// ── 신고 / 차단 (커뮤니티 운영) ──
async function getMyBlocks() {
  if (!getUser()) return [];
  try {
    const r = await fetch(`${API_BASE}/api/blocks`, { headers: authHeaders() });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}
async function reportContent(targetType, board, targetId) {
  if (!getUser()) { alert("로그인 후 신고할 수 있어요."); return; }
  const reason = prompt("신고 사유를 적어주세요 (선택):", "");
  if (reason === null) return;
  try {
    const r = await fetch(`${API_BASE}/api/reports`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ targetType, board: board || null, targetId: targetId != null ? String(targetId) : null, reason }),
    });
    if (!r.ok) throw 0;
    alert("신고가 접수됐어요. 운영진이 검토합니다.");
  } catch { alert("신고에 실패했어요. 잠시 후 다시 시도해주세요."); }
}
async function blockUser(name) {
  if (!getUser()) { alert("로그인 후 차단할 수 있어요."); return false; }
  if (!confirm(`'${name}'님을 차단할까요?\n이 사용자의 글·댓글이 보이지 않게 됩니다.`)) return false;
  try {
    const r = await fetch(`${API_BASE}/api/blocks`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ blocked: name }),
    });
    if (!r.ok) throw 0;
    return true;
  } catch { alert("차단에 실패했어요."); return false; }
}
async function unblockUser(name) {
  try {
    const r = await fetch(`${API_BASE}/api/blocks/${encodeURIComponent(name)}`, { method: "DELETE", headers: authHeaders() });
    return r.ok;
  } catch { return false; }
}

function requireLogin(page) {
  // 공지·공략 읽기는 공개(검색 유입·미리보기), 글쓰기·내부 페이지만 로그인 필요
  const restricted = ["members", "weekly", "notice-write", "tips-write"];
  if (restricted.includes(page) && !getUser()) {
    const base = page.startsWith("notice") ? "notice" : page.startsWith("tips") ? "tips" : page;
    location.href = `./login?redirect=./${base}`;
    return false;
  }
  return true;
}

function logout() {
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("token");
  location.href = "./";
}