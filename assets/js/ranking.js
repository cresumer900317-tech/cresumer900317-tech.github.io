document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const members = await getRankingData();
    const rows = Array.isArray(members) ? members : [];
    const sorted = [...rows].sort((a, b) => Number(b.power || 0) - Number(a.power || 0));

    const CUT = 30;

    // 시즌 타이머: 매달 말일까지 남은 일수
    function getSeasonDaysLeft() {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const diff = Math.ceil((lastDay - now) / (1000 * 60 * 60 * 24));
      return diff;
    }

    // 컷라인 거리 계산
    function getCutDistance(item, sorted) {
      const cutItem = sorted[CUT - 1];
      if (!cutItem) return null;
      const cutPower = Number(cutItem.power || 0);
      const myPower = Number(item.power || 0);
      const diff = myPower - cutPower;
      return diff;
    }

    function cutDistanceHtml(diff) {
      if (diff === null) return "";
      if (diff >= 0) {
        return `<span style="font-size:0.72rem;color:#059669;font-weight:600;">+${formatCompactPower(diff)} 여유</span>`;
      }
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

    // 전투력 조/억 분리 HTML
    function powerSplitHtml(item, size = "md") {
      const pt = item.powerText || "";
      const parts = pt.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const big = parts[0];   // "3조"
        const small = parts[1]; // "8,374억"
        const bigSize = size === "lg" ? "1.3rem" : "1.05rem";
        const smallSize = size === "lg" ? "1rem" : "0.82rem";
        return `<span style="font-size:${bigSize};font-weight:900;color:var(--amber);">${escapeHtml(big)}</span><span style="font-size:0.65rem;color:var(--text-faint);margin:0 3px;font-weight:400;">|</span><span style="font-size:${smallSize};font-weight:700;color:var(--amber-dark);">${escapeHtml(small)}</span>`;
      }
      const fallback = pt || formatCompactPower(item.power);
      return `<span style="font-size:1.05rem;font-weight:800;color:var(--amber);">${escapeHtml(fallback)}</span>`;
    }

    function getPower(item) {
      const pt = item.powerText || "";
      const parts = pt.trim().split(/\s+/).filter(Boolean);
      return parts.length >= 2 ? parts[0] + " " + parts[1] : pt || formatCompactPower(item.power);
    }

    // ── TOP3 히어로 ──
    function renderHero(sorted) {
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

    // ── 컷라인 구분선 ──
    function cutlineDivider() {
      return `
        <div class="rk-cutline-divider">
          <div class="rk-cutline-line"></div>
          <div class="rk-cutline-badge">🏆 승격 컷라인 · TOP ${CUT}</div>
          <div class="rk-cutline-line"></div>
        </div>
      `;
    }

    // ── 압축형 카드 ──
    function renderCompactCard(item, rank, allSorted) {
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

    const heroHtml = renderHero(sorted);
    const top3Html = sorted.slice(0, 3).map((item, i) => renderCompactCard(item, i + 1, sorted)).join("");
    const restHtml = sorted.slice(3).map((item, i) => renderCompactCard(item, i + 4, sorted)).join("");

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
            <p style="font-size:0.85rem;color:var(--text-soft);margin:0;">전투력 기준 · ${formatNumber(sorted.length)}명 · TOP ${CUT} 친구들 길드 승격</p>
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
      </div>
    `;

    const input = document.getElementById("rankingSearchInput");
    const resetButton = document.getElementById("rankingResetButton");
    const wrap = document.getElementById("rankingCardList");

    function applySearch() {
      const keyword = String(input.value || "").trim().toLowerCase();
      const cards = Array.from(wrap.querySelectorAll("[data-character-row]"));
      cards.forEach(c => c.classList.remove("highlight-card", "dim-card"));
      if (!keyword) return;
      let firstMatch = null;
      cards.forEach(c => {
        const name = c.getAttribute("data-character-row") || "";
        if (name.includes(keyword)) {
          c.classList.add("highlight-card");
          if (!firstMatch) firstMatch = c;
        } else {
          c.classList.add("dim-card");
        }
      });
      if (firstMatch) firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    input.addEventListener("input", applySearch);
    resetButton.addEventListener("click", () => { input.value = ""; applySearch(); input.focus(); });

  } catch (error) {
    console.error(error);
    document.querySelector("main").innerHTML = `
      <div class="container" style="padding-top:40px;">
        <div class="error-box">데이터를 불러오지 못했습니다: ${escapeHtml(error?.message || "오류")}</div>
      </div>
    `;
  }
});