document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  // 스켈레톤 로딩 표시
  document.querySelector("main").innerHTML = `
    <div class="home-hero home-hero-slim" style="padding:28px 0 24px;">
      <div class="container hero-inner">
        <div class="skeleton skeleton-badge"></div>
        <div class="skeleton skeleton-title"></div>
      </div>
    </div>
    <div class="section-block">
      <div class="container">
        <div class="skeleton skeleton-section-title"></div>
        <div class="kpi-grid kpi-grid-overview">
          ${Array(5).fill('<div class="kpi-card"><div class="skeleton skeleton-label"></div><div class="skeleton skeleton-value"></div></div>').join("")}
        </div>
      </div>
    </div>
    <div class="section-block">
      <div class="container">
        <div class="skeleton skeleton-section-title"></div>
        <div class="kpi-grid kpi-grid-dashboard">
          ${Array(7).fill('<div class="kpi-card"><div class="skeleton skeleton-label"></div><div class="skeleton skeleton-value"></div></div>').join("")}
        </div>
      </div>
    </div>
    <div class="section-block">
      <div class="container">
        <div class="skeleton skeleton-section-title"></div>
        <div class="family-board-grid">
          ${Array(5).fill('<div class="guild-board-card"><div class="skeleton skeleton-label"></div><div class="skeleton skeleton-value"></div><div class="skeleton skeleton-label" style="margin-top:8px;"></div></div>').join("")}
        </div>
      </div>
    </div>
  `;

  try {
    const user = getUser();
    const [summary, members, monthlyRes, visitorRes, guildRanksRes, noticesRes, tipsRes, serverTopRes, serverGuildRes, serverStatsRes, serverHealthRes] = await Promise.all([
      getHomeData(),
      getGuildsData(),
      fetch(`${API_BASE}/api/monthly`, { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/visitors/stats`, { cache: "no-store" }).then(r => r.ok ? r.json() : {}),
      fetch(`${API_BASE}/api/guild-ranks`, { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/notices?summary=true`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/tips?summary=true`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/server-ranking?limit=100`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/server-guild-ranking?limit=30`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/server-stats`, { cache: "no-store" }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch(`${API_BASE}/api/guild-health?limit=30`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]);
    const serverTotal = Number((serverStatsRes && serverStatsRes.totalPlayers) || 0);
    // 길드명 → 서버 길드순위 (스카니아11)
    const guildRankMap = {};
    (Array.isArray(guildRanksRes) ? guildRanksRes : []).forEach((g) => { guildRankMap[g.guildName] = g; });
    const visitorStats = visitorRes || {};
    const monthlyRows = Array.isArray(monthlyRes) ? monthlyRes : [];

    const rows = Array.isArray(members) ? members : [];
    const sortedRanking = [...rows].sort((a, b) => Number(b.power||0) - Number(a.power||0));
    const grouped = byGuild(rows);
    const guilds = ["친구들", "친구둘", "친구삼", "친구넷", "친구닷"];
    const FRIENDS = new Set(guilds);
    // 스카니아11 서버 전체 랭킹 TOP10 (서버 포털 메인 콘텐츠)
    const serverTop = (Array.isArray(serverTopRes) ? serverTopRes : [])
      .filter((r) => r && r.nickname)
      .sort((a, b) => Number(a.serverRank || 0) - Number(b.serverRank || 0))
      .slice(0, 100);
    // 스카니아11 서버 전체 길드 랭킹 (최대 30)
    const serverGuildTop = (Array.isArray(serverGuildRes) ? serverGuildRes : [])
      .filter((g) => g && g.guildName)
      .sort((a, b) => Number(a.guildRank || 0) - Number(b.guildRank || 0))
      .slice(0, 30);
    // 길드 건강도 순위 (활력 점수 — ranking.js와 동일 공식. 성장축 가동: 성장30·활동25·깊이25·균형20)
    const clampH = (v) => Math.max(0, Math.min(100, v));
    const healthTop = (Array.isArray(serverHealthRes) ? serverHealthRes : [])
      .filter((g) => g && g.guildName && Number(g.memberSampled || 0) >= 3)
      .map((g) => {
        const depth = Number(g.medianPower || 0) > 0 ? clampH(50 + 12.5 * Math.log10(Number(g.medianPower) / 1e12)) : 0;
        const bal = g.effContributors != null ? clampH((Number(g.effContributors) - 1) / 9 * 100) : null;
        const act = g.activeRatio != null ? Number(g.activeRatio) * 100 : null;
        const grow = g.growthRatio != null ? Number(g.growthRatio) * 100 : null;
        const parts = (grow != null && bal != null && act != null)
          ? [[grow, 0.30], [act, 0.25], [depth, 0.25], [bal, 0.20]]
          : [[depth, 0.42], [act, 0.33], [bal, 0.25]].filter((p) => p[0] != null);
        const wsum = parts.reduce((a, [, w]) => a + w, 0) || 1;
        const score = Math.round(parts.reduce((a, [v, w]) => a + v * w, 0) / wsum);
        return { name: g.guildName, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    const avgPower = rows.length
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.power || 0), 0) / rows.length)
      : 0;
    const totalMonthlyGrowth = monthlyRows.reduce((sum, r) => sum + Number(r.monthlyDiff || 0), 0);

    const growthTop = [...rows]
      .filter((x) => Number(x.weeklyDiff || 0) > 0)
      .sort((a, b) => Number(b.weeklyDiff || 0) - Number(a.weeklyDiff || 0))
      .slice(0, 5);

    const riseTop = [...rows]
      .filter((x) => Number(x.serverRankDiff || 0) > 0)
      .sort((a, b) => Number(b.serverRankDiff || 0) - Number(a.serverRankDiff || 0))
      .slice(0, 5);

    const lastUpdate = rows.length && rows[0].capturedAt
      ? new Date(rows[0].capturedAt).toLocaleString("ko-KR", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        })
      : "-";

    const memberCount = summary.member_count || rows.length;
    const guildCount = summary.guild_count || 5;
    const top500Count = rows.filter((r) => Number(r.serverRank || 0) > 0 && Number(r.serverRank) <= 500).length;
    const top500Rate = memberCount > 0 ? ((top500Count / memberCount) * 100).toFixed(1) : "0.0";

    // 영입 후크: 스카니아11 서버에서의 친구패밀리 지배력
    const membersWithRank = rows.filter((r) => Number(r.serverRank || 0) > 0);
    const top100Count = membersWithRank.filter((r) => Number(r.serverRank) <= 100).length;
    const bestServerRank = membersWithRank.length ? Math.min(...membersWithRank.map((r) => Number(r.serverRank))) : 0;
    const guildServerRanks = Object.values(guildRankMap).map((g) => Number(g.serverRank || 0)).filter((n) => n > 0);
    const bestGuildServerRank = guildServerRanks.length ? Math.min(...guildServerRanks) : 0;

    // 커뮤니티 통합 피드 (공지 + 공략, 최신순)
    const noticeRows = Array.isArray(noticesRes) ? noticesRes : [];
    const tipsRows = Array.isArray(tipsRes) ? tipsRes : [];
    const communityFeed = [
      ...noticeRows.map((p) => ({ ...p, board: "공지", href: `./notice-view?id=${p.id}`, color: "#f59e0b" })),
      ...tipsRows.map((p) => ({ ...p, board: "공략", href: `./tips-view?id=${p.id}`, color: "#22c55e" })),
    ].filter((p) => p.created_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 7);
    // 사이드바 최신 공지 (고정글 우선)
    const recentNotices = [...noticeRows]
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 4);
    const feedDate = (iso) => {
      if (!iso) return "";
      const d = new Date(iso), now = new Date();
      const diffH = (now - d) / 36e5;
      if (diffH < 1) return "방금";
      if (diffH < 24) return `${Math.floor(diffH)}시간 전`;
      if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}일 전`;
      return d.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
    };

    const visitorHtml = (() => {
      const online = visitorStats.online || 0;
      const list = visitorStats.online_list || [];
      const me = user ? user.character_name : null;
      if (online === 0) return `<span class="live-bar-text">함께 보고 있는 멤버들이 있어요</span>`;
      if (me && list.some(u => u.name === me)) {
        const others = online - 1;
        return `<span class="live-bar-text"><strong>${escapeHtml(me)}</strong>님${others > 0 ? ` 외 ${others}명` : ""}이 함께 보고 있어요</span>`;
      }
      return `<span class="live-bar-text">지금 <strong>${online}명</strong>이 함께 보고 있어요</span>`;
    })();

    // 이번 주 변화 — 로그인(길드원)은 서버랭킹보다 위, 비로그인(방문자)은 하단
    const changesHtml = (growthTop.length || riseTop.length) ? `
      <div class="section-block">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="section-title">이번 주 변화</div>
              <div class="section-sub">성장량 · 서버 순위 상승 TOP 5</div>
            </div>
            <a class="section-link" href="./weekly">월간성장 보기 →</a>
          </div>
          <div class="summary-split">
            <div class="summary-panel">
              <div class="sub-head">성장 TOP 5</div>
              <div class="mini-card-list">
                ${growthTop.map((item, i) => `
                  <div class="mini-summary-card">
                    <span class="mini-summary-rank">${i + 1}</span>
                    ${characterAvatarHtml(item)}
                    <div class="mini-summary-main">
                      <div class="mini-summary-name">${escapeHtml(item.name || "-")}</div>
                      <div class="mini-summary-sub">
                        ${guildBadgeHtml(item.guild)}
                        <span>성장률 ${escapeHtml(formatRate(item.growthRate || 0))}</span>
                      </div>
                    </div>
                    <div class="mini-summary-side">${metricHtml(item.weeklyDiff || 0)}</div>
                  </div>
                `).join("")}
              </div>
            </div>
            <div class="summary-panel">
              <div class="sub-head">서버 순위 상승 TOP 5</div>
              <div class="mini-card-list">
                ${riseTop.map((item, i) => `
                  <div class="mini-summary-card">
                    <span class="mini-summary-rank">${i + 1}</span>
                    ${characterAvatarHtml(item)}
                    <div class="mini-summary-main">
                      <div class="mini-summary-name">${escapeHtml(item.name || "-")}</div>
                      <div class="mini-summary-sub">
                        ${guildBadgeHtml(item.guild)}
                        <span>현재 ${item.serverRank ? formatNumber(item.serverRank) + "위" : "-"}</span>
                      </div>
                    </div>
                    <div class="mini-summary-side">${rankTrendHtml(item)}</div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
      ` : "";

    document.querySelector("main").innerHTML = `
      ${user ? `
      <div class="home-hero home-hero-slim">
        <div class="container hero-inner">
          <div class="hero-slim-row">
            <div>
              <div class="hero-badge">
                <span class="hero-dot"></span>
                메이플키우기 · 스카니아 11서버
              </div>
              <h1 class="hero-title-slim">반갑습니다, <span class="accent">${escapeHtml(user.character_name)}</span>님</h1>
              <a class="hero-myprofile-link" href="./profile?n=${encodeURIComponent(user.character_name)}">👤 내 전적 보기 →</a>
            </div>
            <div class="hero-slim-stats">
              <span class="hero-slim-stat">${formatNumber(memberCount)}명 활동 중</span>
            </div>
          </div>
        </div>
      </div>
      ${recentNotices.length ? `
      <div class="container" style="margin-top:14px;">
        <a href="./notice-view?id=${recentNotices[0].id}" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;text-decoration:none;">
          <span style="flex-shrink:0;font-size:0.72rem;font-weight:700;color:#b45309;background:#fef3c7;padding:3px 10px;border-radius:999px;">📢 공지</span>
          <span style="flex:1;min-width:0;font-size:0.88rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(recentNotices[0].title || "")}</span>
          <span style="flex-shrink:0;font-size:0.78rem;color:var(--text-soft);">보기 →</span>
        </a>
      </div>` : ""}
      ` : `
      <div class="home-hero home-hero-portal">
        <div class="container hero-inner">
          <div class="hero-portal-row">
            <div class="hero-portal-main">
              <div class="hero-badge">
                <span class="hero-dot"></span>
                메이플키우기 · 스카니아 11서버
              </div>
              <h1 class="hero-title">메이플키우기 <span class="accent">라운지</span></h1>
              <p class="hero-desc">전적 · 서버랭킹 · 커뮤니티</p>
              <form class="hero-search" onsubmit="event.preventDefault(); var v=this.q.value.trim(); if(v) location.href='./profile?n='+encodeURIComponent(v);">
                <span class="hero-search-icon">🔎</span>
                <input class="hero-search-input" name="q" type="text" placeholder="캐릭터명 검색" autocomplete="off" aria-label="스카니아11 캐릭터명 검색" />
                <button class="hero-search-btn" type="submit">전적검색</button>
              </form>
              <div class="hero-proof-row">
                <span class="hero-proof hero-proof-guild">🛡️ 운영 길드 <b>친구들</b></span>
                ${serverTotal ? `<span class="hero-proof">👥 스카니아11 전체 <b>${formatNumber(serverTotal)}명</b></span>` : ""}
                <span class="hero-proof">📊 전적 · 랭킹 · 커뮤니티</span>
              </div>
              <div class="hero-cta-row">
                <a class="cta-btn" href="./ranking">서버 전체 랭킹</a>
                <a class="cta-btn cta-btn-outline" href="./join">친구패밀리 길드 가입</a>
                <a class="cta-btn cta-btn-outline" href="https://apps.apple.com/kr/app/id6782071379" target="_blank" rel="noopener noreferrer">📱 앱 iOS</a>
                <a class="cta-btn cta-btn-outline" href="https://play.google.com/store/apps/details?id=com.jisoar.chingufamily" target="_blank" rel="noopener noreferrer">🤖 앱 Android</a>
              </div>
            </div>
            <form id="heroLoginForm" class="hero-login-card">
              <div class="hero-login-title">로그인 / 가입</div>
              <div class="hero-login-desc">스카니아11 캐릭터면 가입하고 출석·포인트·커뮤니티를 즐겨보세요.</div>
              <input id="heroLoginName" class="hero-login-input" type="text" placeholder="캐릭터명" autocomplete="username" />
              <input id="heroLoginPw" class="hero-login-input" type="password" placeholder="비밀번호" autocomplete="current-password" />
              <button type="submit" class="cta-btn hero-login-btn">로그인</button>
              <div id="heroLoginErr" class="hero-login-err"></div>
              <div class="hero-login-sub">계정이 없으신가요? <a href="./login?tab=register">회원가입</a></div>
            </form>
          </div>
        </div>
      </div>
      `}

      <div class="live-bar">
        <div class="container live-bar-inner">
          <div class="live-bar-left">
            <span class="live-dot"></span>
            ${visitorHtml}
            <span class="live-bar-divider">·</span>
            <span class="live-bar-extra">누적 ${formatNumber(visitorStats.total||0)}명 방문</span>
          </div>
          <span class="live-bar-update">마지막 업데이트: ${lastUpdate}</span>
        </div>
      </div>

      ${user ? changesHtml : ""}

      ${(serverTop.length || serverGuildTop.length || healthTop.length) ? `
      <div class="section-block">
        <div class="container">
          <div class="rank-2col rank-3">
            ${serverTop.length ? `
            <div class="rank-col">
              <div class="section-head">
                <div>
                  <div class="section-title">서버 전체 랭킹</div>
                  <div class="section-sub">전투력 TOP 100</div>
                </div>
                <a class="section-link" href="./ranking">전체 랭킹 상세보기 →</a>
              </div>
              <div class="mini-card-list rank-scroll">
                ${serverTop.map((item, i) => {
                  const nm = item.nickname || "";
                  const gn = (item.guild || "").normalize("NFC").trim();
                  const hasGuild = gn && gn !== "길드 없음";
                  const guildChip = hasGuild
                    ? (FRIENDS.has(gn) ? guildBadgeHtml(gn) : `<span class="guild-badge guild-badge-neutral">${escapeHtml(gn)}</span>`)
                    : "";
                  const pop = Number(item.popularity || 0);
                  return `
                    <a class="mini-summary-card" href="./profile?n=${encodeURIComponent(nm)}">
                      <span class="mini-summary-rank">${i + 1}</span>
                      ${characterAvatarHtml({ name: nm, guild: gn })}
                      <div class="mini-summary-main">
                        <div class="mini-summary-name">${escapeHtml(nm)} ${guildChip}</div>
                        <div class="mini-summary-sub">
                          <span>${item.job ? escapeHtml(item.job) + " · " : ""}Lv ${item.level || "-"}${pop ? " · ♥ " + formatNumber(pop) : ""}</span>
                        </div>
                      </div>
                      <div class="mini-summary-side">${escapeHtml(getPowerDisplay(item))}</div>
                    </a>`;
                }).join("")}
              </div>
            </div>` : ""}
            ${serverGuildTop.length ? `
            <div class="rank-col">
              <div class="section-head">
                <div>
                  <div class="section-title">길드 랭킹</div>
                  <div class="section-sub">스카니아11 서버 길드 TOP ${serverGuildTop.length}</div>
                </div>
                <a class="section-link" href="./ranking">전체 랭킹 상세보기 →</a>
              </div>
              <div class="guild-rank-list rank-scroll">
                ${serverGuildTop.map((g) => {
                  const isFriend = FRIENDS.has(normalizeGuildName(g.guildName || ""));
                  return `
                    <div class="guild-rank-row${isFriend ? " guild-rank-friend" : ""}">
                      <span class="guild-rank-no">${g.guildRank || "-"}</span>
                      <span class="guild-rank-name">${escapeHtml(g.guildName || "-")}</span>
                      <span class="guild-rank-meta">Lv.${g.level || "-"} · ${formatNumber(g.members || 0)}명</span>
                      <span class="guild-rank-power">${formatCompactPower(g.power || 0)}</span>
                    </div>`;
                }).join("")}
              </div>
            </div>` : ""}
            ${healthTop.length ? `
            <div class="rank-col">
              <div class="section-head">
                <div>
                  <div class="section-title">길드 건강도</div>
                  <div class="section-sub">활력 점수 TOP ${healthTop.length}</div>
                </div>
                <a class="section-link" href="./ranking">건강도 상세보기 →</a>
              </div>
              <div class="guild-rank-list rank-scroll">
                ${healthTop.map((g, i) => {
                  const isFriend = FRIENDS.has(normalizeGuildName(g.name || ""));
                  const col = g.score >= 70 ? "#16a34a" : g.score >= 55 ? "#f59e0b" : g.score >= 40 ? "#fb923c" : "#94a3b8";
                  return `
                    <div class="guild-rank-row${isFriend ? " guild-rank-friend" : ""}">
                      <span class="guild-rank-no">${i + 1}</span>
                      <span class="guild-rank-name">${escapeHtml(g.name || "-")}</span>
                      <span class="guild-rank-power" style="color:${col};">${g.score}</span>
                    </div>`;
                }).join("")}
              </div>
            </div>` : ""}
          </div>
        </div>
      </div>
      ` : ""}

      <div class="section-block">
        <div class="container">
          <div class="home-portal">
            <div class="portal-main">
              <div class="section-head">
                <div>
                  <div class="section-title">커뮤니티</div>
                  <div class="section-sub">공지 · 공략 최근 글</div>
                </div>
                <a class="section-link" href="./tips">공략 게시판 →</a>
              </div>
              <div class="feed-list">
                ${communityFeed.length ? communityFeed.map((p) => `
                  <a class="feed-row" href="${p.href}">
                    <span class="feed-badge" style="color:${p.color};background:${p.color}18;">${p.board}</span>
                    <span class="feed-ttl">${escapeHtml(p.title || "(제목 없음)")}</span>
                    ${Number(p.likes) > 0 ? `<span class="feed-likes">❤️ ${p.likes}</span>` : ""}
                    <span class="feed-date">${feedDate(p.created_at)}</span>
                  </a>
                `).join("") : `
                  <div class="feed-empty">
                    <div class="feed-empty-icon">💬</div>
                    <div>아직 글이 없어요. 첫 글을 남기고 <b>포인트</b>도 받아가세요!</div>
                    <a class="feed-empty-btn" href="./tips-write">✏️ 글쓰기</a>
                  </div>`}
              </div>
            </div>
            <aside class="portal-aside">
              ${(() => {
                const loginCard = `
              <div class="side-card side-login">
                <div class="side-login-title">친구패밀리에 함께해요</div>
                <p class="side-login-desc">로그인하면 내 순위·성장·포인트를 한눈에.</p>
                <a class="cta-btn side-login-btn" href="./login">로그인</a>
                <a class="side-login-sub" href="./login?tab=register">회원가입 →</a>
              </div>`;
                const appCard = `
              <div class="side-card side-app">
                <div class="side-card-title">📱 길드라운지 앱</div>
                <p class="side-login-desc">일정 알림 푸시·랭킹·공략을 앱에서. 콘텐츠 시작/마감 알림을 놓치지 마세요.</p>
                <a class="cta-btn side-login-btn" href="https://apps.apple.com/kr/app/id6782071379" target="_blank" rel="noopener noreferrer">App Store 다운로드</a>
                <a class="cta-btn side-login-btn cta-btn-outline" style="margin-top:8px;" href="https://play.google.com/store/apps/details?id=com.jisoar.chingufamily" target="_blank" rel="noopener noreferrer">Google Play 다운로드</a>
              </div>`;
                const quickCard = `
              <div class="side-card">
                <div class="side-card-title">빠른 메뉴</div>
                <div class="quick-menu">
                  <a class="quick-link" href="./ranking"><span class="quick-emoji">🏆</span>서버 전체 랭킹</a>
                  <a class="quick-link" href="./tips"><span class="quick-emoji">📖</span>공략 게시판</a>
                  <a class="quick-link" href="./points"><span class="quick-emoji">🔥</span>포인트</a>
                  <a class="quick-link" href="./members"><span class="quick-emoji">👥</span>길드원</a>
                </div>
              </div>`;
                const noticeCard = `
              <div class="side-card">
                <div class="side-card-title">📢 최신 공지 <a class="side-card-more" href="./notice">더보기</a></div>
                ${recentNotices.length ? `
                <div class="side-notice-list">
                  ${recentNotices.map((n) => `
                    <a class="side-notice-row" href="./notice-view?id=${n.id}">
                      ${n.is_pinned ? `<span class="side-pin">📌</span>` : ""}
                      <span class="side-notice-ttl">${escapeHtml(n.title || "")}</span>
                      <span class="side-notice-date">${feedDate(n.created_at)}</span>
                    </a>
                  `).join("")}
                </div>` : `<div class="side-empty">등록된 공지가 없어요</div>`}
              </div>`;
                // 로그인 = 길드원: 공지 우선. 비로그인 = 방문자: 가입/앱 전환 우선.
                return user
                  ? noticeCard + quickCard + appCard
                  : loginCard + appCard + quickCard + noticeCard;
              })()}
            </aside>
          </div>
        </div>
      </div>


      ${"" /* 홈에서 제거(2026-06-28): 길드별 현황(친구패밀리 5길드)·TOP30 배치 현황. 스카니아11 서버 길드 랭킹은 백엔드 서버길드 크롤 추가 후 신설 예정 */}

      ${user ? "" : changesHtml}

      <footer class="site-footer">
        <div class="container footer-inner">
          <div class="footer-brand">메이플키우기 라운지 · 스카니아11 서버</div>
          <div class="footer-links">
            <a href="./profile" class="footer-link">전적검색</a>
            <a href="./ranking" class="footer-link">서버 랭킹</a>
            <a href="https://apps.apple.com/kr/app/id6782071379" target="_blank" rel="noopener noreferrer" class="footer-link">앱 (iOS)</a>
            <a href="https://play.google.com/store/apps/details?id=com.jisoar.chingufamily" target="_blank" rel="noopener noreferrer" class="footer-link">앱 (Android)</a>
            <a href="./join" class="footer-link">친구패밀리 가입 문의</a>
          </div>
          <div class="footer-copy">&copy; ${new Date().getFullYear()} 메이플키우기 라운지 · 운영 친구패밀리. All rights reserved.</div>
        </div>
      </footer>

    `;

    // 히어로 로그인 (로그아웃 상태일 때만 폼 존재)
    const heroLoginForm = document.getElementById("heroLoginForm");
    if (heroLoginForm) {
      heroLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("heroLoginName").value.trim();
        const pw = document.getElementById("heroLoginPw").value;
        const errEl = document.getElementById("heroLoginErr");
        errEl.textContent = "";
        if (!name || !pw) { errEl.textContent = "캐릭터명과 비밀번호를 입력해주세요."; return; }
        const btn = heroLoginForm.querySelector(".hero-login-btn");
        btn.disabled = true; btn.textContent = "로그인 중...";
        try {
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ character_name: name, password: pw }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || "로그인에 실패했습니다.");
          sessionStorage.setItem("user", JSON.stringify(data.user));
          if (data.token) sessionStorage.setItem("token", data.token);
          location.reload();
        } catch (err) {
          errEl.textContent = err.message || "로그인에 실패했습니다.";
          btn.disabled = false; btn.textContent = "로그인";
        }
      });
    }

  } catch (error) {
    console.error(error);
    renderError(null, error);
  }
});
