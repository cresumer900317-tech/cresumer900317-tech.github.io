document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const res = await fetch(`${API_BASE}/api/monthly`, { cache: "no-store" });
    if (!res.ok) throw new Error("월간 성장 데이터를 불러오지 못했습니다.");
    const members = await res.json();
    const rows = Array.isArray(members) ? members : [];

    const now = new Date();
    const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    const hasSnapshot = rows.some(r => r.hasSnapshot);
    const snapDateLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월 5일`;

    let currentTab = "power";

    // ── 전투력 정렬 ──
    const sortedPower = [...rows].sort((a, b) => Number(b.monthlyDiff || 0) - Number(a.monthlyDiff || 0));
    // ── 인기도 정렬 (인기도 > 0인 멤버만) ──
    const sortedPop = [...rows]
      .filter(r => (r.popularity || 0) > 0)
      .sort((a, b) => Number(b.popDiff || 0) - Number(a.popDiff || 0));

    // ── 공통 함수 ──
    function guildClass(guild) {
      const map = { "친구들": "f1", "친구둘": "f2", "친구삼": "f3", "친구넷": "f4", "친구닷": "f5" };
      return "monthly-guild-badge guild-" + (map[guild] || "none");
    }

    // ── 전투력 전용 함수 ──
    function serverDiffHtml(item) {
      const diff = item.monthlyServerDiff;
      if (!diff) return `<span style="color:var(--text-faint);font-size:0.82rem;">변동없음</span>`;
      if (diff > 0) return `<span style="color:#059669;font-weight:700;font-size:0.92rem;">▲${formatNumber(diff)}</span>`;
      return `<span style="color:#dc2626;font-weight:700;font-size:0.92rem;">▼${formatNumber(Math.abs(diff))}</span>`;
    }

    function growthValueHtml(item) {
      const diff = item.monthlyDiff;
      if (!item.hasSnapshot) return `<span style="color:var(--text-faint);font-size:0.85rem;">기준 없음</span>`;
      if (!diff) return `<span style="color:var(--text-faint);">-</span>`;
      const absVal = formatCompactPower(Math.abs(diff));
      const color = diff > 0 ? "#d97706" : "#dc2626";
      const sign = diff > 0 ? "+" : "-";
      return `<span style="color:${color};font-size:1.5rem;font-weight:900;line-height:1;letter-spacing:-0.5px;">${sign}${absVal}</span>`;
    }

    function growthRateHtml(item) {
      const rate = item.growthRate;
      if (rate === null || rate === undefined || !item.hasSnapshot) return "";
      const num = Number(rate);
      let color = "var(--text-soft)";
      let suffix = "";
      if (num >= 10) { color = "#d97706"; suffix = " 🔥"; }
      else if (num >= 5) { color = "#b45309"; suffix = " 🔥"; }
      else if (num > 0) { color = "#92400e"; }
      return `<span style="font-size:0.85rem;font-weight:600;color:${color};">성장률 ${formatRate(rate)}${suffix}</span>`;
    }

    // ── 인기도 전용 함수 ──
    function popDiffHtml(item) {
      const diff = item.popDiff;
      if (!item.hasSnapshot) return `<span style="color:var(--text-faint);font-size:0.85rem;">기준 없음</span>`;
      if (diff === null || diff === undefined) return `<span style="color:var(--text-faint);">-</span>`;
      if (diff === 0) return `<span style="color:var(--text-faint);font-size:1.3rem;font-weight:900;">±0</span>`;
      const color = diff > 0 ? "#e11d48" : "#6b7280";
      const sign = diff > 0 ? "+" : "";
      return `<span style="color:${color};font-size:1.5rem;font-weight:900;line-height:1;letter-spacing:-0.5px;">${sign}${formatNumber(diff)}</span>`;
    }

    function popRankDiffHtml(item) {
      const diff = item.monthlyPopRankDiff;
      if (!diff) return `<span style="color:var(--text-faint);font-size:0.82rem;">변동없음</span>`;
      if (diff > 0) return `<span style="color:#059669;font-weight:700;font-size:0.92rem;">▲${formatNumber(diff)}</span>`;
      return `<span style="color:#dc2626;font-weight:700;font-size:0.92rem;">▼${formatNumber(Math.abs(diff))}</span>`;
    }

    // ── 카드 렌더링 ──
    function renderPowerCards(list) {
      if (!list.length) return createEmptyBox("데이터가 없습니다.");
      return list.map((item, idx) => {
        const rank = idx + 1;
        const isFirst = rank === 1;
        const displayPower = getPowerDisplay(item);
        return `
          <article class="list-card monthly-card${isFirst ? " monthly-card-first" : ""}" data-character-row="${escapeHtml((item.name || "").toLowerCase())}">
            ${isFirst ? `<div class="monthly-first-badge">🔥 이번달 1위</div>` : ""}
            <div class="card-left">
              ${rank <= 3
                ? `<div class="rank-chip ${rank === 1 ? "medal-gold" : rank === 2 ? "medal-silver" : "medal-bronze"}">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</div>`
                : `<div class="rank-chip rank-default">${rank}</div>`
              }
              ${characterAvatarHtml(item)}
            </div>
            <div class="card-main">
              <div class="monthly-card-top">
                <div class="monthly-name-block">
                  <span class="monthly-name">${escapeHtml(item.name || "-")}</span>
                  <span class="${guildClass(item.guild)}">${escapeHtml(item.guild || "-")}</span>
                  <span class="monthly-meta-line">${escapeHtml(item.job || "-")} · Lv ${item.level || "-"}</span>
                </div>
              </div>
              <div class="monthly-card-body">
                <div class="monthly-growth-block">
                  <div class="monthly-block-label">🔥 이달 성장</div>
                  <div class="monthly-growth-value">${growthValueHtml(item)}</div>
                  <div class="monthly-power-sub">총 전투력 ${escapeHtml(displayPower)}</div>
                  ${growthRateHtml(item) ? `<div style="margin-top:2px;">${growthRateHtml(item)}</div>` : ""}
                </div>
                <div class="monthly-rank-block">
                  <div class="monthly-block-label">📊 서버 순위</div>
                  <div class="monthly-rank-current">${item.serverRank ? formatNumber(item.serverRank) + "위" : "-"}</div>
                  <div class="monthly-rank-diff">${serverDiffHtml(item)}</div>
                </div>
              </div>
            </div>
          </article>
        `;
      }).join("");
    }

    function renderPopCards(list) {
      if (!list.length) return createEmptyBox("인기도 데이터가 없습니다.");
      return list.map((item, idx) => {
        const rank = idx + 1;
        const isFirst = rank === 1;
        return `
          <article class="list-card monthly-card${isFirst ? " monthly-card-first" : ""}" data-character-row="${escapeHtml((item.name || "").toLowerCase())}">
            ${isFirst ? `<div class="monthly-first-badge" style="background:linear-gradient(135deg,#fce4ec,#f8bbd0);color:#c2185b;">❤️ 인기도 1위</div>` : ""}
            <div class="card-left">
              ${rank <= 3
                ? `<div class="rank-chip ${rank === 1 ? "medal-gold" : rank === 2 ? "medal-silver" : "medal-bronze"}">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</div>`
                : `<div class="rank-chip rank-default">${rank}</div>`
              }
              ${characterAvatarHtml(item)}
            </div>
            <div class="card-main">
              <div class="monthly-card-top">
                <div class="monthly-name-block">
                  <span class="monthly-name">${escapeHtml(item.name || "-")}</span>
                  <span class="${guildClass(item.guild)}">${escapeHtml(item.guild || "-")}</span>
                  <span class="monthly-meta-line">${escapeHtml(item.job || "-")} · Lv ${item.level || "-"}</span>
                </div>
              </div>
              <div class="monthly-card-body">
                <div class="monthly-growth-block">
                  <div class="monthly-block-label">❤️ 인기도 성장</div>
                  <div class="monthly-growth-value">${popDiffHtml(item)}</div>
                  <div class="monthly-power-sub">현재 인기도 ${formatNumber(item.popularity || 0)}</div>
                </div>
                <div class="monthly-rank-block">
                  <div class="monthly-block-label">📊 인기도 서버순위</div>
                  <div class="monthly-rank-current">${item.popServerRank ? formatNumber(item.popServerRank) + "위" : "-"}</div>
                  <div class="monthly-rank-diff">${popRankDiffHtml(item)}</div>
                </div>
              </div>
            </div>
          </article>
        `;
      }).join("");
    }

    // ── 탭 전환 ──
    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll(".monthly-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
      const cardList = document.getElementById("monthlyCardList");
      if (tab === "power") {
        cardList.innerHTML = renderPowerCards(sortedPower);
      } else {
        cardList.innerHTML = renderPopCards(sortedPop);
      }
      // 검색 초기화
      const searchInput = document.getElementById("monthlySearchInput");
      if (searchInput) searchInput.value = "";
    }

    const snapshotBanner = hasSnapshot ? `
      <div style="
        display:flex; align-items:center; gap:8px;
        background:var(--yellow-bg); border:1px solid var(--yellow-border);
        border-radius:var(--radius-md); padding:10px 16px;
        font-size:0.83rem; color:var(--amber-dark); margin-bottom:20px;
      ">
        📌 기준일 <strong style="margin:0 4px;">${snapDateLabel}</strong> 대비 현재 성장량 · 매달 1일 자동 갱신
      </div>
    ` : `
      <div style="
        background:var(--yellow-bg); border:1px solid var(--yellow-border);
        border-radius:var(--radius-md); padding:10px 16px;
        font-size:0.83rem; color:var(--amber-dark); margin-bottom:20px;
      ">
        📌 매달 1일에 기준 데이터가 자동 저장됩니다. 스냅샷 생성 이후부터 성장량이 표시됩니다.
      </div>
    `;

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:32px 0 20px;">
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:8px;">
              <h1 style="font-size:1.7rem; font-weight:800; color:var(--text); margin:0; line-height:1;">📈 월간 성장</h1>
              <span style="font-size:0.95rem;font-weight:700;color:var(--white);background:var(--amber);border-radius:999px;padding:3px 14px;line-height:1.6;">${monthLabel}</span>
            </div>
            <p style="font-size:0.88rem;color:var(--text-soft);margin:0;">이번 달 성장량 기준으로 정렬돼요</p>
          </div>

          <!-- 탭 -->
          <div style="display:flex;gap:6px;margin-bottom:16px;">
            <button class="monthly-tab-btn active" data-tab="power">⚔️ 전투력</button>
            <button class="monthly-tab-btn" data-tab="pop">❤️ 인기도</button>
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
            ${renderPowerCards(sortedPower)}
          </div>
        </div>
      </div>
    `;

    // 탭 이벤트
    document.querySelectorAll(".monthly-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    bindCardSearch("monthlySearchInput", "monthlyResetButton", "monthlyCardList", "data-character-row");

  } catch (error) {
    console.error(error);
    renderError(null, error);
  }
});
