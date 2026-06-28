document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  // 스켈레톤 로딩
  document.querySelector("main").innerHTML = `
    <div class="page-card">
      <div class="container">
        <div class="skeleton skeleton-rk-title"></div>
        <div class="rk-tab-bar">
          <div class="skeleton skeleton-rk-tab"></div>
          <div class="skeleton skeleton-rk-tab"></div>
        </div>
        <div class="rk-hero-wrap skeleton-rk-hero-wrap">
          <div class="rk-hero-grid">
            <div class="skeleton skeleton-rk-podium"></div>
            <div class="skeleton skeleton-rk-podium-center"></div>
            <div class="skeleton skeleton-rk-podium"></div>
          </div>
        </div>
        <div class="rk-list">
          ${Array(8).fill('<div class="skeleton skeleton-rk-card"></div>').join("")}
        </div>
      </div>
    </div>
  `;

  try {
    const members = await getRankingData();
    const rows = Array.isArray(members) ? members : [];

    const sortedPower = [...rows].sort((a, b) => Number(b.power || 0) - Number(a.power || 0));
    const sortedPopularity = [...rows]
      .filter(m => m.popularity != null && Number(m.popularity) > 0)
      .sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0));

    const CUT = 30;
    let currentTab = "power";
    let lastFamilyMetric = "power";   // 친구패밀리 스코프로 돌아올 때 마지막 지표 복원

    // 배치 기준일 (매달 마지막 수요일 22시)
    const cutlineDate = (() => {
      const now = new Date();
      let y = now.getFullYear(), m = now.getMonth();
      for (let attempt = 0; attempt < 2; attempt++) {
        const lastDay = new Date(y, m + 1, 0);
        const dow = lastDay.getDay();
        const diff = (dow - 3 + 7) % 7;
        const wed = new Date(y, m, lastDay.getDate() - diff);
        wed.setHours(22, 0, 0, 0);
        if (wed > now) return wed;
        m++;
        if (m > 11) { m = 0; y++; }
      }
      return null;
    })();
    const cutlineDDay = cutlineDate
      ? Math.ceil((cutlineDate - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    const cutlineDateStr = cutlineDate
      ? `${cutlineDate.getMonth()+1}/${cutlineDate.getDate()}(수) 22시`
      : "";
    const cutlineDDayText = cutlineDDay === 0 ? "D-Day"
      : cutlineDDay === 1 ? "D-1"
      : cutlineDDay !== null ? `D-${cutlineDDay}` : "";

    // 컷라인 거리
    function getCutDistance(item, sorted) {
      const cutItem = sorted[CUT - 1];
      if (!cutItem) return null;
      return Number(item.power || 0) - Number(cutItem.power || 0);
    }

    function cutDistanceHtml(diff) {
      if (diff === null) return "";
      if (diff >= 0) return `<span class="rk-cut-dist rk-cut-dist-safe">+${formatCompactPower(diff)} 여유</span>`;
      return `<span class="rk-cut-dist rk-cut-dist-gap">${CUT}위까지 ${formatCompactPower(Math.abs(diff))}</span>`;
    }

    function getStatus(rank) {
      if (rank <= 25) return "safe";
      if (rank <= 30) return "caution";
      if (rank <= 35) return "chase";
      return "normal";
    }

    function getStatusLabel(rank) {
      if (rank <= 25) return { text: "안정권", cls: "rk-status-safe" };
      if (rank <= 30) return { text: "접전", cls: "rk-status-caution" };
      if (rank <= 35) return { text: "추격", cls: "rk-status-chase" };
      return null;
    }

    function powerSplitHtml(item, size) {
      const pt = item.powerText || "";
      const parts = pt.trim().split(/\s+/).filter(Boolean);
      const cls = size === "lg" ? "rk-power-lg" : "rk-power-md";
      if (parts.length >= 2) {
        return `<span class="${cls}-main">${escapeHtml(parts[0])}</span><span class="rk-power-sep">|</span><span class="${cls}-sub">${escapeHtml(parts[1])}</span>`;
      }
      return `<span class="${cls}-main">${escapeHtml(getPowerDisplay(item))}</span>`;
    }

    // 탭 바 — 스코프(친구패밀리/서버전체/길드비교) + 친구패밀리일 때만 지표 드롭다운
    const FAMILY_METRICS = ["power", "boss", "wboss", "popularity"];
    const METRIC_LABEL = { power: "전투력", boss: "토벌전", wboss: "월드보스", popularity: "인기도" };
    function tabBarHtml(active) {
      const isFamily = FAMILY_METRICS.includes(active);
      const scope = isFamily ? "family" : active;
      const scopeBtn = (key, label) =>
        `<button class="rk-tab-btn${scope === key ? " rk-tab-active" : ""}" data-scope="${key}">${label}</button>`;
      const metricOpts = FAMILY_METRICS
        .map(m => `<option value="${m}"${active === m ? " selected" : ""}>${METRIC_LABEL[m]}</option>`)
        .join("");
      return `
        <div class="rk-tab-bar" style="flex-wrap:wrap;align-items:center;gap:8px;">
          ${scopeBtn("family", "친구패밀리")}
          ${scopeBtn("server", "서버전체")}
          ${scopeBtn("guildcmp", "길드 건강도")}
          ${isFamily ? `
            <label style="display:inline-flex;align-items:center;gap:6px;margin-left:4px;font-size:0.82rem;color:#718096;">
              지표
              <select id="metricSelect" style="padding:8px 12px;border:1px solid #cbd5e0;border-radius:10px;font-weight:700;font-size:0.95rem;background:#fff;color:#2d3748;cursor:pointer;">
                ${metricOpts}
              </select>
            </label>` : ""}
        </div>
      `;
    }

    // ── 전투력 포디움 ──
    function renderPowerHero(sorted) {
      if (sorted.length === 0) return "";
      const [first, second, third] = sorted;
      function heroCard(item, rank, center) {
        if (!item) return `<div></div>`;
        return `
          <div class="rk-hero-card${center ? " rk-hero-center" : ""}">
            <div class="rk-hero-medal">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</div>
            <div class="rk-hero-avatar-wrap">${characterAvatarHtml(item)}</div>
            <div class="rk-hero-name">${escapeHtml(item.name || "-")}</div>
            <div class="rk-hero-guild">${guildBadgeHtml(item.guild || "길드 없음")}</div>
            <div class="rk-hero-power">${powerSplitHtml(item, "lg")}</div>
            ${item.serverRank ? `<div class="rk-hero-server">서버 ${formatNumber(item.serverRank)}위</div>` : ""}
          </div>
        `;
      }
      return `
        <div class="rk-hero-wrap">
          <div class="rk-hero-grid">
            ${heroCard(second, 2, false)}
            ${heroCard(first, 1, true)}
            ${heroCard(third, 3, false)}
          </div>
        </div>
      `;
    }

    function cutlineDivider() {
      return `
        <div class="rk-cutline-divider">
          <div class="rk-cutline-line"></div>
          <div class="rk-cutline-badge">TOP ${CUT} 배치 라인</div>
          <div class="rk-cutline-line"></div>
        </div>
      `;
    }

    function renderPowerCard(item, rank, allSorted) {
      const status = getStatusLabel(rank);
      const isCut = rank === CUT;
      const isJustBelow = rank === CUT + 1;
      const st = getStatus(rank);
      const cutDiff = (st === "caution" || st === "chase") ? getCutDistance(item, allSorted) : null;

      let cardClass = "rk-compact-card";
      if (rank <= 3) cardClass += " rk-top3-card";
      if (isCut) cardClass += " rk-cut-card";
      if (st === "caution") cardClass += " rk-danger-card";
      if (st === "chase") cardClass += " rk-challenge-card";

      return `
        ${isJustBelow ? `<div class="rk-below-line"><span>── 31위부터 ──</span></div>` : ""}
        <div class="${cardClass}" data-character-row="${escapeHtml(String(item.name || "").toLowerCase())}">
          <div class="rk-c-rank">
            ${rank <= 3
              ? `<span class="rk-c-medal">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>`
              : `<span class="rk-c-num ${st === "caution" ? "rk-num-danger" : st === "chase" ? "rk-num-challenge" : ""}">${rank}</span>`
            }
          </div>
          <div class="rk-c-avatar">${characterAvatarHtml(item)}</div>
          <div class="rk-c-info">
            <div class="rk-c-name">${escapeHtml(item.name || "-")}</div>
            <div class="rk-c-sub">
              ${guildBadgeHtml(item.guild || "길드 없음")}
              <span class="rk-c-job">${escapeHtml(item.job || "-")} · Lv ${item.level || "-"}</span>
            </div>
          </div>
          <div class="rk-c-right">
            <div class="rk-c-power">${powerSplitHtml(item, "md")}</div>
            <div class="rk-c-server">${item.serverRank ? "서버 " + formatNumber(item.serverRank) + "위" : "-"}</div>
            ${status ? `<div class="rk-c-status ${status.cls}">${status.text}</div>` : ""}
            ${cutDiff !== null ? `<div class="rk-cut-dist-wrap">${cutDistanceHtml(cutDiff)}</div>` : ""}
          </div>
          ${isCut ? `<div class="rk-cut-marker">TOP ${CUT}</div>` : ""}
        </div>
      `;
    }

    // ── 인기도 포디움 ──
    function renderPopularityPodium(sorted) {
      if (sorted.length === 0) return "";
      const [first, second, third] = sorted;
      function popHeroCard(item, rank, center) {
        if (!item) return `<div></div>`;
        const pop = formatNumber(Number(item.popularity || 0));
        return `
          <div class="rk-hero-card${center ? " rk-hero-center" : ""}">
            <div class="rk-hero-medal">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</div>
            <div class="rk-hero-avatar-wrap">${characterAvatarHtml(item)}</div>
            <div class="rk-hero-name">${escapeHtml(item.name || "-")}</div>
            <div class="rk-hero-guild">${guildBadgeHtml(item.guild || "길드 없음")}</div>
            <div class="rk-hero-power rk-hero-power-pop"><span class="rk-pop-label">인기도</span> ${pop}</div>
            ${item.popServerRank
              ? `<div class="rk-hero-server">서버 인기도 ${formatNumber(item.popServerRank)}위</div>`
              : item.serverRank
                ? `<div class="rk-hero-server">서버 전투력 ${formatNumber(item.serverRank)}위</div>`
                : ""}
          </div>
        `;
      }
      return `
        <div class="rk-hero-wrap">
          <div class="rk-hero-grid">
            ${popHeroCard(second, 2, false)}
            ${popHeroCard(first, 1, true)}
            ${popHeroCard(third, 3, false)}
          </div>
        </div>
      `;
    }

    function renderPopularityCard(item, rank) {
      const pop = formatNumber(Number(item.popularity || 0));
      let numCls = "rk-c-num";
      if (rank <= 10) numCls += " rk-num-pop-top10";
      else if (rank <= 20) numCls += " rk-num-pop-top20";

      let cardCls = "rk-compact-card";
      if (rank <= 3) cardCls += " rk-top3-card";

      return `
        <div class="${cardCls}" data-pop-row="${escapeHtml(String(item.name || "").toLowerCase())}">
          <div class="rk-c-rank">
            ${rank <= 3
              ? `<span class="rk-c-medal">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>`
              : `<span class="${numCls}">${rank}</span>`
            }
          </div>
          <div class="rk-c-avatar">${characterAvatarHtml(item)}</div>
          <div class="rk-c-info">
            <div class="rk-c-name">${escapeHtml(item.name || "-")}</div>
            <div class="rk-c-sub">
              ${guildBadgeHtml(item.guild || "길드 없음")}
              <span class="rk-c-job">${escapeHtml(item.job || "-")} · Lv ${item.level || "-"}</span>
            </div>
          </div>
          <div class="rk-c-right">
            <div class="rk-c-pop">${pop}<span class="rk-c-pop-unit">인기도</span></div>
            <div class="rk-c-server">${
              item.popServerRank
                ? "서버 인기도 " + formatNumber(item.popServerRank) + "위"
                : item.serverRank
                  ? "서버 전투력 " + formatNumber(item.serverRank) + "위"
                  : "-"
            }</div>
          </div>
        </div>
      `;
    }

    // ── 토벌전 / 월드보스 (구조 동일 → 설정으로 일반화) ──
    const BOSS = {
      boss:  { key: "boss",  scoreKey: "bossScore",  rankKey: "bossRank",  label: "토벌전",  emoji: "🔥", color: "#dc2626" },
      wboss: { key: "wboss", scoreKey: "wbossScore", rankKey: "wbossRank", label: "월드보스", emoji: "🌎", color: "#7c3aed" },
    };

    function sortedBossList(cfg) {
      return [...rows]
        .filter(m => m[cfg.scoreKey] != null && Number(m[cfg.scoreKey]) > 0)
        .sort((a, b) => Number(b[cfg.scoreKey] || 0) - Number(a[cfg.scoreKey] || 0));
    }

    function renderBossPodium(sorted, cfg) {
      if (sorted.length === 0) return "";
      const [first, second, third] = sorted;
      function heroCard(item, rank, center) {
        if (!item) return `<div></div>`;
        const score = formatCompactPower(item[cfg.scoreKey]);
        return `
          <div class="rk-hero-card${center ? " rk-hero-center" : ""}">
            <div class="rk-hero-medal">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</div>
            <div class="rk-hero-avatar-wrap">${characterAvatarHtml(item)}</div>
            <div class="rk-hero-name">${escapeHtml(item.name || "-")}</div>
            <div class="rk-hero-guild">${guildBadgeHtml(item.guild || "길드 없음")}</div>
            <div class="rk-hero-power" style="color:${cfg.color};">${cfg.emoji} ${score}</div>
            ${item[cfg.rankKey] ? `<div class="rk-hero-server">서버 ${cfg.label} ${formatNumber(item[cfg.rankKey])}위</div>` : ""}
          </div>
        `;
      }
      return `
        <div class="rk-hero-wrap">
          <div class="rk-hero-grid">
            ${heroCard(second, 2, false)}
            ${heroCard(first, 1, true)}
            ${heroCard(third, 3, false)}
          </div>
        </div>
      `;
    }

    function renderBossCard(item, rank, cfg) {
      const score = formatCompactPower(item[cfg.scoreKey]);
      let cardCls = "rk-compact-card";
      if (rank <= 3) cardCls += " rk-top3-card";
      return `
        <div class="${cardCls}" data-${cfg.key}-row="${escapeHtml(String(item.name || "").toLowerCase())}">
          <div class="rk-c-rank">
            ${rank <= 3
              ? `<span class="rk-c-medal">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>`
              : `<span class="rk-c-num">${rank}</span>`
            }
          </div>
          <div class="rk-c-avatar">${characterAvatarHtml(item)}</div>
          <div class="rk-c-info">
            <div class="rk-c-name">${escapeHtml(item.name || "-")}</div>
            <div class="rk-c-sub">
              ${guildBadgeHtml(item.guild || "길드 없음")}
              <span class="rk-c-job">${escapeHtml(item.job || "-")} · Lv ${item.level || "-"}</span>
            </div>
          </div>
          <div class="rk-c-right">
            <div style="font-size:1.05rem;font-weight:900;color:${cfg.color};white-space:nowrap;">${cfg.emoji} ${score}</div>
            <div class="rk-c-server">${item[cfg.rankKey] ? "서버 " + formatNumber(item[cfg.rankKey]) + "위" : "-"}</div>
          </div>
        </div>
      `;
    }

    function renderBossContent(cfg) {
      const sorted = sortedBossList(cfg);
      if (sorted.length === 0) {
        return `<div class="rk-empty-wrap">${createEmptyBox(cfg.label + " 데이터가 없습니다.")}</div>`;
      }
      const podiumHtml = renderBossPodium(sorted, cfg);
      const allHtml = sorted.map((item, i) => renderBossCard(item, i + 1, cfg)).join("");
      return `
        <div id="${cfg.key}Content">
          <div class="rk-meta">${cfg.label} 점수 기준 · ${formatNumber(sorted.length)}명 · Scania 11</div>
          ${podiumHtml}
          ${allHtml ? `
            <div class="toolbar-card rk-toolbar rk-toolbar-sticky">
              <label class="search-field">
                <span>🔎</span>
                <input id="${cfg.key}SearchInput" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
              </label>
              <button id="${cfg.key}ResetButton" class="ghost-btn" type="button">초기화</button>
              <button class="ghost-btn rk-top-btn" type="button" onclick="window.scrollTo({top:0,behavior:'smooth'})">TOP ↑</button>
            </div>
            <div class="rk-list" id="${cfg.key}CardList">${allHtml}</div>
          ` : ""}
        </div>
      `;
    }

    // ── 탭별 콘텐츠 ──
    function renderPowerContent() {
      const heroHtml = renderPowerHero(sortedPower);
      const listHtml = sortedPower.map((item, i) => {
        const rank = i + 1;
        let html = renderPowerCard(item, rank, sortedPower);
        if (rank === CUT) html += cutlineDivider();
        return html;
      }).join("");
      return `
        <div id="powerContent">
          <div class="rk-meta">전투력 기준 · ${formatNumber(sortedPower.length)}명</div>
          ${heroHtml}
          <div class="toolbar-card rk-toolbar rk-toolbar-sticky">
            <label class="search-field">
              <span>🔎</span>
              <input id="rankingSearchInput" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
            </label>
            <button id="rankingResetButton" class="ghost-btn" type="button">초기화</button>
            <button class="ghost-btn rk-top-btn" type="button" onclick="window.scrollTo({top:0,behavior:'smooth'})">TOP ↑</button>
          </div>
          <div class="rk-list" id="rankingCardList">
            ${listHtml || createEmptyBox("랭킹 데이터가 없습니다.")}
          </div>
        </div>
      `;
    }

    function renderPopularityContent() {
      if (sortedPopularity.length === 0) {
        return `<div class="rk-empty-wrap">${createEmptyBox("인기도 데이터가 없습니다.")}</div>`;
      }
      const podiumHtml = renderPopularityPodium(sortedPopularity);
      const allHtml = sortedPopularity.map((item, i) => renderPopularityCard(item, i + 1)).join("");
      return `
        <div id="popularityContent">
          <div class="rk-meta">인기도 기준 · ${formatNumber(sortedPopularity.length)}명</div>
          ${podiumHtml}
          ${allHtml ? `
            <div class="toolbar-card rk-toolbar rk-toolbar-sticky">
              <label class="search-field">
                <span>🔎</span>
                <input id="popSearchInput" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
              </label>
              <button id="popResetButton" class="ghost-btn" type="button">초기화</button>
            <button class="ghost-btn rk-top-btn" type="button" onclick="window.scrollTo({top:0,behavior:'smooth'})">TOP ↑</button>
            </div>
            <div class="rk-list" id="popCardList">${allHtml}</div>
          ` : ""}
        </div>
      `;
    }

    // ════════ 서버 전체 랭킹 (전투력순 ~3000명, 인기도 포함) ════════
    const FRIENDS = new Set(["친구들", "친구둘", "친구삼", "친구넷", "친구닷"]);
    const SERVER_PAGE = 50;
    let serverCache = null;

    async function loadServerRanking() {
      if (serverCache) return serverCache;
      const d = await getServerRanking();
      serverCache = Array.isArray(d) ? d : [];
      return serverCache;
    }

    function serverGuildBadge(guild) {
      const g = String(guild || "").trim();
      if (FRIENDS.has(g)) return guildBadgeHtml(g);
      if (!g) return `<span class="guild-badge guild-none">길드 없음</span>`;
      return `<span class="guild-badge" style="background:#edf2f7;color:#4a5568;">${escapeHtml(g)}</span>`;
    }

    function renderServerCard(item) {
      const isFriend = FRIENDS.has(String(item.guild || "").trim());
      const rank = Number(item.serverRank || 0);
      let cardCls = "rk-compact-card";
      if (rank <= 3) cardCls += " rk-top3-card";
      if (isFriend) cardCls += " rk-friend-card";
      const pt = String(item.powerText || "").trim().split(/\s+/).filter(Boolean);
      const powerHtml = pt.length >= 2
        ? `<span class="rk-power-md-main">${escapeHtml(pt[0])}</span><span class="rk-power-sep">|</span><span class="rk-power-md-sub">${escapeHtml(pt[1])}</span>`
        : `<span class="rk-power-md-main">${escapeHtml(item.powerText || formatCompactPower(item.power))}</span>`;
      return `
        <a class="${cardCls} rk-card-link" href="./profile?n=${encodeURIComponent(item.nickname || "")}"${isFriend ? ' style="outline:2px solid var(--brand,#3182ce);outline-offset:-2px;"' : ''} data-server-row="${escapeHtml(String(item.nickname || "").toLowerCase())}">
          <div class="rk-c-rank">
            ${rank <= 3 ? `<span class="rk-c-medal">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>` : `<span class="rk-c-num">${formatNumber(rank)}</span>`}
          </div>
          <div class="rk-c-avatar">${characterAvatarHtml({ name: item.nickname, guild: item.guild })}</div>
          <div class="rk-c-info">
            <div class="rk-c-name">${escapeHtml(item.nickname || "-")}${isFriend ? ` <span style="font-size:0.68rem;font-weight:700;color:var(--brand,#3182ce);">친구패밀리</span>` : ""}</div>
            <div class="rk-c-sub">
              ${serverGuildBadge(item.guild)}
              <span class="rk-c-job">${escapeHtml(item.job || "-")}${item.level ? " · Lv " + item.level : ""}</span>
            </div>
          </div>
          <div class="rk-c-right">
            <div class="rk-c-power">${powerHtml}</div>
            <div class="rk-c-server">${item.popularity ? `<span style="color:#e5377b;font-weight:800;">♥ ${formatNumber(item.popularity)}</span>` : "-"}</div>
          </div>
        </a>
      `;
    }

    function renderServerContent() {
      return `
        <div id="serverContent">
          <div class="rk-meta">스카니아11 서버 전체 전투력 랭킹 · 상위 <span id="serverTotal">…</span> · ♥는 인기도</div>
          <div class="toolbar-card rk-toolbar rk-toolbar-sticky">
            <label class="search-field"><span>🔎</span>
              <input id="serverSearchInput" type="text" placeholder="서버 전체에서 캐릭터명 검색" autocomplete="off" />
            </label>
            <button id="serverResetButton" class="ghost-btn" type="button">초기화</button>
            <button class="ghost-btn rk-top-btn" type="button" onclick="window.scrollTo({top:0,behavior:'smooth'})">TOP ↑</button>
          </div>
          <div class="rk-list" id="serverCardList"><div class="loading-box">서버 전체 랭킹 불러오는 중…</div></div>
          <div id="serverMoreWrap" style="text-align:center;margin-top:16px;"></div>
        </div>
      `;
    }

    async function initServerTab() {
      const listEl = document.getElementById("serverCardList");
      const totalEl = document.getElementById("serverTotal");
      let data;
      try { data = await loadServerRanking(); }
      catch (e) { listEl.innerHTML = createEmptyBox("서버 랭킹을 불러오지 못했습니다."); return; }
      if (!data.length) {
        if (totalEl) totalEl.textContent = "준비 중";
        listEl.innerHTML = createEmptyBox("서버 전체 랭킹 데이터가 아직 준비되지 않았어요. 잠시 후 다시 확인해 주세요.");
        return;
      }
      if (totalEl) totalEl.textContent = formatNumber(data.length) + "명";
      const moreWrap = document.getElementById("serverMoreWrap");
      const PAGE = SERVER_PAGE;   // 페이지당 인원
      let page = 1;
      let kw = "";
      let view = data;

      // 표시할 페이지 번호 목록 (현재 ±2 + 처음/끝, 사이 생략 …)
      function pageWindow(cur, total) {
        const set = new Set([1, total]);
        for (let i = cur - 2; i <= cur + 2; i++) if (i >= 1 && i <= total) set.add(i);
        const nums = [...set].sort((a, b) => a - b);
        const out = [];
        let prev = 0;
        nums.forEach(n => { if (n - prev > 1) out.push("…"); out.push(n); prev = n; });
        return out;
      }

      function renderPager(totalPages) {
        if (totalPages <= 1) return "";
        const cell = (n) => n === "…"
          ? `<span class="rk-pg-ellipsis">…</span>`
          : `<button class="rk-pg-btn${n === page ? " rk-pg-active" : ""}" data-pg="${n}">${n}</button>`;
        return `
          <div class="rk-pager">
            <button class="rk-pg-btn rk-pg-nav" data-pg="${page - 1}" ${page <= 1 ? "disabled" : ""}>‹ 이전</button>
            ${pageWindow(page, totalPages).map(cell).join("")}
            <button class="rk-pg-btn rk-pg-nav" data-pg="${page + 1}" ${page >= totalPages ? "disabled" : ""}>다음 ›</button>
          </div>`;
      }

      function render() {
        const totalPages = Math.max(1, Math.ceil(view.length / PAGE));
        if (page > totalPages) page = totalPages;
        const start = (page - 1) * PAGE;
        const slice = view.slice(start, start + PAGE);
        listEl.innerHTML = slice.length
          ? slice.map(renderServerCard).join("")
          : createEmptyBox(kw ? `"${kw}" 검색 결과가 없습니다.` : "데이터가 없습니다.");
        moreWrap.innerHTML = `
          ${kw ? `<div class="rk-meta" style="margin-bottom:8px;">🔎 "${escapeHtml(kw)}" 검색결과 ${formatNumber(view.length)}명</div>` : ""}
          ${renderPager(totalPages)}
          ${slice.length ? `<div class="rk-meta" style="margin-top:10px;">${formatNumber(view.length)}명 중 ${formatNumber(start + 1)}~${formatNumber(start + slice.length)}위 · ${page}/${formatNumber(totalPages)} 페이지</div>` : ""}
        `;
        moreWrap.querySelectorAll("[data-pg]").forEach(b => b.addEventListener("click", () => {
          if (b.hasAttribute("disabled")) return;
          page = Number(b.dataset.pg);
          render();
          const top = document.getElementById("serverContent");
          if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
        }));
      }

      // 검색 — 전체 대상, 결과를 그대로 페이지네이션
      const input = document.getElementById("serverSearchInput");
      input.addEventListener("input", () => {
        kw = input.value.trim().toLowerCase();
        view = kw ? data.filter(d => String(d.nickname || "").toLowerCase().includes(kw)) : data;
        page = 1;
        render();
      });
      document.getElementById("serverResetButton").addEventListener("click", () => {
        input.value = ""; kw = ""; view = data; page = 1; render(); input.focus();
      });

      render();
    }

    // ════════ 길드별 비교 대시보드 ════════
    let serverGuildsCache = null;
    async function loadServerGuilds() {
      if (serverGuildsCache) return serverGuildsCache;
      try {
        const r = await fetch(`${API_BASE}/api/server-guild-ranking?limit=30`, { cache: "no-store" });
        serverGuildsCache = r.ok ? await r.json() : [];
      } catch { serverGuildsCache = []; }
      return serverGuildsCache;
    }

    function renderGuildcmpContent() {
      return `<div id="guildcmpContent"><div class="rk-list"><div class="loading-box">스카니아11 길드 데이터 불러오는 중…</div></div></div>`;
    }

    async function initGuildcmpTab() {
      const wrap = document.getElementById("guildcmpContent");
      let guilds;
      try { guilds = await loadServerGuilds(); }
      catch (e) { wrap.innerHTML = `<div class="rk-list">${createEmptyBox("길드 데이터를 불러오지 못했습니다.")}</div>`; return; }

      guilds = (Array.isArray(guilds) ? guilds : [])
        .filter(g => g && g.guildName)
        .sort((a, b) => Number(a.guildRank || 0) - Number(b.guildRank || 0));
      if (!guilds.length) { wrap.innerHTML = `<div class="rk-list">${createEmptyBox("스카니아11 길드 데이터가 아직 없습니다.")}</div>`; return; }

      const maxPower = Math.max(...guilds.map(g => Number(g.power || 0)), 1);
      const friendCount = guilds.filter(g => FRIENDS.has(String(g.guildName || "").normalize("NFC"))).length;

      const cardsHtml = guilds.map(g => {
        const power = Number(g.power || 0);
        const members = Number(g.members || 0);
        const avg = members ? power / members : 0;
        const isFriend = FRIENDS.has(String(g.guildName || "").normalize("NFC"));
        const pct = Math.max(4, Math.round(power / maxPower * 100));
        const fillPct = Math.min(100, Math.round(members / 30 * 100)); // 정원(30) 충족률 = 활성 지표
        return `
          <div class="gc-card${isFriend ? " gc-card-friend" : ""}">
            <div class="gc-head">
              <span class="gc-rank">${g.guildRank ? formatNumber(g.guildRank) + "위" : "-"}</span>
              <span class="gc-name">${escapeHtml(g.guildName)}${isFriend ? ` <span class="gc-fr">친구패밀리</span>` : ""}</span>
              <span class="gc-srank">Lv ${g.level || "-"}</span>
            </div>
            <div class="gc-bar"><div class="gc-bar-fill" style="width:${pct}%"></div></div>
            <div class="gc-stats">
              <div class="gc-stat"><span>총 전투력</span><b>${formatCompactPower(power)}</b></div>
              <div class="gc-stat"><span>평균 전투력</span><b>${formatCompactPower(avg)}</b></div>
              <div class="gc-stat"><span>인원</span><b>${members || "-"}명 <span style="font-size:0.7rem;color:#a0aec0;">(${fillPct}%)</span></b></div>
              <div class="gc-stat"><span>길드 레벨</span><b>Lv ${g.level || "-"}</b></div>
            </div>
          </div>`;
      }).join("");

      wrap.innerHTML = `
        <style>
          .gc-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 4px 12px rgba(0,0,0,0.04);}
          .gc-card-friend{border-color:#fcd34d;background:linear-gradient(135deg,#fffbeb,#fff);}
          .gc-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
          .gc-rank{font-weight:900;font-size:1.05rem;color:#b45309;min-width:42px;}
          .gc-name{font-weight:800;font-size:1rem;color:#2d3748;}
          .gc-fr{font-size:0.66rem;font-weight:800;color:#b45309;background:#fef3c7;padding:1px 7px;border-radius:999px;margin-left:4px;vertical-align:middle;}
          .gc-srank{margin-left:auto;font-size:0.82rem;color:#718096;font-weight:700;}
          .gc-bar{height:10px;background:#edf2f7;border-radius:6px;overflow:hidden;margin-bottom:12px;}
          .gc-bar-fill{height:100%;background:linear-gradient(90deg,#f59e0b,#fbbf24);border-radius:6px;}
          .gc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;}
          .gc-stat{display:flex;flex-direction:column;}
          .gc-stat span{font-size:0.72rem;color:#a0aec0;}
          .gc-stat b{font-size:0.95rem;color:#2d3748;font-weight:800;margin-top:2px;}
        </style>
        <div class="rk-meta">스카니아11 서버 길드 건강도 · 서버 길드순위 TOP ${guilds.length}${friendCount ? ` · 친구패밀리 ${friendCount}개 입성` : ""}</div>
        ${cardsHtml}
      `;
    }

    // ── 페이지 렌더 ──
    function renderPage(tab) {
      const content =
        tab === "power" ? renderPowerContent()
        : tab === "boss" ? renderBossContent(BOSS.boss)
        : tab === "wboss" ? renderBossContent(BOSS.wboss)
        : tab === "server" ? renderServerContent()
        : tab === "guildcmp" ? renderGuildcmpContent()
        : renderPopularityContent();
      document.querySelector("main").innerHTML = `
        <div class="page-card">
          <div class="container">
            <div class="rk-page-header">
              <h1 class="rk-page-title">통합 랭킹</h1>
              <div class="rk-dday-chip ${cutlineDDay !== null && cutlineDDay <= 3 ? 'rk-dday-urgent' : ''}">
                <span class="rk-dday-label">배치 기준일</span>
                <span class="rk-dday-date">${cutlineDateStr}</span>
                <span class="rk-dday-badge">${cutlineDDayText}</span>
              </div>
            </div>
            ${tabBarHtml(tab)}
            ${content}
          </div>
        </div>
        <footer class="site-footer">
          <div class="container footer-inner">
            <div class="footer-brand">친구패밀리 · 메이플키우기 스카니아 11서버</div>
            <div class="footer-links">
              <a href="https://open.kakao.com/o/gagOlyni" target="_blank" rel="noopener noreferrer" class="footer-link">카카오톡 가입 문의</a>
            </div>
            <div class="footer-copy">&copy; ${new Date().getFullYear()} 친구패밀리. All rights reserved.</div>
          </div>
        </footer>
      `;

      // 스코프 전환 (친구패밀리/서버전체/길드비교)
      document.querySelectorAll("[data-scope]").forEach(btn => {
        btn.addEventListener("click", () => {
          const scope = btn.dataset.scope;
          currentTab = scope === "family" ? lastFamilyMetric : scope;
          renderPage(currentTab);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
      // 친구패밀리 지표 드롭다운
      const metricSel = document.getElementById("metricSelect");
      if (metricSel) {
        metricSel.addEventListener("change", () => {
          currentTab = metricSel.value;
          lastFamilyMetric = currentTab;
          renderPage(currentTab);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }

      if (tab === "power") {
        bindCardSearch("rankingSearchInput", "rankingResetButton", "rankingCardList", "data-character-row");
      }
      if (tab === "popularity") {
        bindCardSearch("popSearchInput", "popResetButton", "popCardList", "data-pop-row");
      }
      if (tab === "boss") {
        bindCardSearch("bossSearchInput", "bossResetButton", "bossCardList", "data-boss-row");
      }
      if (tab === "wboss") {
        bindCardSearch("wbossSearchInput", "wbossResetButton", "wbossCardList", "data-wboss-row");
      }
      if (tab === "server") {
        initServerTab();
      }
      if (tab === "guildcmp") {
        initGuildcmpTab();
      }
    }

    renderPage(currentTab);

  } catch (error) {
    console.error(error);
    renderError(null, error);
  }
});
