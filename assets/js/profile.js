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

  function footerHtml() {
    return `
      <footer class="site-footer">
        <div class="container footer-inner">
          <div class="footer-brand">메이플키우기 라운지 · 스카니아11 서버</div>
          <div class="footer-links">
            <a href="./join" class="footer-link">길드 가입 문의</a>
          </div>
          <div class="footer-copy">&copy; ${new Date().getFullYear()} 메이플키우기 라운지 · 운영 친구패밀리. All rights reserved.</div>
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

  // "2026-06-27" → "6/27"
  function fmtDateShort(d) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ""));
    return m ? `${Number(m[2])}/${Number(m[3])}` : String(d || "");
  }

  // 단순 SVG 라인차트. points:[{label,value}], opts:{id,color,betterIsLow}
  // betterIsLow=true(순위)면 작은 값이 위(=좋음), false(전투력)면 큰 값이 위.
  function buildLineChart(points, opts) {
    const W = 320, H = 132, padX = 30, padTop = 24, padBot = 26;
    const fmt = opts.fmt || ((v) => String(v));
    const vals = points.map(p => p.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }          // 평평한 선 방지
    const span = max - min;
    const innerW = W - padX * 2, innerH = H - padTop - padBot;
    const n = points.length;
    const xAt = (i) => padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const yAt = (v) => {
      const t = opts.betterIsLow ? (v - min) / span : (max - v) / span;
      return padTop + t * innerH;                      // t=0 → 위(=좋음)
    };
    const coords = points.map((p, i) => [xAt(i), yAt(p.value)]);
    const linePts = coords.map(c => `${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(" ");
    const areaPath = `M ${coords[0][0].toFixed(1)} ${(H - padBot).toFixed(1)} `
      + coords.map(c => `L ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" ")
      + ` L ${coords[n - 1][0].toFixed(1)} ${(H - padBot).toFixed(1)} Z`;
    const dots = coords.map((c, i) => {
      const last = i === n - 1;
      return `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${last ? 4 : 2.5}" fill="${last ? opts.color : "#fff"}" stroke="${opts.color}" stroke-width="1.6"/>`;
    }).join("");
    // 값 라벨: 시작점·현재(마지막)점의 실제 수치를 그래프 위에 표시 (점 위쪽, 잘림 방지)
    const labelY = (c) => Math.min(H - padBot - 6, Math.max(padTop - 6, c[1] - 8));
    const valLabels = points.map((p, i) => {
      if (i !== 0 && i !== n - 1) return "";           // 시작·끝만 (중간점 과밀 방지)
      const c = coords[i], last = i === n - 1;
      const anchor = i === 0 && n > 1 ? "start" : (last && n > 1 ? "end" : "middle");
      return `<text x="${c[0].toFixed(1)}" y="${labelY(c).toFixed(1)}" text-anchor="${anchor}" font-size="${last ? 11 : 10}" font-weight="${last ? 800 : 700}" fill="${last ? opts.color : "#94a3b8"}">${escapeHtml(fmt(p.value))}</text>`;
    }).join("");
    const xLabels = `
      <text x="${xAt(0).toFixed(1)}" y="${H - 6}" text-anchor="start" font-size="10" fill="#94a3b8">${escapeHtml(points[0].label)}</text>
      <text x="${xAt(n - 1).toFixed(1)}" y="${H - 6}" text-anchor="end" font-size="10" fill="#94a3b8">${escapeHtml(points[n - 1].label)}</text>`;
    return `
      <svg class="pf-chart-svg" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="성장 추이 그래프">
        <defs>
          <linearGradient id="pfgrad-${opts.id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${opts.color}" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="${opts.color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#pfgrad-${opts.id})"/>
        <polyline points="${linePts}" fill="none" stroke="${opts.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
        ${valLabels}
        ${xLabels}
      </svg>`;
  }

  // 캐릭터 이력을 받아 #pfGrowth 안에 그래프 렌더 (비동기)
  function renderGrowth(name) {
    getServerRankingHistory(name).then(hist => {
      const body = document.querySelector("#pfGrowth .pf-growth-body");
      if (!body) return;
      const rankPts = hist.filter(h => Number(h.serverRank) > 0).map(h => ({ label: fmtDateShort(h.date), value: Number(h.serverRank) }));
      const powerPts = hist.filter(h => Number(h.power) > 0).map(h => ({ label: fmtDateShort(h.date), value: Number(h.power) }));

      if (rankPts.length < 2 && powerPts.length < 2) {
        body.innerHTML = `<div class="pf-growth-empty">📈 아직 추이를 그릴 데이터가 부족해요.<br>매일 자동으로 쌓여서 며칠 뒤면 성장 그래프가 나타나요.</div>`;
        return;
      }

      let html = "";
      if (rankPts.length >= 2) {
        const f = rankPts[0].value, l = rankPts[rankPts.length - 1].value;
        const diff = f - l;   // +면 순위 상승(숫자 작아짐)
        const trend = diff > 0 ? `<span class="pf-trend up">▲ ${formatNumber(diff)}계단 상승</span>`
                    : diff < 0 ? `<span class="pf-trend down">▼ ${formatNumber(-diff)}계단 하락</span>`
                    : `<span class="pf-trend flat">— 변동 없음</span>`;
        html += `
          <div class="pf-chart">
            <div class="pf-chart-head"><span class="pf-chart-title">서버 전투력 순위</span>${trend}</div>
            ${buildLineChart(rankPts, { id: "rank", color: "#2563eb", betterIsLow: true, fmt: (v) => formatNumber(v) + "위" })}
          </div>`;
      }
      if (powerPts.length >= 2) {
        const f = powerPts[0].value, l = powerPts[powerPts.length - 1].value;
        const d = l - f;
        const trend = d > 0 ? `<span class="pf-trend up">▲ ${formatCompactPower(d)} 성장</span>`
                    : d < 0 ? `<span class="pf-trend down">▼ ${formatCompactPower(-d)} 감소</span>`
                    : `<span class="pf-trend flat">— 변동 없음</span>`;
        html += `
          <div class="pf-chart">
            <div class="pf-chart-head"><span class="pf-chart-title">전투력</span>${trend}</div>
            ${buildLineChart(powerPts, { id: "power", color: "#f59e0b", betterIsLow: false, fmt: (v) => formatCompactPower(v) })}
          </div>`;
      }
      html += `<div class="pf-chart-note">하루 2회 자동 수집 · 날짜별 1포인트</div>`;
      body.innerHTML = html;
    });
  }

  // 변경 이력(길드/직업/닉변) — 데이터 있을 때만 섹션 노출
  function renderChangeLog(name) {
    const LABELS = { guild: ["🏰", "길드 이동"], job: ["💼", "직업 변경"], nickname: ["🔤", "닉네임 변경"] };
    fetch(`${API_BASE}/api/change-log?name=${encodeURIComponent(name)}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        if (!Array.isArray(rows) || !rows.length) return;
        const sec = document.getElementById("pfChanges");
        const body = sec && sec.querySelector(".pf-changes-body");
        if (!body) return;
        body.innerHTML = rows.map(r => {
          const [emoji, label] = LABELS[r.field] || ["📝", r.field];
          return `
            <div class="pf-change-row">
              <span class="pf-change-badge">${emoji} ${label}</span>
              <span class="pf-change-diff">${escapeHtml(r.oldValue || "-")} <span class="pf-change-arrow">→</span> <b>${escapeHtml(r.newValue || "-")}</b></span>
              <span class="pf-change-date">${(r.changedAt || "").slice(0, 10)}</span>
            </div>`;
        }).join("");
        sec.style.display = "";
      })
      .catch(() => {});
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

  // 체급별 영입 후크 메시지 (비친구 캐릭터용)
  const recruitTier = pct <= 5 ? "이미 서버 상위권! 친구들 주력 길드에서 TOP30을 같이 노려봐요."
    : pct <= 20 ? "성장 중인 체급이에요 — 친구들에서 같이 더 끌어올려요."
    : pct <= 50 ? "지금부터가 진짜 재미 — 친구들과 함께 쭉 키워요."
    : "막 시작하기 좋은 타이밍! 친구들에서 든든하게 시작해요.";

  main.innerHTML = searchBarHtml(query) + `
    <div class="container pf-wrap">

      <div class="pf-hero ${isFriend ? "pf-hero-friend" : ""}">
        <div class="pf-hero-avatar">${characterAvatarHtml({ name: me.nickname, guild: me.guild })}</div>
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
                <span class="pf-nb-ava">${characterAvatarHtml({ name: n.nickname, guild: n.guild })}</span>
                <span class="pf-nb-name">${escapeHtml(n.nickname || "-")}${isMe ? ` <b>나</b>` : ""}${nFriend && !isMe ? ` <span class="pf-nb-fr">친구패밀리</span>` : ""}</span>
                <span class="pf-nb-power">${escapeHtml(npt)}</span>
              </a>`;
          }).join("")}
        </div>
      </div>

      ${isFriend ? `
        <div class="pf-cta pf-cta-member">
          <div class="pf-cta-title">🛡️ 친구패밀리 길드원이네요!</div>
          <div class="pf-cta-desc">로그인하면 내 성장·포인트·출석을 한눈에 볼 수 있어요.</div>
          <div class="pf-cta-btns">
            <a class="cta-btn" href="./login">로그인</a>
            <button type="button" id="pfShareBtn" class="cta-btn cta-btn-outline">📤 전적 공유</button>
          </div>
        </div>
      ` : `
        <div class="pf-cta pf-cta-recruit">
          <div class="pf-cta-title">스카니아11 ${formatNumber(rank)}위 — 친구들과 함께 더 키워보실래요?</div>
          <div class="pf-cta-desc">${recruitTier}<br>전투력대별 5개 길드 운영 · 내 체급에 맞는 길드 자동 배정 · TOP30 길드 경쟁.</div>
          <div class="pf-cta-btns">
            <a class="cta-btn" href="./join">친구패밀리 길드 가입</a>
            <button type="button" id="pfShareBtn" class="cta-btn cta-btn-outline">📤 전적 공유</button>
          </div>
        </div>
      `}

      <div class="pf-section" id="pfGrowth">
        <div class="pf-section-head">
          <div class="pf-section-title">성장 추이</div>
          <div class="pf-section-sub">일별 자동 수집</div>
        </div>
        <div class="pf-growth-body"><div class="loading-box" style="margin:0;">성장 데이터를 불러오는 중…</div></div>
      </div>

      <div class="pf-section" id="pfChanges" style="display:none;">
        <div class="pf-section-head">
          <div class="pf-section-title">변경 이력</div>
          <div class="pf-section-sub">길드 이동 · 직업 변경 · 닉네임 변경</div>
        </div>
        <div class="pf-changes-body"></div>
      </div>
    </div>
  ` + footerHtml();

  bindSearch();
  renderGrowth(me.nickname);
  renderChangeLog(me.nickname);

  // 전적 공유 (홍보 바이럴) — Web Share 우선, 없으면 링크 복사
  const shareBtn = document.getElementById("pfShareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const url = location.href;
      const text = `${me.nickname}님 · 스카니아11 서버 ${formatNumber(rank)}위(전투력) — 메이플키우기 라운지`;
      try {
        if (navigator.share) {
          await navigator.share({ title: "메이플키우기 라운지 전적", text, url });
        } else {
          await navigator.clipboard.writeText(`${text}\n${url}`);
          const orig = shareBtn.textContent;
          shareBtn.textContent = "✅ 링크 복사됨";
          setTimeout(() => { shareBtn.textContent = orig; }, 2000);
        }
      } catch (e) { /* 사용자 취소 등 무시 */ }
    });
  }
});
