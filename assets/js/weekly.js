document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const API_BASE = "https://guild-backend-production-75a6.up.railway.app";
    const res = await fetch(`${API_BASE}/api/monthly`, { cache: "no-store" });
    if (!res.ok) throw new Error("월간 성장 데이터를 불러오지 못했습니다.");
    const members = await res.json();
    const rows = Array.isArray(members) ? members : [];

    const now = new Date();
    const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    const hasSnapshot = rows.some(r => r.hasSnapshot);
    const snapDateLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월 5일`;

    const sorted = [...rows].sort((a, b) => Number(b.monthlyDiff || 0) - Number(a.monthlyDiff || 0));

    function monthlyServerDiffHtml(item) {
      const diff = item.monthlyServerDiff;
      if (diff === null || diff === undefined) return "-";
      if (diff > 0) return `<span class="metric-up">▲${formatNumber(diff)}</span>`;
      if (diff < 0) return `<span class="metric-down">▼${formatNumber(Math.abs(diff))}</span>`;
      return `<span class="metric-neutral">-</span>`;
    }

    function renderCards(list) {
      if (!list.length) return createEmptyBox("데이터가 없습니다.");

      return list.map((item, idx) => {
        const rank = idx + 1;
        const pt = item.powerText || "";
        const parts = pt.trim().split(/\s+/).filter(Boolean);
        const displayPower = parts.length >= 2 ? parts[0] + " " + parts[1] : pt || formatCompactPower(item.power);

        const monthlyDiff = item.monthlyDiff;
        let diffHtml = "-";
        if (!item.hasSnapshot) {
          diffHtml = `<span style="color:var(--text-faint);font-size:0.78rem;">기준 없음</span>`;
        } else if (monthlyDiff !== null && monthlyDiff !== undefined) {
          diffHtml = metricHtml(monthlyDiff);
        }

        const growthRateHtml = item.growthRate !== null && item.growthRate !== undefined
          ? formatRate(item.growthRate)
          : (item.hasSnapshot ? "0.00%" : "-");

        return `
          <article class="list-card" data-character-row="${escapeHtml((item.name || "").toLowerCase())}">
            <div class="card-left">
              ${rank <= 3
                ? `<div class="rank-chip ${rank === 1 ? "medal-gold" : rank === 2 ? "medal-silver" : "medal-bronze"}">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</div>`
                : `<div class="rank-chip rank-default">${rank}</div>`
              }
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
              <div class="meta-grid four">
                <div class="mini-stat"><span>월간 성장량</span><strong>${diffHtml}</strong></div>
                <div class="mini-stat"><span>성장률</span><strong>${growthRateHtml}</strong></div>
                <div class="mini-stat"><span>서버 순위 변동</span><strong>${monthlyServerDiffHtml(item)}</strong></div>
                <div class="mini-stat"><span>현재 서버 순위</span><strong>${item.serverRank ? formatNumber(item.serverRank) + "위" : "-"}</strong></div>
              </div>
            </div>
          </article>
        `;
      }).join("");
    }

    const snapshotBanner = hasSnapshot ? `
      <div style="
        display:flex; align-items:center; gap:8px;
        background:var(--yellow-bg);
        border:1px solid var(--yellow-border);
        border-radius:var(--radius-md);
        padding:10px 16px;
        font-size:0.83rem;
        color:var(--amber-dark);
        margin-bottom:20px;
      ">
        📌 기준일 <strong style="margin:0 4px;">${snapDateLabel}</strong> 전투력 대비 현재 성장량 · 매달 1일 자동 갱신
      </div>
    ` : `
      <div style="
        background:var(--yellow-bg);
        border:1px solid var(--yellow-border);
        border-radius:var(--radius-md);
        padding:10px 16px;
        font-size:0.83rem;
        color:var(--amber-dark);
        margin-bottom:20px;
      ">
        📌 매달 1일에 기준 전투력이 자동 저장됩니다. 스냅샷 생성 이후부터 성장량이 표시됩니다.
      </div>
    `;

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:32px 0 20px;">
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:8px;">
              <h1 style="font-size:1.7rem; font-weight:800; color:var(--text); margin:0; line-height:1;">
                📈 월간 성장
              </h1>
              <span style="
                font-size:0.95rem; font-weight:700;
                color:var(--white); background:var(--amber);
                border-radius:999px; padding:3px 14px; line-height:1.6;
              ">${monthLabel}</span>
            </div>
            <p style="font-size:0.88rem; color:var(--text-soft); margin:0;">
              이번 달 전투력 성장량 기준으로 정렬돼요
            </p>
          </div>

          ${snapshotBanner}

          <div class="toolbar-card">
            <label class="search-field">
              <span>🔎</span>
              <input id="monthlySearchInput" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
            </label>
            <button id="monthlyResetButton" class="ghost-btn" type="button">초기화</button>
          </div>

          <div class="stack-list" id="monthlyCardList">
            ${renderCards(sorted)}
          </div>
        </div>
      </div>
    `;

    const input = document.getElementById("monthlySearchInput");
    const resetButton = document.getElementById("monthlyResetButton");
    const wrap = document.getElementById("monthlyCardList");

    function applySearch() {
      const keyword = String(input.value || "").trim().toLowerCase();
      const cards = Array.from(wrap.querySelectorAll("[data-character-row]"));
      cards.forEach(card => card.classList.remove("highlight-card", "dim-card"));
      if (!keyword) return;
      let firstMatch = null;
      cards.forEach(card => {
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