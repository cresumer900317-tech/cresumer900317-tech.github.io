document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const members = await getRankingData();
    const rows = Array.isArray(members) ? members : [];

    const sortedPower = [...rows].sort((a, b) => Number(b.power||0) - Number(a.power||0));
    const sortedPopularity = [...rows]
      .filter(r => Number(r.popularity||0) > 0)
      .sort((a, b) => Number(b.popularity||0) - Number(a.popularity||0));

    function rankChipHtml(rank) {
      if (rank === 1) return `<div class="rank-chip medal-gold">🥇</div>`;
      if (rank === 2) return `<div class="rank-chip medal-silver">🥈</div>`;
      if (rank === 3) return `<div class="rank-chip medal-bronze">🥉</div>`;
      return `<div class="rank-chip rank-default">${rank}</div>`;
    }

    function rankTrendHtml(item) {
      const diff = Number(item.serverRankDiff||0);
      if (diff > 0) return `<span style="color:#059669;font-weight:700;">▲${formatNumber(diff)}</span>`;
      if (diff < 0) return `<span style="color:#dc2626;font-weight:700;">▼${formatNumber(Math.abs(diff))}</span>`;
      return `<span style="color:#9ca3af;">—</span>`;
    }

    function podiumHtml(top3, valueFmt, subFmt) {
      if (!top3.length) return "";
      const order = [top3[1], top3[0], top3[2]].filter(Boolean);
      const heights = ["podium-block-2", "podium-block-1", "podium-block-3"];
      const medals = ["🥈", "🥇", "🥉"];
      const ranks = [2, 1, 3];

      return `
        <div class="podium-wrap">
          ${order.map((item, i) => {
            const isFirst = ranks[i] === 1;
            return `
              <div class="podium-col${isFirst ? " podium-first" : ""}">
                ${isFirst ? `<div class="podium-crown">👑</div>` : ""}
                <div class="podium-avatar">${characterAvatarHtml(item)}</div>
                <div class="podium-name">${escapeHtml(item.name||"-")}</div>
                <div class="podium-guild">${guildBadgeHtml(item.guild||"")}</div>
                <div class="podium-value${isFirst ? " podium-value-first" : ""}">${valueFmt(item)}</div>
                <div class="podium-sub">${subFmt(item)}</div>
                <div class="podium-block ${heights[i]}">
                  <span class="podium-medal">${medals[i]}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    function renderCards(list, valueFmt) {
      return list.map((item, idx) => {
        const rank = idx + 1;
        const pt = item.powerText||"";
        const parts = pt.trim().split(/\s+/).filter(Boolean);
        const displayPower = parts.length >= 2 ? parts[0]+" "+parts[1] : pt||formatCompactPower(item.power);

        return `
          <article class="list-card" data-character-row="${escapeHtml(String(item.name||"").toLowerCase())}">
            <div class="card-left">
              ${rankChipHtml(rank)}
              ${characterAvatarHtml(item)}
            </div>
            <div class="card-main">
              <div class="card-topline">
                <div>
                  <div class="rank-name">${escapeHtml(item.name||"-")}</div>
                  <div class="rank-subline">
                    ${guildBadgeHtml(item.guild||"길드 없음")}
                    <span class="job-text">${escapeHtml(item.job||"-")}</span>
                    <span class="level-text">Lv ${escapeHtml(String(item.level||"-"))}</span>
                  </div>
                </div>
                <div class="rank-power">${valueFmt(item)}</div>
              </div>
              <div class="meta-grid four">
                <div class="mini-stat"><span>서버 순위</span><strong>${item.serverRank ? formatNumber(item.serverRank)+"위" : "-"}</strong></div>
                <div class="mini-stat"><span>전투력</span><strong>${escapeHtml(displayPower)}</strong></div>
                <div class="mini-stat"><span>인기도</span><strong>${formatNumber(item.popularity||0)}</strong></div>
                <div class="mini-stat"><span>서버 변동</span><strong>${rankTrendHtml(item)}</strong></div>
              </div>
            </div>
          </article>
        `;
      }).join("");
    }

    function renderTab(tab) {
      const isPower = tab === "power";
      const list = isPower ? sortedPower : sortedPopularity;
      const top3 = list.slice(0, 3);

      const valueFmt = isPower
        ? item => { const pt = item.powerText||""; const p = pt.trim().split(/\s+/).filter(Boolean); return escapeHtml(p.length>=2?p[0]+" "+p[1]:pt||formatCompactPower(item.power)); }
        : item => `❤️ ${formatNumber(item.popularity||0)}`;
      const subFmt = item => `서버 ${item.serverRank ? formatNumber(item.serverRank)+"위" : "-"}`;

      document.querySelectorAll(".ranking-tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === tab);
      });
      document.getElementById("rankingSubtitle").textContent =
        `${isPower ? "전투력" : "인기도"} 기준 · ${formatNumber(list.length)}명`;
      document.getElementById("podiumArea").innerHTML = podiumHtml(top3, valueFmt, subFmt);
      document.getElementById("rankingCardList").innerHTML = list.length
        ? renderCards(list, valueFmt)
        : `<div class="empty-box">데이터가 없습니다</div>`;
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div class="section-head" style="margin-bottom:16px;">
            <div>
              <div class="section-title">🏆 통합 랭킹</div>
              <div class="section-sub" id="rankingSubtitle"></div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:20px;">
            <button class="ranking-tab-btn active" data-tab="power" onclick="switchTab('power')">⚔️ 전투력</button>
            <button class="ranking-tab-btn" data-tab="popularity" onclick="switchTab('popularity')">❤️ 인기도</button>
          </div>
          <div id="podiumArea"></div>
          <div class="toolbar-card" style="margin-top:20px;">
            <label class="search-field">
              <span>🔎</span>
              <input id="rankingSearchInput" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
            </label>
            <button id="rankingResetButton" class="ghost-btn" type="button">초기화</button>
          </div>
          <div class="stack-list" id="rankingCardList" style="margin-top:12px;"></div>
        </div>
      </div>
    `;

    renderTab("power");
    window.switchTab = function(tab) { renderTab(tab); };

    const input = document.getElementById("rankingSearchInput");
    const resetButton = document.getElementById("rankingResetButton");

    function applySearch() {
      const keyword = String(input.value||"").trim().toLowerCase();
      const cards = Array.from(document.querySelectorAll("#rankingCardList [data-character-row]"));
      cards.forEach(card => card.classList.remove("highlight-card", "dim-card"));
      if (!keyword) return;
      let firstMatch = null;
      cards.forEach(card => {
        const name = card.getAttribute("data-character-row")||"";
        if (name.includes(keyword)) {
          card.classList.add("highlight-card");
          if (!firstMatch) firstMatch = card;
        } else {
          card.classList.add("dim-card");
        }
      });
      if (firstMatch) firstMatch.scrollIntoView({ behavior:"smooth", block:"center" });
    }

    input.addEventListener("input", applySearch);
    resetButton.addEventListener("click", () => { input.value=""; applySearch(); input.focus(); });

  } catch(error) {
    console.error(error);
    document.querySelector("main").innerHTML = `
      <div class="container" style="padding-top:40px;">
        <div class="error-box">데이터를 불러오지 못했습니다: ${escapeHtml(error?.message||"오류")}</div>
      </div>
    `;
  }
});