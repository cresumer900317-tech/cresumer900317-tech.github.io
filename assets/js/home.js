document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const user = getUser();
    const contribMonth = new Date().toISOString().slice(0, 7);
    const [summary, members, monthlyRes, visitorRes, contribRes] = await Promise.all([
      getHomeData(),
      getGuildsData(),
      fetch(`${API_BASE}/api/monthly`, { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/visitors/stats`, { cache: "no-store" }).then(r => r.ok ? r.json() : {}),
      fetch(`${API_BASE}/api/contributions?month=${contribMonth}`, { cache: "no-store" }).then(r => r.ok ? r.json() : { rows: [] }),
    ]);
    const contribRows = (contribRes && contribRes.rows) || [];
    const visitorStats = visitorRes || {};
    const monthlyRows = Array.isArray(monthlyRes) ? monthlyRes : [];

    const rows = Array.isArray(members) ? members : [];
    const sortedRanking = [...rows].sort((a, b) => Number(b.power||0) - Number(a.power||0));
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
    const topPlayerPower = getPowerDisplay(topPlayer);

    document.querySelector("main").innerHTML = `
      <div class="home-hero">
        <div class="container hero-inner">
          <div class="hero-badge">
            <span class="hero-dot"></span>
            메이플키우기 · 스카니아 11서버
          </div>
          <h1 class="hero-title">🌱 함께 성장하는<br><span class="accent">친구패밀리</span></h1>
          <p class="hero-desc">내 활동 스타일에 맞는 길드로 자동 배정돼요</p>
          <div style="display:flex;align-items:center;gap:8px;margin:8px 0 14px;flex-wrap:wrap;">
            <span style="font-size:0.78rem;background:rgba(245,158,11,0.12);color:var(--amber-dark);font-weight:600;padding:3px 14px;border-radius:999px;">🌱 현재 ${formatNumber(memberCount)}명 함께 성장 중</span>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:0;">
            <a class="cta-btn" href="https://open.kakao.com/o/gagOlyni" target="_blank" rel="noopener noreferrer">💬 길드 가입 문의하기</a>
            <a class="cta-btn" href="./ranking" style="background:var(--white);color:var(--amber-dark);border:1.5px solid var(--yellow-border);">🏆 랭킹 보기</a>
          </div>

          <div class="visitor-cta-bar">
            <span class="visitor-cta-dot"></span>
            ${(() => {
              const online = visitorStats.online || 0;
              const list = visitorStats.online_list || [];
              const me = user ? user.character_name : null;
              if (online === 0) return `<span class="visitor-cta-count">함께 보고 있는 멤버들이 있어요</span>`;
              if (me && list.some(u => u.name === me)) {
                const others = online - 1;
                return `<span class="visitor-cta-count"><strong>${escapeHtml(me)}</strong>님${others > 0 ? ` 외 ${others}명` : ""}이 함께 보고 있어요</span>`;
              }
              return `<span class="visitor-cta-count">지금 <strong>${online}명</strong>이 함께 보고 있어요</span>`;
            })()}
            <span class="visitor-cta-extra">· 누적 ${formatNumber(visitorStats.total||0)}명 방문</span>
          </div>
          <p class="hero-update" style="margin-top:6px;">마지막 업데이트: <span class="time">${lastUpdate}</span></p>
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
              <div style="font-size:0.72rem;color:var(--text-faint);margin-top:3px;">🔥 상위권 길드 수준</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">TOP 500 비율</div>
              <div class="kpi-value dark">${formatNumber(top500Count)}명 <span style="font-size:0.85rem;color:var(--text-faint);">(${top500Rate}%)</span></div>
              <div style="font-size:0.72rem;color:var(--text-faint);margin-top:3px;">💎 고스펙 유저 밀집</div>
            </div>
            <div class="kpi-card" style="cursor:pointer;" onclick="location.href='./weekly'">
              <div class="kpi-label">이달 성장량</div>
              <div class="kpi-value">${totalMonthlyGrowth > 0 ? "+" + formatCompactPower(totalMonthlyGrowth) : "-"}</div>
            </div>
            <div class="kpi-card" style="cursor:pointer;" onclick="location.href='./weekly'">
              <div class="kpi-label">이달의 성장왕 🏆</div>
              <div class="kpi-value" style="font-size:1rem;">${monthlyKing ? escapeHtml(monthlyKing.name) : "-"}</div>
              <div style="font-size:0.78rem;color:var(--text-faint);margin-top:3px;">${monthlyKing ? "+" + formatCompactPower(monthlyKing.monthlyDiff) : "스냅샷 집계 중"}</div>
            </div>
          </div>
        </div>
      </div>

      ${(() => {
        if (!user) return `
          <div class="section-block">
            <div class="container">
              <div class="section-head">
                <div>
                  <div class="section-title">📊 내 대시보드</div>
                  <div class="section-sub">로그인하면 내 정보를 한눈에 볼 수 있어요</div>
                </div>
              </div>
              <div style="text-align:center;padding:32px 0;">
                <a href="./login?redirect=./" style="display:inline-block;padding:10px 28px;background:var(--yellow);color:#fff;border-radius:10px;font-weight:700;text-decoration:none;">로그인하기</a>
              </div>
            </div>
          </div>`;

        const myName = user.character_name;
        const me = rows.find(r => r.name === myName);
        const myMonthly = monthlyRows.find(r => r.name === myName);

        if (!me) return `
          <div class="section-block">
            <div class="container">
              <div class="section-head">
                <div>
                  <div class="section-title">📊 내 대시보드</div>
                  <div class="section-sub">캐릭터 데이터를 찾을 수 없습니다</div>
                </div>
              </div>
            </div>
          </div>`;

        const myPower = Number(me.power || 0);
        const myServerRank = me.serverRank ? formatNumber(me.serverRank) + "위" : "-";
        const myFamilyRank = sortedRanking.findIndex(r => r.name === myName) + 1;
        const myMonthlyDiff = myMonthly ? Number(myMonthly.monthlyDiff || 0) : 0;
        const myPopularity = formatNumber(Number(me.popularity || 0));
        const myContrib = contribRows.find(r => r.member_name === myName);
        const myContribVal = myContrib ? formatNumber(myContrib.contribution) : "-";
        const cutItem = sortedRanking[29];
        const cutPower = cutItem ? Number(cutItem.power || 0) : 0;
        const cutDiff = myPower - cutPower;
        const isAboveCut = myFamilyRank <= 30;

        return `
          <div class="section-block">
            <div class="container">
              <div class="section-head">
                <div>
                  <div class="section-title">📊 내 대시보드</div>
                  <div class="section-sub">${escapeHtml(myName)}님의 현재 현황</div>
                </div>
                <a class="section-link" href="./mypage">회원정보 →</a>
              </div>
              <div class="kpi-grid kpi-grid-dashboard">
                <div class="kpi-card">
                  <div class="kpi-label">⚔️ 전투력</div>
                  <div class="kpi-value">${formatCompactPower(myPower)}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">🌐 서버 순위</div>
                  <div class="kpi-value dark">${myServerRank}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">📈 이달 성장</div>
                  <div class="kpi-value" style="color:${myMonthlyDiff > 0 ? '#059669' : myMonthlyDiff < 0 ? '#dc2626' : 'var(--text-faint)'};">
                    ${myMonthlyDiff > 0 ? '+' + formatCompactPower(myMonthlyDiff) : myMonthlyDiff < 0 ? '-' + formatCompactPower(Math.abs(myMonthlyDiff)) : '-'}
                  </div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">👥 패밀리 순위</div>
                  <div class="kpi-value dark">${myFamilyRank}위 <span style="font-size:0.75rem;color:var(--text-faint);">/ ${rows.length}명</span></div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">❤️ 인기도</div>
                  <div class="kpi-value" style="color:#e11d48;">${myPopularity}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">🎖️ 공헌도</div>
                  <div class="kpi-value dark">${myContribVal}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">🏆 TOP 30</div>
                  <div class="kpi-value" style="font-size:1rem;color:${isAboveCut ? '#059669' : '#dc2626'};">
                    ${isAboveCut
                      ? '+' + formatCompactPower(cutDiff) + ' 여유'
                      : cutDiff === 0 ? '기준선' : formatCompactPower(Math.abs(cutDiff)) + ' 부족'}
                  </div>
                </div>
              </div>
            </div>
          </div>`;
      })()}

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
              const totalPower = list.reduce((s, r) => s + Number(r.power || 0), 0);
              const avg = totalPower;
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
                    <div class="guild-board-stat-label">합산 전투력</div>
                    <div class="guild-board-stat-val">${formatCompactPower(avg)}</div>
                  </div>
                  ${({"친구들":"🔥 TOP30 경쟁 메인 길드","친구둘":"⚔️ 내부 리그 강자","친구삼":"📈 균형형 경쟁 길드","친구넷":"🚀 성장형 경쟁 길드","친구닷":"🌱 확장/자유 길드"})[guild] ? `<div class="guild-board-desc">${({"친구들":"🔥 TOP30 경쟁 메인 길드","친구둘":"⚔️ 내부 리그 강자","친구삼":"📈 균형형 경쟁 길드","친구넷":"🚀 성장형 경쟁 길드","친구닷":"🌱 확장/자유 길드"})[guild]}</div>` : ""}
                  <div class="guild-board-badge ${isFull ? "full" : "recruit"}">${isFull ? "🔒 정원 마감" : "✨ 모집 중"}</div>
                  <div class="guild-board-more">자세히 보기 →</div>
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
              <div class="section-title">📊 현재 순위 구간</div>
              <div class="section-sub">26위~35위 실시간 순위 흐름</div>
            </div>
            <a class="section-link" href="./ranking">전체 랭킹 보기 →</a>
          </div>
          <div class="cutline-log">
            ${(() => {
              const zone = sortedRanking.slice(25, 35); // 26~35위
              const cutItem = sortedRanking[29]; // 30위
              const cutPower = cutItem ? Number(cutItem.power || 0) : 0;

              return zone.map((item, i) => {
                const rank = 26 + i;
                const isCut = rank === 30;
                const isAbove = rank <= 30;
                const diff = Number(item.power || 0) - cutPower;
                const rankDiff = item.serverRankDiff || 0;
                const dispPower = getPowerDisplay(item);

                let statusClass = isAbove ? "cl-safe" : "cl-neutral";
                if (rank >= 28 && rank <= 30) statusClass = "cl-watch";

                let trendHtml = "";
                if (rankDiff > 0) trendHtml = `<span class="cl-up">▲${formatNumber(rankDiff)}</span>`;
                else if (rankDiff < 0) trendHtml = `<span class="cl-down">▼${formatNumber(Math.abs(rankDiff))}</span>`;
                else trendHtml = `<span class="cl-flat">—</span>`;

                let distHtml = "";
                if (rank === 30) {
                  distHtml = `<span class="cl-cut-label">🎯 기준</span>`;
                } else if (rank > 30) {
                  const absDiff = Math.abs(diff);
                  distHtml = `<span class="cl-dist-gap">-${formatCompactPower(absDiff)}</span>`;
                } else {
                  const absDiff = Math.abs(diff);
                  distHtml = `<span class="cl-dist-safe">+${formatCompactPower(absDiff)}</span>`;
                }

                return `
                  ${isCut ? `<div class="cl-cutline-bar"><span>🎯 TOP30 기준선</span></div>` : ""}
                  <div class="cl-row ${statusClass}${isCut ? " cl-cut-row" : ""}">
                    <span class="cl-rank">${rank}</span>
                    <span class="cl-name">${escapeHtml(item.name || "-")}</span>
                    <span class="cl-guild">${guildBadgeHtml(item.guild || "")}</span>
                    <span class="cl-power">${escapeHtml(dispPower)}</span>
                    <span class="cl-trend">${trendHtml}</span>
                    <span class="cl-dist">${distHtml}</span>
                  </div>
                  ${isCut ? `<div class="cl-cutline-bar cl-below-bar"><span>── 컷라인 이하 ──</span></div>` : ""}
                `;
              }).join("");
            })()}
          </div>
        </div>
      </div>

      ${(growthTop.length || riseTop.length) ? `
      <div class="section-block">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="section-title">이번 주 변화</div>
              <div class="section-sub">성장량 · 서버 순위 상승 TOP 5</div>
            </div>
            <a class="section-link" href="./weekly">월간성장 보기 →</a>
          </div>
          <div class="summary-split">
            <div class="summary-panel">
              <div class="sub-head">성장 TOP 5</div>
              <div class="mini-card-list">
                ${growthTop.map((item, i) => `
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
                `).join("")}
              </div>
            </div>
            <div class="summary-panel">
              <div class="sub-head">서버 순위 상승 TOP 5</div>
              <div class="mini-card-list">
                ${riseTop.map((item, i) => `
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
                `).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
      ` : ""}

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
          const displayPower = getPowerDisplay(item);
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
    renderError(null, error);
  }
});