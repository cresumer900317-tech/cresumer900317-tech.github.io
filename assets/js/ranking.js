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
        <div class="rk-tab-bar">
          <button class="rk-tab-btn${active === "power" ? " rk-tab-active" : ""}" data-tab="power">전투력</button>
          <button class="rk-tab-btn${active === "popularity" ? " rk-tab-active" : ""}" data-tab="popularity">인기도</button>
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
            <div class="rk-hero-power rk-hero-power-pop">${pop}</div>
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

      return `
        <div class="rk-compact-card" data-pop-row="${escapeHtml(String(item.name || "").toLowerCase())}">
          <div class="rk-c-rank">
            <span class="${numCls}">${rank}</span>
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
            <div class="rk-c-pop">${pop}</div>
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
          <div class="toolbar-card rk-toolbar">
            <label class="search-field">
              <span>🔎</span>
              <input id="rankingSearchInput" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
            </label>
            <button id="rankingResetButton" class="ghost-btn" type="button">초기화</button>
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
      const restHtml = sortedPopularity.slice(3).map((item, i) => renderPopularityCard(item, i + 4)).join("");
      return `
        <div id="popularityContent">
          <div class="rk-meta">인기도 기준 · ${formatNumber(sortedPopularity.length)}명</div>
          ${podiumHtml}
          ${restHtml ? `
            <div class="rk-cutline-divider rk-cutline-divider-pop">
              <div class="rk-cutline-line"></div>
              <div class="rk-cutline-badge">4위 이하</div>
              <div class="rk-cutline-line"></div>
            </div>
            <div class="toolbar-card rk-toolbar">
              <label class="search-field">
                <span>🔎</span>
                <input id="popSearchInput" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
              </label>
              <button id="popResetButton" class="ghost-btn" type="button">초기화</button>
            </div>
            <div class="rk-list" id="popCardList">${restHtml}</div>
          ` : ""}
        </div>
      `;
    }

    // ── 페이지 렌더 ──
    function renderPage(tab) {
      const content = tab === "power" ? renderPowerContent() : renderPopularityContent();
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
        });
      });

      if (tab === "power") {
        bindCardSearch("rankingSearchInput", "rankingResetButton", "rankingCardList", "data-character-row");
      }
      if (tab === "popularity") {
        bindCardSearch("popSearchInput", "popResetButton", "popCardList", "data-pop-row");
      }
    }

    renderPage(currentTab);

  } catch (error) {
    console.error(error);
    renderError(null, error);
  }
});
