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

    // 탭 바
    function tabBarHtml(active) {
      return `
        <div class="rk-tab-bar" style="flex-wrap:wrap;">
          <button class="rk-tab-btn${active === "power" ? " rk-tab-active" : ""}" data-tab="power">전투력</button>
          <button class="rk-tab-btn${active === "boss" ? " rk-tab-active" : ""}" data-tab="boss">토벌전</button>
          <button class="rk-tab-btn${active === "wboss" ? " rk-tab-active" : ""}" data-tab="wboss">월드보스</button>
          <button class="rk-tab-btn${active === "popularity" ? " rk-tab-active" : ""}" data-tab="popularity">인기도</button>
          <button class="rk-tab-btn${active === "server" ? " rk-tab-active" : ""}" data-tab="server">서버전체</button>
          <button class="rk-tab-btn${active === "guildcmp" ? " rk-tab-active" : ""}" data-tab="guildcmp">길드비교</button>
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
    const SERVER_PAGE = 100;
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
        <div class="${cardCls}"${isFriend ? ' style="outline:2px solid var(--brand,#3182ce);outline-offset:-2px;"' : ''} data-server-row="${escapeHtml(String(item.nickname || "").toLowerCase())}">
          <div class="rk-c-rank">
            ${rank <= 3 ? `<span class="rk-c-medal">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>` : `<span class="rk-c-num">${formatNumber(rank)}</span>`}
          </div>
          <div class="rk-c-avatar">${characterAvatarHtml({ name: item.nickname })}</div>
          <div class="rk-c-info">
            <div class="rk-c-name">${escapeHtml(item.nickname || "-")}${isFriend ? ` <span style="font-size:0.68rem;font-weight:700;color:var(--brand,#3182ce);">친구패밀리</span>` : ""}</div>
            <div class="rk-c-sub">
              ${serverGuildBadge(item.guild)}
              <span class="rk-c-job">${escapeHtml(item.job || "-")}${item.level ? " · Lv " + item.level : ""}</span>
            </div>
          </div>
          <div class="rk-c-right">
            <div class="rk-c-power">${powerHtml}</div>
            <div class="rk-c-server">${item.popularity ? "♥ " + formatNumber(item.popularity) : "-"}</div>
          </div>
        </div>
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
      let shown = SERVER_PAGE;
      let kw = "";
      const moreWrap = document.getElementById("serverMoreWrap");
      function paint() {
        if (kw) {
          const matches = data.filter(d => String(d.nickname || "").toLowerCase().includes(kw));
          listEl.innerHTML = matches.length
            ? `<div class="rk-meta">검색결과 ${formatNumber(matches.length)}명</div>` + matches.slice(0, 300).map(renderServerCard).join("")
            : createEmptyBox(`"${kw}" 검색 결과가 없습니다.`);
          moreWrap.innerHTML = matches.length > 300 ? `<div class="rk-meta">상위 300명만 표시</div>` : "";
        } else {
          listEl.innerHTML = data.slice(0, shown).map(renderServerCard).join("");
          if (shown < data.length) {
            moreWrap.innerHTML = `<button class="ghost-btn" id="serverMoreBtn" type="button">더보기 (${formatNumber(shown)}/${formatNumber(data.length)})</button>`;
            document.getElementById("serverMoreBtn").addEventListener("click", () => { shown = Math.min(shown + SERVER_PAGE, data.length); paint(); });
          } else {
            moreWrap.innerHTML = `<div class="rk-meta">전체 ${formatNumber(data.length)}명 표시 완료</div>`;
          }
        }
      }
      const input = document.getElementById("serverSearchInput");
      input.addEventListener("input", () => { kw = input.value.trim().toLowerCase(); paint(); });
      document.getElementById("serverResetButton").addEventListener("click", () => { input.value = ""; kw = ""; shown = SERVER_PAGE; paint(); input.focus(); });
      paint();
    }

    // ════════ 길드별 비교 대시보드 ════════
    let guildRanksCache = null;
    async function loadGuildRanks() {
      if (guildRanksCache) return guildRanksCache;
      const d = await getGuildRanks();
      guildRanksCache = Array.isArray(d) ? d : [];
      return guildRanksCache;
    }

    function renderGuildcmpContent() {
      return `<div id="guildcmpContent"><div class="rk-list"><div class="loading-box">길드 비교 데이터 불러오는 중…</div></div></div>`;
    }

    async function initGuildcmpTab() {
      const wrap = document.getElementById("guildcmpContent");
      let ranks;
      try { ranks = await loadGuildRanks(); }
      catch (e) { wrap.innerHTML = `<div class="rk-list">${createEmptyBox("길드 데이터를 불러오지 못했습니다.")}</div>`; return; }

      const order = ["친구들", "친구둘", "친구삼", "친구넷", "친구닷"];
      const rankMap = {};
      ranks.forEach(r => { rankMap[r.guildName] = r; });
      const byG = {};
      rows.forEach(m => { const g = m.guild; if (FRIENDS.has(g)) (byG[g] ||= []).push(m); });

      const cards = order.map(g => {
        const r = rankMap[g] || {};
        const members = (byG[g] || []).slice().sort((a, b) => Number(b.power || 0) - Number(a.power || 0));
        const tracked = members.length;
        const avg = tracked ? members.reduce((s, m) => s + Number(m.power || 0), 0) / tracked : 0;
        return {
          g, serverRank: r.serverRank, level: r.guildLevel,
          memberCount: r.memberCount, totalPower: Number(r.totalPower || 0),
          avg, top: members[0], tracked,
        };
      }).filter(c => c.serverRank || c.totalPower || c.tracked);

      if (!cards.length) { wrap.innerHTML = `<div class="rk-list">${createEmptyBox("길드 비교 데이터가 아직 없습니다.")}</div>`; return; }

      const sorted = cards.slice().sort((a, b) => b.totalPower - a.totalPower);
      const maxTotal = Math.max(...sorted.map(c => c.totalPower), 1);
      const familyPower = sorted.reduce((s, c) => s + c.totalPower, 0);
      const familyMembers = sorted.reduce((s, c) => s + Number(c.memberCount || 0), 0);

      const cardsHtml = sorted.map((c, i) => {
        const pct = Math.max(4, Math.round(c.totalPower / maxTotal * 100));
        return `
          <div class="gc-card">
            <div class="gc-head">
              <span class="gc-rank">${i === 0 ? "👑" : (i + 1) + "위"}</span>
              ${guildBadgeHtml(c.g)}
              <span class="gc-srank">${c.serverRank ? "서버 길드 " + formatNumber(c.serverRank) + "위" : ""}</span>
            </div>
            <div class="gc-bar"><div class="gc-bar-fill" style="width:${pct}%"></div></div>
            <div class="gc-stats">
              <div class="gc-stat"><span>총 전투력</span><b>${formatCompactPower(c.totalPower)}</b></div>
              <div class="gc-stat"><span>평균 전투력</span><b>${formatCompactPower(c.avg)}</b></div>
              <div class="gc-stat"><span>인원</span><b>${c.memberCount || "-"}명</b></div>
              <div class="gc-stat"><span>길드 레벨</span><b>Lv ${c.level || "-"}</b></div>
              <div class="gc-stat"><span>최강 멤버</span><b>${c.top ? escapeHtml(c.top.name) : "-"}</b></div>
            </div>
          </div>`;
      }).join("");

      wrap.innerHTML = `
        <style>
          .gc-summary{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0 18px;}
          .gc-summary>div{flex:1;min-width:120px;background:linear-gradient(135deg,#ebf8ff,#fff);border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;}
          .gc-summary .gc-s-label{font-size:0.78rem;color:#718096;}
          .gc-summary .gc-s-val{font-size:1.25rem;font-weight:900;color:#2d3748;margin-top:2px;}
          .gc-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 4px 12px rgba(0,0,0,0.04);}
          .gc-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
          .gc-rank{font-weight:900;font-size:1.05rem;color:#4a5568;min-width:34px;}
          .gc-srank{margin-left:auto;font-size:0.8rem;color:#718096;font-weight:600;}
          .gc-bar{height:10px;background:#edf2f7;border-radius:6px;overflow:hidden;margin-bottom:12px;}
          .gc-bar-fill{height:100%;background:linear-gradient(90deg,#3182ce,#63b3ed);border-radius:6px;}
          .gc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;}
          .gc-stat{display:flex;flex-direction:column;}
          .gc-stat span{font-size:0.72rem;color:#a0aec0;}
          .gc-stat b{font-size:0.95rem;color:#2d3748;font-weight:800;margin-top:2px;}
        </style>
        <div class="rk-meta">친구패밀리 길드 비교 · 총전투력 기준 · Scania 11</div>
        <div class="gc-summary">
          <div><div class="gc-s-label">길드 수</div><div class="gc-s-val">${sorted.length}개</div></div>
          <div><div class="gc-s-label">합산 인원</div><div class="gc-s-val">${familyMembers ? formatNumber(familyMembers) + "명" : "-"}</div></div>
          <div><div class="gc-s-label">합산 전투력</div><div class="gc-s-val">${formatCompactPower(familyPower)}</div></div>
        </div>
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

      // 탭 전환
      document.querySelectorAll(".rk-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          currentTab = btn.dataset.tab;
          renderPage(currentTab);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });

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
