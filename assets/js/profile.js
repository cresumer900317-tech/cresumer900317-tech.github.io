// 개인 전적/프로필 페이지 — 스카니아11 서버 누구든 캐릭명 검색(무가입).
// /api/server-ranking(6800명)에서 찾아 서버순위·전투력·인기도·경쟁권 표시.
document.addEventListener("DOMContentLoaded", async () => {
  renderShell();
  const main = document.querySelector("main");
  const params = new URLSearchParams(location.search);
  const query = (params.get("n") || "").trim();

  const FRIENDS = new Set(["친구들", "친구둘", "친구삼", "친구닷", "친구넷"]);
  const norm = (s) => String(s || "").normalize("NFC").trim();
  const lc = (s) => norm(s).toLowerCase();
  const KAKAO = "https://open.kakao.com/o/gagOlyni";

  function footerHtml() {
    return `
      <footer class="site-footer">
        <div class="container footer-inner">
          <div class="footer-brand">친구패밀리 · 메이플키우기 스카니아 11서버</div>
          <div class="footer-links">
            <a href="${KAKAO}" target="_blank" rel="noopener noreferrer" class="footer-link">카카오톡 가입 문의</a>
          </div>
          <div class="footer-copy">&copy; ${new Date().getFullYear()} 친구패밀리. All rights reserved.</div>
        </div>
      </footer>`;
  }

  function searchBarHtml(val) {
    return `
      <div class="pf-searchbar">
        <div class="container">
          <form id="pfSearchForm" class="pf-search-form">
            <span class="pf-search-icon">🔎</span>
            <input id="pfSearchInput" type="text" placeholder="스카니아11 캐릭터명 검색" value="${escapeHtml(val || "")}" autocomplete="off" />
            <button type="submit" class="cta-btn pf-search-btn">검색</button>
          </form>
        </div>
      </div>`;
  }

  function bindSearch() {
    const f = document.getElementById("pfSearchForm");
    if (!f) return;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = document.getElementById("pfSearchInput").value.trim();
      if (v) location.href = `./profile?n=${encodeURIComponent(v)}`;
    });
  }

  // ── 검색 전(빈 상태) ──
  if (!query) {
    main.innerHTML = searchBarHtml("") + `
      <div class="container">
        <div class="pf-empty">
          <div class="pf-empty-icon">🔎</div>
          <h2 class="pf-empty-title">캐릭터 전적 검색</h2>
          <p class="pf-empty-desc">스카니아11 서버 누구든 캐릭터명을 검색하면<br>서버 순위 · 전투력 · 인기도를 한눈에 볼 수 있어요.</p>
        </div>
      </div>` + footerHtml();
    bindSearch();
    return;
  }

  // ── 로딩 ──
  main.innerHTML = searchBarHtml(query) + `<div class="container"><div class="loading-box" style="margin-top:24px;">전적을 불러오는 중…</div></div>`;
  bindSearch();

  let data;
  try { data = await getServerRanking(); }
  catch (e) {
    main.innerHTML = searchBarHtml(query) + `<div class="container"><div class="error-box" style="margin-top:24px;">데이터를 불러오지 못했습니다.</div></div>` + footerHtml();
    bindSearch();
    return;
  }
  const rows = (Array.isArray(data) ? data : []).slice().sort((a, b) => Number(a.serverRank || 0) - Number(b.serverRank || 0));
  const total = rows.length;

  const idx = rows.findIndex(r => lc(r.nickname) === lc(query));
  if (idx === -1) {
    main.innerHTML = searchBarHtml(query) + `
      <div class="container">
        <div class="pf-empty">
          <div class="pf-empty-icon">😶</div>
          <h2 class="pf-empty-title">"${escapeHtml(query)}" 를 찾지 못했어요</h2>
          <p class="pf-empty-desc">스카니아11 전투력 랭킹 ${formatNumber(total)}위 안에 없거나,<br>캐릭터명이 정확하지 않을 수 있어요. (대소문자·띄어쓰기 확인)</p>
        </div>
      </div>` + footerHtml();
    bindSearch();
    return;
  }

  const me = rows[idx];
  const isFriend = FRIENDS.has(norm(me.guild));
  const rank = Number(me.serverRank || 0);

  // 인기도 서버 순위 계산
  const popSorted = rows.filter(r => Number(r.popularity || 0) > 0).sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0));
  const popRank = popSorted.findIndex(r => lc(r.nickname) === lc(me.nickname)) + 1;

  // 경쟁권: 앞뒤 5명
  const start = Math.max(0, idx - 5);
  const end = Math.min(rows.length, idx + 6);
  const neighbors = rows.slice(start, end);

  // 상위 백분율
  const pct = total > 0 ? Math.max(0.1, (rank / total) * 100) : 100;

  function guildBadge(g) {
    const n = norm(g);
    if (FRIENDS.has(n)) return guildBadgeHtml(n);
    if (!n) return `<span class="guild-badge guild-none">길드 없음</span>`;
    return `<span class="guild-badge" style="background:#edf2f7;color:#4a5568;">${escapeHtml(n)}</span>`;
  }

  const powerText = String(me.powerText || "").trim() || formatCompactPower(me.power);

  main.innerHTML = searchBarHtml(query) + `
    <div class="container pf-wrap">

      <div class="pf-hero ${isFriend ? "pf-hero-friend" : ""}">
        <div class="pf-hero-avatar">${characterAvatarHtml({ name: me.nickname })}</div>
        <div class="pf-hero-main">
          <div class="pf-hero-badges">
            ${guildBadge(me.guild)}
            ${isFriend ? `<span class="pf-friend-tag">🛡️ 친구패밀리</span>` : ""}
          </div>
          <h1 class="pf-hero-name">${escapeHtml(me.nickname || "-")}</h1>
          <div class="pf-hero-sub">${escapeHtml(me.job || "-")} · Lv ${me.level || "-"}</div>
        </div>
        <div class="pf-hero-rank">
          <div class="pf-hero-rank-label">서버 전투력</div>
          <div class="pf-hero-rank-num">${formatNumber(rank)}<span>위</span></div>
          <div class="pf-hero-rank-sub">상위 ${pct < 1 ? pct.toFixed(1) : Math.round(pct)}% · 총 ${formatNumber(total)}명</div>
        </div>
      </div>

      <div class="pf-stat-grid">
        <div class="pf-stat">
          <div class="pf-stat-label">전투력</div>
          <div class="pf-stat-val">${escapeHtml(powerText)}</div>
        </div>
        <div class="pf-stat">
          <div class="pf-stat-label">서버 전투력 순위</div>
          <div class="pf-stat-val accent">${formatNumber(rank)}위</div>
        </div>
        <div class="pf-stat">
          <div class="pf-stat-label">인기도</div>
          <div class="pf-stat-val pink">♥ ${formatNumber(Number(me.popularity || 0))}</div>
        </div>
        <div class="pf-stat">
          <div class="pf-stat-label">서버 인기도 순위</div>
          <div class="pf-stat-val">${popRank ? formatNumber(popRank) + "위" : "-"}</div>
        </div>
      </div>

      <div class="pf-section">
        <div class="pf-section-head">
          <div class="pf-section-title">경쟁권</div>
          <div class="pf-section-sub">바로 위·아래 라이벌들</div>
        </div>
        <div class="pf-neighbors">
          ${neighbors.map(n => {
            const nr = Number(n.serverRank || 0);
            const isMe = lc(n.nickname) === lc(me.nickname);
            const nFriend = FRIENDS.has(norm(n.guild));
            const npt = String(n.powerText || "").trim() || formatCompactPower(n.power);
            return `
              <a class="pf-nb-row ${isMe ? "pf-nb-me" : ""}" href="./profile?n=${encodeURIComponent(n.nickname || "")}">
                <span class="pf-nb-rank">${formatNumber(nr)}</span>
                <span class="pf-nb-ava">${characterAvatarHtml({ name: n.nickname })}</span>
                <span class="pf-nb-name">${escapeHtml(n.nickname || "-")}${isMe ? ` <b>나</b>` : ""}${nFriend && !isMe ? ` <span class="pf-nb-fr">친구패밀리</span>` : ""}</span>
                <span class="pf-nb-power">${escapeHtml(npt)}</span>
              </a>`;
          }).join("")}
        </div>
      </div>

      ${isFriend ? `
        <div class="pf-cta pf-cta-member">
          <div class="pf-cta-title">🛡️ 친구패밀리 길드원이네요!</div>
          <div class="pf-cta-desc">로그인하면 내 성장·공헌·포인트를 한눈에 볼 수 있어요.</div>
          <div class="pf-cta-btns">
            <a class="cta-btn" href="./login">로그인</a>
            <a class="cta-btn cta-btn-outline" href="./ranking">전체 랭킹 보기</a>
          </div>
        </div>
      ` : `
        <div class="pf-cta pf-cta-recruit">
          <div class="pf-cta-title">스카니아11 ${formatNumber(rank)}위 — 친구패밀리와 함께 더 키워보실래요?</div>
          <div class="pf-cta-desc">전투력대별로 5개 길드를 운영해요. 내 체급에 맞는 길드로 자동 배정 · TOP30 길드 경쟁.</div>
          <div class="pf-cta-btns">
            <a class="cta-btn" href="${KAKAO}" target="_blank" rel="noopener noreferrer">길드 가입 문의</a>
            <a class="cta-btn cta-btn-outline" href="./ranking">서버 전체 랭킹</a>
          </div>
        </div>
      `}

      <div class="pf-note">📈 성장 그래프는 일별 데이터가 쌓이는 대로 추가될 예정이에요.</div>
    </div>
  ` + footerHtml();

  bindSearch();
});
