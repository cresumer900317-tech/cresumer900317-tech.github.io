document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const members = await getGuildsData();
    const rows = Array.isArray(members) ? members : [];
    const guilds = ["친구들", "친구둘", "친구삼", "친구넷", "친구닷"];

    let currentGuild = "전체";

    function getFiltered() {
      if (currentGuild === "전체") return rows;
      return rows.filter((r) => r.guild === currentGuild);
    }

    function rankChipHtml(rank) {
      if (rank === 1) return `<div class="rank-chip medal-gold">🥇</div>`;
      if (rank === 2) return `<div class="rank-chip medal-silver">🥈</div>`;
      if (rank === 3) return `<div class="rank-chip medal-bronze">🥉</div>`;
      return `<div class="rank-chip rank-default">${rank}</div>`;
    }

    function renderList(list) {
      const sorted = [...list].sort((a, b) => Number(b.power || 0) - Number(a.power || 0));
      return sorted.map((item, idx) => {
        const rank = idx + 1;
        const pt = item.powerText || "";
        const parts = pt.trim().split(/\s+/).filter(Boolean);
        const displayPower = parts.length >= 2 ? parts[0] + " " + parts[1] : pt || formatCompactPower(item.power);
        return `
          <article class="list-card">
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

    function render() {
      const filtered = getFiltered();
      const listHtml = filtered.length
        ? renderList(filtered)
        : createEmptyBox("해당 길드에 멤버가 없습니다.");

      document.getElementById("members-list").innerHTML = listHtml;
      document.getElementById("members-count").textContent = `${formatNumber(filtered.length)}명`;

      document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.guild === currentGuild);
      });
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="section-title">길드원</div>
              <div class="section-sub">전투력 기준 정렬 · <span id="members-count">-</span></div>
            </div>
          </div>
          <div class="tab-bar">
            <button class="tab-btn is-active" data-guild="전체">전체</button>
            ${guilds.map((g) => `<button class="tab-btn" data-guild="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join("")}
          </div>
          <div class="stack-list" id="members-list">
            <div class="loading-box">불러오는 중...</div>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentGuild = btn.dataset.guild;
        render();
      });
    });

    render();

  } catch (error) {
    console.error(error);
    document.querySelector("main").innerHTML = `
      <div class="container" style="padding-top:40px;">
        <div class="error-box">데이터를 불러오지 못했습니다: ${escapeHtml(error?.message || "오류")}</div>
      </div>
    `;
  }
});