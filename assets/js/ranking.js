document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const members = await getRankingData();
    const rows = Array.isArray(members) ? members : [];

    const sorted = [...rows].sort((a, b) => Number(b.power || 0) - Number(a.power || 0));

    function rankChipHtml(rank) {
      if (rank === 1) return `<div class="rank-chip medal-gold">🥇</div>`;
      if (rank === 2) return `<div class="rank-chip medal-silver">🥈</div>`;
      if (rank === 3) return `<div class="rank-chip medal-bronze">🥉</div>`;
      return `<div class="rank-chip rank-default">${rank}</div>`;
    }

    function renderCards(list) {
      return list.map((item, idx) => {
        const rank = idx + 1;
        const pt = item.powerText || "";
        const parts = pt.trim().split(/\s+/).filter(Boolean);
        const displayPower = parts.length >= 2 ? parts[0] + " " + parts[1] : pt || formatCompactPower(item.power);
        return `
          <article class="list-card" data-character-row="${escapeHtml(String(item.name || "").toLowerCase())}">
            <div class="card-left">
              ${rankChipHtml(rank)}
              ${characterAvatarHtml(item)}
            </div>
            <div class="card-main">
              <div class="card-topline">
                <div>
                  <div class="rank-name">${escapeHtml(item.name || "-")}</div>
                  <div class="rank-subline">
                    ${guildBadgeHtml(item.guild || "길드 없음")}
                    <span class="job-text">${escapeHtml(item.job || "-")}</span>
                    <span class="level-text">Lv ${escapeHtml(String(item.level || "-"))}</span>
                  </div>
                </div>
                <div class="rank-power">${escapeHtml(displayPower)}</div>
              </div>
              <div class="meta-grid">
                <div class="mini-stat"><span>서버 순위</span><strong>${item.serverRank ? formatNumber(item.serverRank) + "위" : "-"}</strong></div>
                <div class="mini-stat"><span>통합 순위</span><strong>${item.overallRank ? formatNumber(item.overallRank) + "위" : "-"}</strong></div>
                <div class="mini-stat"><span>인기도</span><strong>${formatNumber(item.popularity || 0)}</strong></div>
              </div>
            </div>
          </article>
        `;
      }).join("");
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="section-title">통합 랭킹</div>
              <div class="section-sub">전투력 기준 · ${formatNumber(sorted.length)}명</div>
            </div>
          </div>
          <div class="toolbar-card">
            <label class="search-field">
              <span>🔎</span>
              <input id="rankingSearchInput" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
            </label>
            <button id="rankingResetButton" class="ghost-btn" type="button">초기화</button>
          </div>
          <div class="stack-list" id="rankingCardList">
            ${sorted.length ? renderCards(sorted) : createEmptyBox("랭킹 데이터가 없습니다.")}
          </div>
        </div>
      </div>
    `;

    // 검색 기능
    const input = document.getElementById("rankingSearchInput");
    const resetButton = document.getElementById("rankingResetButton");
    const wrap = document.getElementById("rankingCardList");

    function applySearch() {
      const keyword = String(input.value || "").trim().toLowerCase();
      const cards = Array.from(wrap.querySelectorAll("[data-character-row]"));
      cards.forEach((card) => card.classList.remove("highlight-card", "dim-card"));
      if (!keyword) return;
      let firstMatch = null;
      cards.forEach((card) => {
        const name = card.getAttribute("data-character-row") || "";
        if (name.includes(keyword)) {
          card.classList.add("highlight-card");
          if (!firstMatch) firstMatch = card;
        } else {
          card.classList.add("dim-card");
        }
      });
      if (firstMatch) firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    input.addEventListener("input", applySearch);
    resetButton.addEventListener("click", () => {
      input.value = "";
      applySearch();
      input.focus();
    });

  } catch (error) {
    console.error(error);
    document.querySelector("main").innerHTML = `
      <div class="container" style="padding-top:40px;">
        <div class="error-box">데이터를 불러오지 못했습니다: ${escapeHtml(error?.message || "오류")}</div>
      </div>
    `;
  }
});