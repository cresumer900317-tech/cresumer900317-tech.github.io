document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const members = await getRankingData();
    const rows = Array.isArray(members) ? members : [];

    // ── 전투력 정렬 ──
    const sortedPower = [...rows].sort((a, b) => Number(b.power || 0) - Number(a.power || 0));

    // ── 인기도 정렬 (popularity 없는 멤버 제외) ──
    const sortedPopularity = [...rows]
      .filter(m => m.popularity != null && Number(m.popularity) > 0)
      .sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0));

    const CUT = 30;

    // ── 현재 탭 상태 ──
    let currentTab = "power";

    // 시즌 타이머
    function getSeasonDaysLeft() {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return Math.ceil((lastDay - now) / (1000 * 60 * 60 * 24));
    }

    // 컷라인 거리
    function getCutDistance(item, sorted) {
      const cutItem = sorted[CUT - 1];
      if (!cutItem) return null;
      const diff = Number(item.power || 0) - Number(cutItem.power || 0);
      return diff;
    }

    function cutDistanceHtml(diff) {
      if (diff === null) return "";
      if (diff >= 0) return `<span style="font-size:0.72rem;color:#059669;font-weight:600;">+${formatCompactPower(diff)} 여유</span>`;
      return `<span style="font-size:0.72rem;color:#dc2626;font-weight:600;">컷라인까지 -${formatCompactPower(Math.abs(diff))}</span>`;
    }

    function getStatus(rank) {
      if (rank <= 25) return "safe";
      if (rank <= 30) return "danger";
      if (rank <= 35) return "challenge";
      return "normal";
    }

    function getStatusLabel(rank) {
      if (rank <= 25) return { text: "안정권", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" };
      if (rank <= 30) return { text: "위험", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
      if (rank <= 35) return { text: "도전", color: "#dc2626", bg: "#fff5f5", border: "#fca5a5" };
      return null;
    }

    function powerSplitHtml(item, size = "md") {
      const pt = item.powerText || "";
      const parts = pt.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const bigSize = size === "lg" ? "1.3rem" : "1.05rem";
        const smallSize = size === "lg" ? "1rem" : "0.82rem";
        return `<span style="font-size:${bigSize};font-weight:900;color:var(--amber);">${escapeHtml(parts[0])}</span><span style="font-size:0.65rem;color:var(--text-faint);margin:0 3px;font-weight:400;">|</span><span style="font-size:${smallSize};font-weight:700;color:var(--amber-dark);">${escapeHtml(parts[1])}</span>`;
      }
      const fallback = pt || formatCompactPower(item.power);
      return `<span style="font-size:1.05rem;font-weight:800;color:var(--amber);">${escapeHtml(fallback)}</span>`;
    }

    // ── 탭 버튼 HTML ──
    function tabBarHtml(active) {
      return `
        <div class="rk-tab-bar">
          <button class="rk-tab-btn${active === "power" ? " rk-tab-active" : ""}" data-tab="power">
            ⚔️ 전투력
          </button>
          <button class="rk-tab-btn${active === "popularity" ? " rk-tab-active" : ""}" data-tab="popularity">
            ❤️ 인기도
          </button>
        </div>
      `;
    }

    // ── 전투력 탭: TOP3 히어로 ──
    function renderPowerHero(sorted) {
      if (sorted.length === 0) return "";
      const [first, second, third] = sorted;
      function heroCard(item, rank, center = false) {
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
            ${heroCard(second, 2)}
            ${heroCard(first, 1, true)}
            ${heroCard(third, 3)}
          </div>
        </div>
      `;
    }

    function cutlineDivider() {
      return `
        <div class="rk-cutline-divider">
          <div class="rk-cutline-line"></div>
          <div class="rk-cutline-badge">🏆 승격 컷라인 · TOP ${CUT}</div>
          <div class="rk-cutline-line"></div>
        </div>
      `;
    }

    function renderPowerCard(item, rank, allSorted) {
      const status = getStatusLabel(rank);
      const isCut = rank === CUT;
      const isJustBelow = rank === CUT + 1;
      const st = getStatus(rank);
      const cutDiff = (st === "danger" || st === "challenge") ? getCutDistance(item, allSorted) : null;

      let cardClass = "rk-compact-card";
      if (rank <= 3) cardClass += " rk-top3-card";
      if (isCut) cardClass += " rk-cut-card";
      if (st === "danger") cardClass += " rk-danger-card";
      if (st === "challenge") cardClass += " rk-challenge-card";

      return `
        ${isJustBelow ? `<div class="rk-below-line"><span>── 컷라인 이하 ──</span></div>` : ""}
        <div class="${cardClass}" data-character-row="${escapeHtml(String(item.name || "").toLowerCase())}">
          <div class="rk-c-rank">
            ${rank <= 3
              ? `<span style="font-size:1.6rem;">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>`
              : `<span class="rk-c-num ${st === "danger" ? "rk-num-danger" : st === "challenge" ? "rk-num-challenge" : ""}">${rank}</span>`
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
            <div class="rk-c-power">${powerSplitHtml(item)}</div>
            <div class="rk-c-server">${item.serverRank ? "서버 " + formatNumber(item.serverRank) + "위" : "-"}</div>
            ${status ? `<div class="rk-c-status" style="color:${status.color};background:${status.bg};border-color:${status.border};">${status.text}</div>` : ""}
            ${cutDiff !== null ? `<div style="margin-top:2px;">${cutDistanceHtml(cutDiff)}</div>` : ""}
          </div>
          ${isCut ? `<div class="rk-cut-marker">컷</div>` : ""}
        </div>
      `;
    }

    // ── 인기도 탭: 포디움(시상대) ──
    function renderPopularityPodium(sorted) {
      if (sorted.length === 0) return "";
      const [first, second, third] = sorted;

      function podiumCard(item, rank) {
        if (!item) return `<div class="rk-pod-slot"></div>`;
        const pop = formatNumber(Number(item.popularity || 0));
        const cfg = {
          1: {
            crown: "👑", color: "#f59e0b",
            bg: "linear-gradient(160deg,#fffbeb,#fef3c7)",
            border: "#f59e0b", avatarSize: "80px",
            nameSize: "1.05rem", popSize: "1.1rem",
            padding: "18px 12px 16px",
            shadow: "0 8px 32px rgba(245,158,11,0.35)",
            crownSize: "2.8rem", extraHeight: "30px"
          },
          2: {
            crown: "🥈", color: "#64748b",
            bg: "linear-gradient(160deg,#f8fafc,#f1f5f9)",
            border: "#94a3b8", avatarSize: "64px",
            nameSize: "0.9rem", popSize: "0.98rem",
            padding: "14px 10px 14px",
            shadow: "0 4px 16px rgba(148,163,184,0.2)",
            crownSize: "2.2rem", extraHeight: "0px"
          },
          3: {
            crown: "🥉", color: "#b45309",
            bg: "linear-gradient(160deg,#fdf8f5,#fef3ea)",
            border: "#d4a76a", avatarSize: "60px",
            nameSize: "0.88rem", popSize: "0.92rem",
            padding: "12px 8px 12px",
            shadow: "0 4px 12px rgba(180,83,9,0.15)",
            crownSize: "2rem", extraHeight: "0px"
          }
        }[rank];

        return `
          <div class="rk-pod-slot" style="align-self:flex-end;margin-bottom:${cfg.extraHeight};">
            <div style="
              background:${cfg.bg};
              border:2px solid ${cfg.border};
              box-shadow:${cfg.shadow};
              border-radius:16px;
              display:flex;flex-direction:column;align-items:center;
              padding:${cfg.padding};gap:5px;text-align:center;
              transition:transform 0.15s;
            " onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">
              <div style="font-size:${cfg.crownSize};line-height:1;">${cfg.crown}</div>
              <div style="width:${cfg.avatarSize};height:${cfg.avatarSize};border-radius:50%;overflow:hidden;border:2px solid ${cfg.border};">
                ${characterAvatarHtml(item)}
              </div>
              <div style="font-size:${cfg.nameSize};font-weight:800;color:var(--text);line-height:1.2;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${escapeHtml(item.name || "-")}
              </div>
              <div>${guildBadgeHtml(item.guild || "길드 없음")}</div>
              <div style="margin-top:3px;background:rgba(255,255,255,0.6);border-radius:8px;padding:4px 10px;">
                <div style="font-size:${cfg.popSize};font-weight:900;color:${cfg.color};">❤️ ${pop}</div>
                <div style="font-size:0.65rem;color:var(--text-faint);font-weight:500;">인기도</div>
              </div>
              ${item.serverRank ? `<div style="font-size:0.68rem;color:var(--text-faint);">서버 ${formatNumber(item.serverRank)}위</div>` : ""}
            </div>
          </div>
        `;
      }

      return `
        <div class="rk-pod-wrap">
          <div style="font-size:0.82rem;font-weight:700;color:var(--amber-dark);text-align:center;margin-bottom:14px;letter-spacing:0.04em;">
            ✨ 인기도 TOP 3 ✨
          </div>
          <div class="rk-pod-grid">
            ${podiumCard(second, 2)}
            ${podiumCard(first, 1)}
            ${podiumCard(third, 3)}
          </div>
          <div class="rk-pod-stage"></div>
        </div>
      `;
    }

    // ── 인기도 4위 이하 리스트 카드 ──
    function renderPopularityCard(item, rank) {
      const pop = formatNumber(Number(item.popularity || 0));
      const numColor = rank <= 10 ? "#d97706" : rank <= 20 ? "#059669" : "var(--text-soft)";
      const numWeight = rank <= 10 ? "800" : "700";

      return `
        <div class="rk-compact-card" data-pop-row="${escapeHtml(String(item.name || "").toLowerCase())}">
          <div class="rk-c-rank">
            <span class="rk-c-num" style="color:${numColor};font-weight:${numWeight};">${rank}</span>
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
            <div style="font-size:1.05rem;font-weight:900;color:#e11d48;white-space:nowrap;">❤️ ${pop}</div>
            <div class="rk-c-server">${item.serverRank ? "서버 " + formatNumber(item.serverRank) + "위" : "-"}</div>
          </div>
        </div>
      `;
    }

    // ── 전투력 탭 ──
    function renderPowerContent() {
      const heroHtml = renderPowerHero(sortedPower);
      const top3Html = sortedPower.slice(0, 3).map((item, i) => renderPowerCard(item, i + 1, sortedPower)).join("");
      const restHtml = sortedPower.slice(3).map((item, i) => renderPowerCard(item, i + 4, sortedPower)).join("");
      return `
        <div id="powerContent">
          <div style="padding:16px 0 4px;">
            <p style="font-size:0.85rem;color:var(--text-soft);margin:0;">전투력 기준 · ${formatNumber(sortedPower.length)}명 · TOP ${CUT} 친구들 길드 승격</p>
          </div>
          ${heroHtml}
          <div class="toolbar-card" style="margin-top:20px;">
            <label class="search-field">
              <span>🔎</span>
              <input id="rankingSearchInput" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
            </label>
            <button id="rankingResetButton" class="ghost-btn" type="button">초기화</button>
          </div>
          <div class="rk-list" id="rankingCardList">
            ${top3Html}
            ${cutlineDivider()}
            ${restHtml || createEmptyBox("랭킹 데이터가 없습니다.")}
          </div>
        </div>
      `;
    }

    // ── 인기도 탭 ──
    function renderPopularityContent() {
      if (sortedPopularity.length === 0) {
        return `<div style="padding:40px 0;">${createEmptyBox("인기도 데이터가 없습니다.")}</div>`;
      }
      const podiumHtml = renderPopularityPodium(sortedPopularity);
      const restHtml = sortedPopularity.slice(3).map((item, i) => renderPopularityCard(item, i + 4)).join("");
      return `
        <div id="popularityContent">
          <div style="padding:16px 0 4px;">
            <p style="font-size:0.85rem;color:var(--text-soft);margin:0;">인기도 기준 · ${formatNumber(sortedPopularity.length)}명</p>
          </div>
          ${podiumHtml}
          ${restHtml ? `
            <div class="rk-cutline-divider" style="margin:20px 0 12px;">
              <div class="rk-cutline-line"></div>
              <div class="rk-cutline-badge">4위 이하</div>
              <div class="rk-cutline-line"></div>
            </div>
            <div class="toolbar-card">
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

    // ── 전체 페이지 렌더 ──
    function renderPage(tab) {
      const content = tab === "power" ? renderPowerContent() : renderPopularityContent();
      document.querySelector("main").innerHTML = `
        <div class="page-card">
          <div class="container">
            <div style="padding:28px 0 8px;">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:4px;">
                <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0;">🏆 통합 랭킹</h1>
                <div style="display:flex;align-items:center;gap:6px;background:var(--yellow-bg);border:1px solid var(--yellow-border);border-radius:999px;padding:4px 14px;">
                  <span style="font-size:0.78rem;">📅</span>
                  <span style="font-size:0.78rem;font-weight:700;color:var(--amber-dark);">시즌 종료까지 ${getSeasonDaysLeft()}일</span>
                </div>
              </div>
            </div>

            ${tabBarHtml(tab)}
            ${content}
          </div>
        </div>
      `;

      // 탭 이벤트
      document.querySelectorAll(".rk-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          currentTab = btn.dataset.tab;
          renderPage(currentTab);
        });
      });

      // 전투력 검색
      if (tab === "power") {
        const input = document.getElementById("rankingSearchInput");
        const resetBtn = document.getElementById("rankingResetButton");
        const wrap = document.getElementById("rankingCardList");
        if (input && wrap) {
          function applySearch() {
            const kw = String(input.value || "").trim().toLowerCase();
            const cards = Array.from(wrap.querySelectorAll("[data-character-row]"));
            cards.forEach(c => c.classList.remove("highlight-card", "dim-card"));
            if (!kw) return;
            let first = null;
            cards.forEach(c => {
              if ((c.getAttribute("data-character-row") || "").includes(kw)) {
                c.classList.add("highlight-card");
                if (!first) first = c;
              } else {
                c.classList.add("dim-card");
              }
            });
            if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          input.addEventListener("input", applySearch);
          resetBtn.addEventListener("click", () => { input.value = ""; applySearch(); input.focus(); });
        }
      }

      // 인기도 검색
      if (tab === "popularity") {
        const input = document.getElementById("popSearchInput");
        const resetBtn = document.getElementById("popResetButton");
        const wrap = document.getElementById("popCardList");
        if (input && wrap) {
          function applyPopSearch() {
            const kw = String(input.value || "").trim().toLowerCase();
            const cards = Array.from(wrap.querySelectorAll("[data-pop-row]"));
            cards.forEach(c => c.classList.remove("highlight-card", "dim-card"));
            if (!kw) return;
            let first = null;
            cards.forEach(c => {
              if ((c.getAttribute("data-pop-row") || "").includes(kw)) {
                c.classList.add("highlight-card");
                if (!first) first = c;
              } else {
                c.classList.add("dim-card");
              }
            });
            if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          input.addEventListener("input", applyPopSearch);
          resetBtn.addEventListener("click", () => { input.value = ""; applyPopSearch(); input.focus(); });
        }
      }
    }

    renderPage(currentTab);

  } catch (error) {
    console.error(error);
    document.querySelector("main").innerHTML = `
      <div class="container" style="padding-top:40px;">
        <div class="error-box">데이터를 불러오지 못했습니다: ${escapeHtml(error?.message || "오류")}</div>
      </div>
    `;
  }
});