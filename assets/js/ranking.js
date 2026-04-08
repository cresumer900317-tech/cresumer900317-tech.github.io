document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const members = await getRankingData();
    const rows = Array.isArray(members) ? members : [];

    // ── 전투력 정렬 ──
    const sortedPower = [...rows].sort((a, b) => Number(b.power || 0) - Number(a.power || 0));

    // ── 인기도 정렬 (0 또는 null 제외) ──
    const sortedPopularity = [...rows]
      .filter(m => m.popularity != null && Number(m.popularity) > 0)
      .sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0));

    const CUT = 30;
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
      return Number(item.power || 0) - Number(cutItem.power || 0);
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

    // ── 탭 바 ──
    function tabBarHtml(active) {
      return `
        <div class="rk-tab-bar">
          <button class="rk-tab-btn${active === "power" ? " rk-tab-active" : ""}" data-tab="power">⚔️ 전투력</button>
          <button class="rk-tab-btn${active === "popularity" ? " rk-tab-active" : ""}" data-tab="popularity">❤️ 인기도</button>
        </div>
      `;
    }

    // ════════════════════════════════
    //  전투력 탭
    // ════════════════════════════════
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

    // ════════════════════════════════
    //  인기도 탭: 포디움
    // ════════════════════════════════
    function renderPopularityPodium(sorted) {
      if (sorted.length === 0) return "";
      const [first, second, third] = sorted;

      // 인기도 기준 길드 내 순위 배지 표시용
      // serverRank = 전투력 기준 서버 순위 (크롤링된 값 그대로 활용)
      function podiumCard(item, rank) {
        if (!item) return `<div class="rk-pod-slot"></div>`;
        const pop = formatNumber(Number(item.popularity || 0));

        const cfg = {
          1: {
            crown: "👑",
            accentColor: "#d97706",
            borderColor: "#f59e0b",
            bg: "linear-gradient(170deg, #fffbeb 0%, #fef3c7 100%)",
            shadow: "0 12px 40px rgba(245,158,11,0.4)",
            avatarSize: "110px",
            crownSize: "3.2rem",
            nameSize: "1.15rem",
            popSize: "1.5rem",
            popLabelSize: "0.75rem",
            padding: "22px 16px 20px",
            rankBadge: `<div style="
              position:absolute;top:-14px;left:50%;transform:translateX(-50%);
              background:#f59e0b;color:#fff;font-size:0.72rem;font-weight:800;
              padding:3px 12px;border-radius:999px;white-space:nowrap;
              box-shadow:0 2px 8px rgba(245,158,11,0.5);letter-spacing:0.05em;
            ">✨ 1위</div>`,
            extraBottom: "28px",
          },
          2: {
            crown: "🥈",
            accentColor: "#475569",
            borderColor: "#94a3b8",
            bg: "linear-gradient(170deg, #f8fafc 0%, #e2e8f0 100%)",
            shadow: "0 6px 20px rgba(100,116,139,0.2)",
            avatarSize: "88px",
            crownSize: "2.4rem",
            nameSize: "1rem",
            popSize: "1.2rem",
            popLabelSize: "0.68rem",
            padding: "16px 12px 16px",
            rankBadge: `<div style="
              position:absolute;top:-12px;left:50%;transform:translateX(-50%);
              background:#94a3b8;color:#fff;font-size:0.68rem;font-weight:800;
              padding:2px 10px;border-radius:999px;white-space:nowrap;
            ">2위</div>`,
            extraBottom: "0px",
          },
          3: {
            crown: "🥉",
            accentColor: "#92400e",
            borderColor: "#c9873a",
            bg: "linear-gradient(170deg, #fdf8f3 0%, #fdecd4 100%)",
            shadow: "0 6px 16px rgba(180,83,9,0.18)",
            avatarSize: "82px",
            crownSize: "2.2rem",
            nameSize: "0.95rem",
            popSize: "1.1rem",
            popLabelSize: "0.65rem",
            padding: "14px 10px 14px",
            rankBadge: `<div style="
              position:absolute;top:-12px;left:50%;transform:translateX(-50%);
              background:#c9873a;color:#fff;font-size:0.65rem;font-weight:800;
              padding:2px 10px;border-radius:999px;white-space:nowrap;
            ">3위</div>`,
            extraBottom: "0px",
          },
        }[rank];

        return `
          <div class="rk-pod-slot" style="align-self:flex-end;margin-bottom:${cfg.extraBottom};">
            <div style="
              position:relative;
              background:${cfg.bg};
              border:2px solid ${cfg.borderColor};
              box-shadow:${cfg.shadow};
              border-radius:20px;
              display:flex;flex-direction:column;align-items:center;
              padding:${cfg.padding};gap:8px;text-align:center;
              transition:transform 0.18s, box-shadow 0.18s;
              width:100%;
            "
            onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='${cfg.shadow.replace(')', ', 1.2)')}'"
            onmouseout="this.style.transform='';this.style.boxShadow='${cfg.shadow}'">
              ${cfg.rankBadge}
              <div style="font-size:${cfg.crownSize};line-height:1;margin-top:6px;">${cfg.crown}</div>
              <div style="
                width:${cfg.avatarSize};height:${cfg.avatarSize};
                border-radius:50%;overflow:hidden;
                border:3px solid ${cfg.borderColor};
                box-shadow:0 4px 12px rgba(0,0,0,0.12);
                flex-shrink:0;
              ">${characterAvatarHtml(item)}</div>
              <div style="
                font-size:${cfg.nameSize};font-weight:800;
                color:var(--text);line-height:1.2;
                max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
              ">${escapeHtml(item.name || "-")}</div>
              <div>${guildBadgeHtml(item.guild || "길드 없음")}</div>
              <div style="
                background:rgba(255,255,255,0.75);
                border:1px solid ${cfg.borderColor};
                border-radius:12px;padding:8px 14px;
                margin-top:2px;min-width:90px;
              ">
                <div style="font-size:${cfg.popSize};font-weight:900;color:${cfg.accentColor};line-height:1.1;">
                  ❤️ ${pop}
                </div>
                <div style="font-size:${cfg.popLabelSize};color:var(--text-faint);font-weight:600;margin-top:2px;">인기도</div>
              </div>
              ${item.serverRank
                ? `<div style="font-size:0.7rem;color:var(--text-faint);">서버 전투력 ${formatNumber(item.serverRank)}위</div>`
                : ""}
            </div>
          </div>
        `;
      }

      return `
        <div class="rk-pod-wrap">
          <div style="
            font-size:0.88rem;font-weight:700;color:var(--amber-dark);
            text-align:center;margin-bottom:18px;letter-spacing:0.06em;
          ">✨ 인기도 TOP 3 · Scania 11 서버 ✨</div>
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
      let numColor, numWeight;
      if (rank <= 10) { numColor = "#d97706"; numWeight = "800"; }
      else if (rank <= 20) { numColor = "#059669"; numWeight = "700"; }
      else { numColor = "var(--text-soft)"; numWeight = "700"; }

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
            <div class="rk-c-server">${item.serverRank ? "서버 전투력 " + formatNumber(item.serverRank) + "위" : "-"}</div>
          </div>
        </div>
      `;
    }

    // ════════════════════════════════
    //  탭별 컨텐츠 조립
    // ════════════════════════════════
    function renderPowerContent() {
      const heroHtml = renderPowerHero(sortedPower);
      const top3Html = sortedPower.slice(0, 3).map((item, i) => renderPowerCard(item, i + 1, sortedPower)).join("");
      const restHtml = sortedPower.slice(3).map((item, i) => renderPowerCard(item, i + 4, sortedPower)).join("");
      return `
        <div id="powerContent">
          <p style="font-size:0.85rem;color:var(--text-soft);margin:12px 0 0;">전투력 기준 · ${formatNumber(sortedPower.length)}명 · TOP ${CUT} 친구들 길드 승격</p>
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

    function renderPopularityContent() {
      if (sortedPopularity.length === 0) {
        return `<div style="padding:40px 0;">${createEmptyBox("인기도 데이터가 없습니다.")}</div>`;
      }
      const podiumHtml = renderPopularityPodium(sortedPopularity);
      const restHtml = sortedPopularity.slice(3).map((item, i) => renderPopularityCard(item, i + 4)).join("");
      return `
        <div id="popularityContent">
          <p style="font-size:0.85rem;color:var(--text-soft);margin:12px 0 0;">인기도 기준 · ${formatNumber(sortedPopularity.length)}명 · Scania 11 서버</p>
          ${podiumHtml}
          ${restHtml ? `
            <div class="rk-cutline-divider" style="margin:24px 0 14px;">
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

    // ════════════════════════════════
    //  페이지 렌더 + 이벤트 바인딩
    // ════════════════════════════════
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

      // 탭 전환
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
                c.classList.add("highlight-card"); if (!first) first = c;
              } else { c.classList.add("dim-card"); }
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
                c.classList.add("highlight-card"); if (!first) first = c;
              } else { c.classList.add("dim-card"); }
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