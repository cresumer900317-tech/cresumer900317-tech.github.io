document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const API_BASE = "https://guild-backend-production-75a6.up.railway.app";
    const [summary, members, monthlyRes] = await Promise.all([
      getHomeData(),
      getGuildsData(),
      fetch(`${API_BASE}/api/monthly`, { cache: "no-store" }).then(r => r.ok ? r.json() : []),
    ]);
    const monthlyRows = Array.isArray(monthlyRes) ? monthlyRes : [];

    const rows = Array.isArray(members) ? members : [];
    const grouped = byGuild(rows);
    const guilds = ["친구들", "친구둘", "친구삼", "친구넷", "친구닷"];

    const activeServerRanks = rows
      .filter((x) => Number(x.serverRank || 0) > 0)
      .map((x) => Number(x.serverRank));
    const avgServerRank = activeServerRanks.length
      ? (activeServerRanks.reduce((a, b) => a + b, 0) / activeServerRanks.length).toFixed(1)
      : "-";
    const avgPower = rows.length
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.power || 0), 0) / rows.length)
      : 0;
    const totalWeeklyGrowth = rows.reduce((sum, r) => sum + Number(r.weeklyDiff || 0), 0);
    const totalMonthlyGrowth = monthlyRows.reduce((sum, r) => sum + Number(r.monthlyDiff || 0), 0);
    const monthlyKing = [...monthlyRows]
      .filter(r => r.hasSnapshot && Number(r.monthlyDiff || 0) > 0)
      .sort((a, b) => Number(b.monthlyDiff || 0) - Number(a.monthlyDiff || 0))[0] || null;
    const avgPopularity = rows.length
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.popularity || 0), 0) / rows.length)
      : 0;

    const growthTop = [...rows]
      .filter((x) => Number(x.weeklyDiff || 0) > 0)
      .sort((a, b) => Number(b.weeklyDiff || 0) - Number(a.weeklyDiff || 0))
      .slice(0, 5);

    const riseTop = [...rows]
      .filter((x) => Number(x.serverRankDiff || 0) > 0)
      .sort((a, b) => Number(b.serverRankDiff || 0) - Number(a.serverRankDiff || 0))
      .slice(0, 5);

    const powerTop3 = [...rows]
      .sort((a, b) => Number(b.power || 0) - Number(a.power || 0))
      .slice(0, 3);

    const lastUpdate = rows.length && rows[0].capturedAt
      ? new Date(rows[0].capturedAt).toLocaleString("ko-KR", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        })
      : "-";

    const memberCount = summary.member_count || rows.length;
    const guildCount = summary.guild_count || 5;
    const top500Count = rows.filter((r) => Number(r.serverRank || 0) > 0 && Number(r.serverRank) <= 500).length;
    const top500Rate = memberCount > 0 ? ((top500Count / memberCount) * 100).toFixed(1) : "0.0";
    const topPlayer = [...rows].sort((a, b) => Number(b.power || 0) - Number(a.power || 0))[0] || {};
    const topPlayerPt = topPlayer.powerText || "";
    const topPlayerParts = topPlayerPt.trim().split(/\s+/).filter(Boolean);
    const topPlayerPower = topPlayerParts.length >= 2 ? topPlayerParts[0] + " " + topPlayerParts[1] : topPlayerPt || formatCompactPower(topPlayer.power);

    document.querySelector("main").innerHTML = `
      <div class="home-hero">
        <div class="container hero-inner">
          <div class="hero-badge">
            <span class="hero-dot"></span>
            메이플키우기 · 스카니아 11서버
          </div>
          <h1 class="hero-title">함께라서 <span class="accent">더 강한</span><br>친구패밀리 😊</h1>
          <p class="hero-desc">5개 길드가 함께하는 메이플키우기 패밀리 길드</p>
          <p class="hero-update">마지막 업데이트: <span class="time">${lastUpdate}</span></p>
          <a class="cta-btn" href="https://open.kakao.com/o/gagOlyni" target="_blank" rel="noopener noreferrer">가입 문의하기</a>
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">총 길드 수</div>
              <div class="kpi-value">${guildCount}개</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">총 인원</div>
              <div class="kpi-value dark">${formatNumber(memberCount)}명</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">평균 전투력</div>
              <div class="kpi-value">${formatCompactPower(avgPower)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">TOP 500 비율</div>
              <div class="kpi-value dark">${formatNumber(top500Count)}명 <span style="font-size:0.85rem;color:var(--text-faint);">(${top500Rate}%)</span></div>
            </div>
            <div class="kpi-card" style="cursor:pointer;" onclick="location.href='./weekly.html'">
              <div class="kpi-label">이달 누적 성장량</div>
              <div class="kpi-value">${totalMonthlyGrowth > 0 ? "+" + formatCompactPower(totalMonthlyGrowth) : "-"}</div>
            </div>
            <div class="kpi-card" style="cursor:pointer;" onclick="location.href='./weekly.html'">
              <div class="kpi-label">이달의 성장왕 🏆</div>
              <div class="kpi-value" style="font-size:1rem;">${monthlyKing ? escapeHtml(monthlyKing.name) : "-"}</div>
              <div style="font-size:0.78rem;color:var(--text-faint);margin-top:3px;">${monthlyKing ? "+" + formatCompactPower(monthlyKing.monthlyDiff) : "스냅샷 집계 중"}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-block">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="section-title">길드별 현황</div>
              <div class="section-sub">카드를 클릭하면 상세 정보를 볼 수 있어요</div>
            </div>
          </div>
          <div class="family-board-grid">
            ${guilds.map((guild) => {
              const list = grouped[guild] || [];
              const avg = list.length
                ? Math.round(list.reduce((s, r) => s + Number(r.power || 0), 0) / list.length)
                : 0;
              const isFull = list.length >= 30;
              const guildLevel = list.length > 0 ? (list[0].guildLevel || 0) : 0;
              return `
                <div class="guild-board-card ${isFull ? "full" : "active"}" data-guild="${escapeHtml(guild)}" style="cursor:pointer;">
                  <div class="guild-board-emoji">😊</div>
                  <div class="guild-board-name">
                    ${escapeHtml(guild)}
                    ${guildLevel ? `<span class="guild-board-lv">Lv.${String(guildLevel).padStart(2, "0")}</span>` : ""}
                  </div>
                  <div class="guild-board-stat">
                    <div class="guild-board-stat-label">인원</div>
                    <div class="guild-board-stat-val accent">${formatNumber(list.length)}명</div>
                  </div>
                  <div class="guild-board-stat">
                    <div class="guild-board-stat-label">평균 전투력</div>
                    <div class="guild-board-stat-val">${formatCompactPower(avg)}</div>
                  </div>
                  <div class="guild-board-badge ${isFull ? "full" : "recruit"}">${isFull ? "🔒 정원 마감" : "✨ 모집 중"}</div>
                  <div class="guild-board-more">상세보기 →</div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>

      <div class="section-block">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="section-title">패밀리 TOP 3</div>
              <div class="section-sub">전체 전투력 기준</div>
            </div>
            <a class="section-link" href="./ranking.html">전체 랭킹 보기 →</a>
          </div>
          <div class="top3-grid">
            ${powerTop3.length ? powerTop3.map((item, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              const pt = item.powerText || "";
              const parts = pt.trim().split(/\s+/).filter(Boolean);
              const displayPower = parts.length >= 2 ? parts[0] + " " + parts[1] : pt || formatCompactPower(item.power);
              return `
                <div class="top-card ${i === 0 ? "gold" : ""}">
                  <div class="top-rank-icon">${medals[i]}</div>
                  <div class="top-name">${escapeHtml(item.name || "-")}</div>
                  <div class="top-power">${escapeHtml(displayPower)}</div>
                  <div class="top-meta">${escapeHtml(item.guild || "-")} · 서버 ${item.serverRank ? formatNumber(item.serverRank) + "위" : "-"}</div>
                </div>
              `;
            }).join("") : `<div class="empty-box" style="grid-column:1/-1;">데이터가 없습니다.</div>`}
          </div>
        </div>
      </div>

      <div class="section-block">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="section-title">이번 주 변화</div>
              <div class="section-sub">성장량 · 서버 순위 상승 TOP 5</div>
            </div>
            <a class="section-link" href="./weekly.html">주간성장 보기 →</a>
          </div>
          <div class="summary-split">
            <div class="summary-panel">
              <div class="sub-head">성장 TOP 5</div>
              <div class="mini-card-list">
                ${growthTop.length ? growthTop.map((item, i) => `
                  <div class="mini-summary-card">
                    <span class="mini-summary-rank">${i + 1}</span>
                    ${characterAvatarHtml(item)}
                    <div class="mini-summary-main">
                      <div class="mini-summary-name">${escapeHtml(item.name || "-")}</div>
                      <div class="mini-summary-sub">
                        ${guildBadgeHtml(item.guild)}
                        <span>성장률 ${escapeHtml(formatRate(item.growthRate || 0))}</span>
                      </div>
                    </div>
                    <div class="mini-summary-side">${metricHtml(item.weeklyDiff || 0)}</div>
                  </div>
                `).join("") : `<div class="empty-box">다음 업데이트 후 표시됩니다.</div>`}
              </div>
            </div>
            <div class="summary-panel">
              <div class="sub-head">서버 순위 상승 TOP 5</div>
              <div class="mini-card-list">
                ${riseTop.length ? riseTop.map((item, i) => `
                  <div class="mini-summary-card">
                    <span class="mini-summary-rank">${i + 1}</span>
                    ${characterAvatarHtml(item)}
                    <div class="mini-summary-main">
                      <div class="mini-summary-name">${escapeHtml(item.name || "-")}</div>
                      <div class="mini-summary-sub">
                        ${guildBadgeHtml(item.guild)}
                        <span>현재 ${item.serverRank ? formatNumber(item.serverRank) + "위" : "-"}</span>
                      </div>
                    </div>
                    <div class="mini-summary-side">${rankTrendHtml(item)}</div>
                  </div>
                `).join("") : `<div class="empty-box">서버 순위 데이터 수집 후 표시됩니다.</div>`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 모달 -->
      <div id="guildModal" class="modal-backdrop" style="display:none;">
        <div class="modal-box">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="modal-emoji">😊</span>
              <div>
                <div class="modal-title" id="modalGuildName"></div>
                <div class="modal-sub" id="modalGuildSub"></div>
              </div>
            </div>
            <button class="modal-close" id="modalClose">✕</button>
          </div>
          <div class="modal-stats" id="modalStats"></div>
          <div class="modal-section-title">전체 길드원</div>
          <div id="modalTop5" style="max-height:400px; overflow-y:auto; padding:0 4px 4px;"></div>
        </div>
      </div>
    `;

    // 길드 카드 클릭 → 모달
    document.querySelectorAll(".guild-board-card[data-guild]").forEach((card) => {
      card.addEventListener("click", () => {
        const guild = card.dataset.guild;
        const list = grouped[guild] || [];
        const sorted = [...list].sort((a, b) => Number(b.power || 0) - Number(a.power || 0));
        const avg = list.length
          ? Math.round(list.reduce((s, r) => s + Number(r.power || 0), 0) / list.length)
          : 0;
        const ranks = list.filter((r) => r.serverRank).map((r) => Number(r.serverRank)).sort((a, b) => a - b);
        const bestRank = ranks[0] || "-";
        const worstRank = ranks[ranks.length - 1] || "-";
        const avgPop = list.length
          ? Math.round(list.reduce((s, r) => s + Number(r.popularity || 0), 0) / list.length)
          : 0;

        document.getElementById("modalGuildName").textContent = guild;
        document.getElementById("modalGuildSub").textContent = `총 ${list.length}명 · 메이플키우기 스카니아 11서버`;
        document.getElementById("modalStats").innerHTML = `
          <div class="modal-stat-item">
            <div class="modal-stat-label">평균 전투력</div>
            <div class="modal-stat-value accent">${formatCompactPower(avg)}</div>
          </div>
          <div class="modal-stat-item">
            <div class="modal-stat-label">최고 서버 순위</div>
            <div class="modal-stat-value">${bestRank ? formatNumber(bestRank) + "위" : "-"}</div>
          </div>
          <div class="modal-stat-item">
            <div class="modal-stat-label">서버 순위 범위</div>
            <div class="modal-stat-value">${bestRank && worstRank ? formatNumber(bestRank) + " ~ " + formatNumber(worstRank) + "위" : "-"}</div>
          </div>
          <div class="modal-stat-item">
            <div class="modal-stat-label">평균 인기도</div>
            <div class="modal-stat-value">${formatNumber(avgPop)}</div>
          </div>
        `;

        document.getElementById("modalTop5").innerHTML = sorted.map((item, i) => {
          const pt = item.powerText || "";
          const parts = pt.trim().split(/\s+/).filter(Boolean);
          const displayPower = parts.length >= 2 ? parts[0] + " " + parts[1] : pt || formatCompactPower(item.power);
          return `
            <div class="modal-member-row">
              <span class="modal-member-rank">${i + 1}</span>
              ${characterAvatarHtml(item)}
              <div class="modal-member-info">
                <div class="modal-member-name">${escapeHtml(item.name || "-")}</div>
                <div class="modal-member-meta">${escapeHtml(item.job || "-")} · Lv ${item.level || "-"}</div>
              </div>
              <div class="modal-member-power">${escapeHtml(displayPower)}</div>
            </div>
          `;
        }).join("");

        document.getElementById("guildModal").style.display = "flex";
        document.body.style.overflow = "hidden";
      });
    });

    // 모달 닫기
    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("guildModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("guildModal")) closeModal();
    });

    function closeModal() {
      document.getElementById("guildModal").style.display = "none";
      document.body.style.overflow = "";
    }

  } catch (error) {
    console.error(error);
    document.querySelector("main").innerHTML = `
      <div class="container" style="padding-top:40px;">
        <div class="error-box">데이터를 불러오지 못했습니다: ${escapeHtml(error?.message || "오류")}</div>
      </div>
    `;
  }
});