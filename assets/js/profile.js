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

  // 차트별 메타 (호버 툴팁용) — id → 렌더 정보
  const chartMeta = {};
  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  // 깔끔한 눈금값 계산 (nice numbers)
  function niceTicks(min, max, count) {
    const raw = (max - min) / (count || 3);
    if (!(raw > 0)) return [];
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = mag * (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10);
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
    return out;
  }

  // 모노톤 큐빅 보간 (오버슈트 없는 부드러운 곡선)
  function monotonePath(coords) {
    const n = coords.length;
    if (n < 3) return "M " + coords.map(c => `${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" L ");
    const xs = coords.map(c => c[0]), ys = coords.map(c => c[1]);
    const dx = [], dy = [], m = [];
    for (let i = 0; i < n - 1; i++) { dx.push(xs[i+1]-xs[i]); dy.push(ys[i+1]-ys[i]); m.push(dy[i]/dx[i]); }
    const t = [m[0]];
    for (let i = 1; i < n - 1; i++) {
      t.push(m[i-1] * m[i] <= 0 ? 0 : (m[i-1] + m[i]) / 2);
    }
    t.push(m[n-2]);
    for (let i = 0; i < n - 1; i++) {   // Fritsch–Carlson 제한
      if (m[i] === 0) { t[i] = 0; t[i+1] = 0; continue; }
      const a = t[i]/m[i], b = t[i+1]/m[i], h = Math.hypot(a, b);
      if (h > 3) { t[i] = 3*m[i]*a/h; t[i+1] = 3*m[i]*b/h; }
    }
    let d = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const h3 = dx[i] / 3;
      d += ` C ${(xs[i]+h3).toFixed(1)} ${(ys[i]+t[i]*h3).toFixed(1)}, ${(xs[i+1]-h3).toFixed(1)} ${(ys[i+1]-t[i+1]*h3).toFixed(1)}, ${xs[i+1].toFixed(1)} ${ys[i+1].toFixed(1)}`;
    }
    return d;
  }

  // 프리미엄 SVG 라인차트. points:[{label,date,value,extra}], opts:{id,color,betterIsLow,fmt,fmtTick,kind}
  function buildLineChart(points, opts) {
    const W = 340, H = 150, padL = 48, padR = 14, padTop = 26, padBot = 28;
    const fmt = opts.fmt || ((v) => String(v));
    const fmtTick = opts.fmtTick || fmt;
    const vals = points.map(p => p.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.06;                    // 위아래 살짝 여백
    min -= pad; max += pad;
    const span = max - min;
    const innerW = W - padL - padR, innerH = H - padTop - padBot;
    const n = points.length;
    const xAt = (i) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const yAt = (v) => {
      const t = opts.betterIsLow ? (v - min) / span : (max - v) / span;
      return padTop + t * innerH;
    };
    const coords = points.map((p, i) => [xAt(i), yAt(p.value)]);
    chartMeta[opts.id] = { coords, points, fmt, betterIsLow: !!opts.betterIsLow, color: opts.color, W, H, padL, padR, kind: opts.kind };

    const lineD = monotonePath(coords);
    const areaD = lineD + ` L ${coords[n-1][0].toFixed(1)} ${(H-padBot).toFixed(1)} L ${coords[0][0].toFixed(1)} ${(H-padBot).toFixed(1)} Z`;

    // Y 그리드 + 눈금 (헤어라인 실선, 차분한 회색)
    const ticks = niceTicks(min + pad, max - pad, 3).map((v) => {
      const y = yAt(v).toFixed(1);
      return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#eef2f7" stroke-width="1"/>
        <text x="${padL - 6}" y="${Number(y) + 3}" text-anchor="end" font-size="9" fill="#94a3b8">${escapeHtml(fmtTick(v))}</text>`;
    }).join("");

    // 점: 20개 초과 시 마지막만 (일별 값은 크로스헤어 툴팁 담당)
    const dots = coords.map((c, i) => {
      const last = i === n - 1;
      if (!last && n > 20) return "";
      if (!last) return `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="1.7" fill="#fff" stroke="${opts.color}" stroke-width="1.2"/>`;
      return `<circle class="pf-last-halo" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="8" fill="${opts.color}"/>
        <circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="4" fill="${opts.color}" stroke="#fff" stroke-width="2"/>`;
    }).join("");

    // 최고 기록 마커 (시작/끝 제외 중간에 있을 때만)
    let bestMark = "";
    const bestIdx = vals.reduce((bi, v, i) => (opts.betterIsLow ? v < vals[bi] : v > vals[bi]) ? i : bi, 0);
    if (bestIdx !== 0 && bestIdx !== n - 1) {
      const [bx, by] = coords[bestIdx];
      const anchor = bx > W - 90 ? "end" : (bx < padL + 40 ? "start" : "middle");
      bestMark = `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="2.6" fill="${opts.color}" stroke="#fff" stroke-width="1.4"/>
        <text x="${bx.toFixed(1)}" y="${Math.max(10, by - 8).toFixed(1)}" text-anchor="${anchor}" font-size="9" font-weight="700" fill="#64748b">★ 최고 ${escapeHtml(fmt(points[bestIdx].value))}</text>`;
    }

    // 끝값 라벨 (텍스트는 잉크색 — 정체성은 점이 표현)
    const lc = coords[n - 1];
    const endLabel = `<text x="${Math.min(W - padR, lc[0]).toFixed(1)}" y="${Math.max(padTop - 8, lc[1] - 10).toFixed(1)}" text-anchor="end" font-size="11" font-weight="800" fill="#334155">${escapeHtml(fmt(points[n-1].value))}</text>`;

    // X축 날짜 (처음·중간·끝)
    const midI = Math.floor((n - 1) / 2);
    const xLabels = [[0, "start"], [midI, "middle"], [n - 1, "end"]]
      .filter(([i], idx, arr) => arr.findIndex(a => a[0] === i) === idx)
      .map(([i, a]) => `<text x="${xAt(i).toFixed(1)}" y="${H - 6}" text-anchor="${a}" font-size="9" fill="#94a3b8">${escapeHtml(points[i].label)}</text>`).join("");

    return `
      <svg class="pf-chart-svg" data-chart="${opts.id}" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="성장 추이 그래프" style="touch-action:pan-y;">
        <defs>
          <linearGradient id="pfgrad-${opts.id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${opts.color}" stop-opacity="0.14"/>
            <stop offset="100%" stop-color="${opts.color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${ticks}
        <path class="pf-anim-area" d="${areaD}" fill="url(#pfgrad-${opts.id})"/>
        <path class="pf-anim-line" pathLength="1" d="${lineD}" fill="none" stroke="${opts.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
        ${bestMark}
        <line class="pf-cursor-line" x1="0" y1="${padTop - 4}" x2="0" y2="${H - padBot}" stroke="#cbd5e1" stroke-width="1" visibility="hidden"/>
        <circle class="pf-cursor-dot" r="4.2" fill="${opts.color}" stroke="#fff" stroke-width="2" visibility="hidden"/>
        ${endLabel}
        ${xLabels}
      </svg>`;
  }

  // 크로스헤어 + 툴팁: 날짜(요일)·값·전일 대비·정확한 수치·교차 지표
  function attachChartHover(scope) {
    scope.querySelectorAll(".pf-chart-svg").forEach((svg) => {
      const meta = chartMeta[svg.dataset.chart];
      if (!meta || meta.points.length < 2) return;
      const chartEl = svg.closest(".pf-chart");
      const tip = chartEl && chartEl.querySelector(".pf-tooltip");
      if (!tip) return;
      const cursorLine = svg.querySelector(".pf-cursor-line");
      const cursorDot = svg.querySelector(".pf-cursor-dot");

      const show = (ev) => {
        const r = svg.getBoundingClientRect();
        const xView = (ev.clientX - r.left) / r.width * meta.W;
        const n = meta.points.length;
        const t = (xView - meta.padL) / (meta.W - meta.padL - meta.padR);
        const i = Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
        const [cx, cy] = meta.coords[i];
        const p = meta.points[i];

        cursorLine.setAttribute("x1", cx); cursorLine.setAttribute("x2", cx);
        cursorLine.setAttribute("visibility", "visible");
        cursorDot.setAttribute("cx", cx); cursorDot.setAttribute("cy", cy);
        cursorDot.setAttribute("visibility", "visible");

        let deltaHtml = "";
        if (i > 0) {
          const d = p.value - meta.points[i - 1].value;
          if (d !== 0) {
            const good = meta.betterIsLow ? d < 0 : d > 0;
            const num = meta.kind === "rank" ? Math.abs(d).toLocaleString() : formatCompactPower(Math.abs(d));
            deltaHtml = `<span class="pf-tip-delta ${good ? "up" : "down"}">${good ? "▲" : "▼"} ${num}</span>`;
          } else {
            deltaHtml = `<span class="pf-tip-delta flat">— 변동 없음</span>`;
          }
        }
        const wd = p.date ? ` (${WEEKDAYS[new Date(p.date).getDay()]})` : "";
        const exact = meta.kind === "power"
          ? `<div class="pf-tip-exact">${Number(p.value).toLocaleString("ko-KR")}</div>` : "";
        const extra = p.extra
          ? `<div class="pf-tip-sub">${meta.kind === "rank" ? "전투력 " + formatCompactPower(p.extra) : "서버 " + Number(p.extra).toLocaleString() + "위"}</div>` : "";
        tip.innerHTML = `
          <div class="pf-tip-date">${escapeHtml(p.label)}${wd}</div>
          <div class="pf-tip-main">${escapeHtml(meta.fmt(p.value))} ${deltaHtml}</div>
          ${exact}${extra}`;

        const cRect = chartEl.getBoundingClientRect();
        const px = cx / meta.W * r.width + (r.left - cRect.left);
        const py = cy / meta.H * r.height + (r.top - cRect.top);
        tip.style.display = "block";
        const tw = tip.offsetWidth;
        tip.style.left = Math.max(4, Math.min(chartEl.clientWidth - tw - 4, px - tw / 2)) + "px";
        tip.style.top = Math.max(2, py - tip.offsetHeight - 14) + "px";
      };
      const hide = () => {
        tip.style.display = "none";
        cursorLine.setAttribute("visibility", "hidden");
        cursorDot.setAttribute("visibility", "hidden");
      };
      svg.addEventListener("pointermove", show);
      svg.addEventListener("pointerdown", show);
      svg.addEventListener("pointerleave", hide);
    });
  }

  // 캐릭터 이력을 받아 #pfGrowth 안에 그래프 렌더 (기간 필터 + 통계 칩 + 차트 2종)
  function renderGrowth(name) {
    getServerRankingHistory(name).then(hist => {
      const body = document.querySelector("#pfGrowth .pf-growth-body");
      if (!body) return;
      const all = (hist || []).filter(h => h && h.date);
      let range = 0;   // 0 = 전체

      const render = () => {
        const rows = range ? all.slice(-range) : all;
        const rankPts = rows.filter(h => Number(h.serverRank) > 0)
          .map(h => ({ label: fmtDateShort(h.date), date: h.date, value: Number(h.serverRank), extra: Number(h.power) || 0 }));
        const powerPts = rows.filter(h => Number(h.power) > 0)
          .map(h => ({ label: fmtDateShort(h.date), date: h.date, value: Number(h.power), extra: Number(h.serverRank) || 0 }));

        const tabs = `
          <div class="pf-range-row">
            <div class="mini-tabs">
              ${[[7, "7일"], [30, "30일"], [0, "전체"]].map(([d, l]) =>
                `<button class="mini-tab${range === d ? " active" : ""}" data-range="${d}">${l}</button>`).join("")}
            </div>
            <span class="pf-chart-note-inline">그래프를 짚으면 날짜별 수치가 보여요</span>
          </div>`;

        if (rankPts.length < 2 && powerPts.length < 2) {
          body.innerHTML = tabs + `<div class="pf-growth-empty">📈 이 기간에는 추이를 그릴 데이터가 부족해요.<br>매일 자동으로 쌓여서 며칠 뒤면 성장 그래프가 나타나요.</div>`;
          bindTabs();
          return;
        }

        // 통계 칩
        const chips = [];
        if (rankPts.length >= 2) {
          const diff = rankPts[0].value - rankPts[rankPts.length - 1].value;
          chips.push(`<div class="pf-chip"><span class="pf-chip-k">기간 순위</span><span class="pf-chip-v ${diff > 0 ? "up" : diff < 0 ? "down" : ""}">${diff > 0 ? "▲ " + formatNumber(diff) : diff < 0 ? "▼ " + formatNumber(-diff) : "—"}</span></div>`);
          chips.push(`<div class="pf-chip"><span class="pf-chip-k">최고 순위</span><span class="pf-chip-v">${formatNumber(Math.min(...rankPts.map(p => p.value)))}위</span></div>`);
        }
        if (powerPts.length >= 2) {
          const d = powerPts[powerPts.length - 1].value - powerPts[0].value;
          const days = Math.max(1, powerPts.length - 1);
          chips.push(`<div class="pf-chip"><span class="pf-chip-k">전투력 성장</span><span class="pf-chip-v ${d > 0 ? "up" : d < 0 ? "down" : ""}">${d >= 0 ? "+" : "-"}${formatCompactPower(Math.abs(d))}</span></div>`);
          chips.push(`<div class="pf-chip"><span class="pf-chip-k">일평균</span><span class="pf-chip-v">${d >= 0 ? "+" : "-"}${formatCompactPower(Math.abs(Math.round(d / days)))}</span></div>`);
        }

        let html = tabs + `<div class="pf-stat-chips">${chips.join("")}</div>`;

        if (rankPts.length >= 2) {
          const f = rankPts[0].value, l = rankPts[rankPts.length - 1].value;
          const diff = f - l;
          const trend = diff > 0 ? `<span class="pf-trend up">▲ ${formatNumber(diff)}계단 상승</span>`
                      : diff < 0 ? `<span class="pf-trend down">▼ ${formatNumber(-diff)}계단 하락</span>`
                      : `<span class="pf-trend flat">— 변동 없음</span>`;
          html += `
            <div class="pf-chart">
              <div class="pf-chart-head"><span class="pf-chart-title">서버 전투력 순위</span>${trend}</div>
              ${buildLineChart(rankPts, { id: "rank", kind: "rank", color: "#2563eb", betterIsLow: true,
                fmt: (v) => formatNumber(Math.round(v)) + "위", fmtTick: (v) => formatNumber(Math.round(v)) })}
              <div class="pf-tooltip" style="display:none;"></div>
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
              ${buildLineChart(powerPts, { id: "power", kind: "power", color: "#f59e0b", betterIsLow: false,
                fmt: (v) => formatCompactPower(v), fmtTick: (v) => formatCompactPower(v) })}
              <div class="pf-tooltip" style="display:none;"></div>
            </div>`;
        }
        html += `<div class="pf-chart-note">하루 2회 자동 수집 · 날짜별 1포인트</div>`;
        body.innerHTML = html;
        attachChartHover(body);
        bindTabs();
      };

      const bindTabs = () => {
        body.querySelectorAll(".pf-range-row .mini-tab").forEach((b) => {
          b.addEventListener("click", () => { range = Number(b.dataset.range); render(); });
        });
      };

      render();
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
  // 인기 검색어 집계용 (실패해도 무시)
  fetch(`${API_BASE}/api/search-log`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: me.nickname }),
  }).catch(() => {});

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
