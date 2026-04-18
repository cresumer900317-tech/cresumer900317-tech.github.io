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

    const avgPower = rows.length
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.power || 0), 0) / rows.length)
      : 0;
    const totalMonthlyGrowth = monthlyRows.reduce((sum, r) => sum + Number(r.monthlyDiff || 0), 0);

    const growthTop = [...rows]
      .filter((x) => Number(x.weeklyDiff || 0) > 0)
      .sort((a, b) => Number(b.weeklyDiff || 0) - Number(a.weeklyDiff || 0))
      .slice(0, 5);

    const riseTop = [...rows]
      .filter((x) => Number(x.serverRankDiff || 0) > 0)
      .sort((a, b) => Number(b.serverRankDiff || 0) - Number(a.serverRankDiff || 0))
      .slice(0, 5);

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

    // 길드 배치 기준일: 매달 마지막 수요일 22시
    const cutlineDate = (() => {
      const now = new Date();
      let y = now.getFullYear(), m = now.getMonth();
      for (let attempt = 0; attempt < 2; attempt++) {
        const lastDay = new Date(y, m + 1, 0);
        const dow = lastDay.getDay();
        const diff = (dow - 3 + 7) % 7;
        const wed = new Date(y, m, lastDay.getDate() - diff);
        wed.setHours(22, 0, 0, 0);
        if (wed > now) return wed;
        m++;
        if (m > 11) { m = 0; y++; }
      }
      return null;
    })();
    const cutlineDDay = cutlineDate
      ? Math.ceil((cutlineDate - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    const cutlineDateStr = cutlineDate
      ? `${cutlineDate.getMonth()+1}/${cutlineDate.getDate()}(수) 22시`
      : "";
    const cutlineDDayText = cutlineDDay === 0 ? "D-Day"
      : cutlineDDay === 1 ? "D-1"
      : cutlineDDay !== null ? `D-${cutlineDDay}` : "";

    const guildDesc = {
      "친구들": "TOP30 경쟁 메인 길드",
      "친구둘": "내부 리그 강자",
      "친구삼": "균형형 경쟁 길드",
      "친구넷": "성장형 경쟁 길드",
      "친구닷": "확장 · 자유 길드",
    };

    const visitorHtml = (() => {
      const online = visitorStats.online || 0;
      const list = visitorStats.online_list || [];
      const me = user ? user.character_name : null;
      if (online === 0) return `<span class="live-bar-text">함께 보고 있는 멤버들이 있어요</span>`;
      if (me && list.some(u => u.name === me)) {
        const others = online - 1;
        return `<span class="live-bar-text"><strong>${escapeHtml(me)}</strong>님${others > 0 ? ` 외 ${others}명` : ""}이 함께 보고 있어요</span>`;
      }
      return `<span class="live-bar-text">지금 <strong>${online}명</strong>이 함께 보고 있어요</span>`;
    })();

    document.querySelector("main").innerHTML = `
      <div class="home-hero">
        <div class="container hero-inner">
          <div class="hero-badge">
            <span class="hero-dot"></span>
            메이플키우기 · 스카니아 11서버
          </div>
          <h1 class="hero-title">함께 성장하는<br><span class="accent">친구패밀리</span></h1>
          <p class="hero-desc">내 활동 스타일에 맞는 길드로 자동 배정돼요</p>
          <p class="hero-member-count">현재 <strong>${formatNumber(memberCount)}명</strong>이 함께하고 있어요</p>
          <div class="hero-cta-row">
            <a class="cta-btn" href="https://open.kakao.com/o/gagOlyni" target="_blank" rel="noopener noreferrer">길드 가입 문의</a>
            <a class="cta-btn cta-btn-outline" href="./ranking">랭킹 보기</a>
          </div>
        </div>
      </div>

      <div class="live-bar">
        <div class="container live-bar-inner">
          <div class="live-bar-left">
            <span class="live-dot"></span>
            ${visitorHtml}
            <span class="live-bar-divider">·</span>
            <span class="live-bar-extra">누적 ${formatNumber(visitorStats.total||0)}명 방문</span>
          </div>
          <span class="live-bar-update">마지막 업데이트: ${lastUpdate}</span>
        </div>
      </div>

      <div class="section-block">
        <div class="container">
          <div class="section-head">
            <div>
              <div class="section-title">패밀리 현황</div>
              <div class="section-sub">전체 길드 통합 지표</div>
            </div>
          </div>
          <div class="kpi-grid kpi-grid-overview">
            <div class="kpi-card">
              <div class="kpi-label">총 길드</div>
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
              <div class="kpi-label">TOP 500</div>
              <div class="kpi-value dark">${formatNumber(top500Count)}명 <span class="kpi-sub">(${top500Rate}%)</span></div>
            </div>
            <div class="kpi-card kpi-card-link" onclick="location.href='./weekly'">
              <div class="kpi-label">이달 성장량</div>
              <div class="kpi-value">${totalMonthlyGrowth > 0 ? "+" + formatCompactPower(totalMonthlyGrowth) : "-"}</div>
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
                  <div class="section-title">내 대시보드</div>
                  <div class="section-sub">로그인하면 내 정보를 한눈에 볼 수 있어요</div>
                </div>
              </div>
              <div class="dashboard-login-prompt">
                <a href="./login?redirect=./" class="cta-btn">로그인하기</a>
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
                  <div class="section-title">내 대시보드</div>
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

        const monthlyColor = myMonthlyDiff > 0 ? 'up' : myMonthlyDiff < 0 ? 'down' : 'neutral';

        return `
          <div class="section-block">
            <div class="container">
              <div class="section-head">
                <div>
                  <div class="section-title">내 대시보드</div>
                  <div class="section-sub">${escapeHtml(myName)}님의 현재 현황</div>
                </div>
                <a class="section-link" href="./mypage">회원정보 →</a>
              </div>
              <div class="kpi-grid kpi-grid-dashboard">
                <div class="kpi-card">
                  <div class="kpi-label">전투력</div>
                  <div class="kpi-value">${formatCompactPower(myPower)}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">서버 순위</div>
                  <div class="kpi-value dark">${myServerRank}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">이달 성장</div>
                  <div class="kpi-value kpi-value-${monthlyColor}">
                    ${myMonthlyDiff > 0 ? '+' + formatCompactPower(myMonthlyDiff) : myMonthlyDiff < 0 ? '-' + formatCompactPower(Math.abs(myMonthlyDiff)) : '-'}
                  </div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">패밀리 순위</div>
                  <div class="kpi-value dark">${myFamilyRank}위 <span class="kpi-sub">/ ${rows.length}명</span></div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">인기도</div>
                  <div class="kpi-value kpi-value-pink">${myPopularity}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">공헌도</div>
                  <div class="kpi-value dark">${myContribVal}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">TOP 30 ${cutlineDDayText ? `<span class="kpi-dday">${cutlineDDayText}</span>` : ''}</div>
                  <div class="kpi-value ${isAboveCut ? 'kpi-value-up' : 'kpi-value-neutral'}">
                    ${isAboveCut
                      ? '+' + formatCompactPower(cutDiff) + ' 여유'
                      : cutDiff === 0 ? '30위' : formatCompactPower(Math.abs(cutDiff)) + ' 목표'}
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
              const isFull = list.length >= 30;
              const guildLevel = list.length > 0 ? (list[0].guildLevel || 0) : 0;
              return `
                <div class="guild-board-card ${isFull ? "full" : "active"}" data-guild="${escapeHtml(guild)}">
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
                    <div class="guild-board-stat-val">${formatCompactPower(totalPower)}</div>
                  </div>
                  ${guildDesc[guild] ? `<div class="guild-board-desc">${guildDesc[guild]}</div>` : ""}
                  <div class="guild-board-badge ${isFull ? "full" : "recruit"}">${isFull ? "정원 마감" : "모집 중"}</div>
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
              <div class="section-title">TOP 30 길드 배치 현황</div>
              <div class="section-sub">26위~35위 순위 흐름</div>
            </div>
            <a class="section-link" href="./ranking">전체 랭킹 →</a>
          </div>
          <div class="cutline-date-bar">
            <div class="cutline-date-left">
              <span class="cutline-date-label">다음 배치 기준일</span>
              <span class="cutline-date-value">${cutlineDateStr}</span>
            </div>
            <div class="cutline-timer-wrap">
              <span class="cutline-dday ${cutlineDDay !== null && cutlineDDay <= 3 ? 'cutline-dday-urgent' : ''}">${cutlineDDayText}</span>
              <span class="cutline-countdown" id="cutlineCountdown"></span>
            </div>
          </div>
          <div class="cutline-log">
            ${(() => {
              const zone = sortedRanking.slice(25, 35);
              const cutItem = sortedRanking[29];
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
                  distHtml = `<span class="cl-cut-label">기준</span>`;
                } else if (rank > 30) {
                  distHtml = `<span class="cl-dist-gap">-${formatCompactPower(Math.abs(diff))}</span>`;
                } else {
                  distHtml = `<span class="cl-dist-safe">+${formatCompactPower(Math.abs(diff))}</span>`;
                }

                return `
                  ${isCut ? `<div class="cl-cutline-bar"><span>TOP 30 배치 라인</span></div>` : ""}
                  <div class="cl-row ${statusClass}${isCut ? " cl-cut-row" : ""}">
                    <span class="cl-rank">${rank}</span>
                    <span class="cl-name">${escapeHtml(item.name || "-")}</span>
                    <span class="cl-guild">${guildBadgeHtml(item.guild || "")}</span>
                    <span class="cl-power">${escapeHtml(dispPower)}</span>
                    <span class="cl-trend">${trendHtml}</span>
                    <span class="cl-dist">${distHtml}</span>
                  </div>
                  ${isCut ? `<div class="cl-cutline-bar cl-below-bar"><span>── 31위부터 ──</span></div>` : ""}
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

      <div id="guildModal" class="modal-backdrop" style="display:none;">
        <div class="modal-box">
          <div class="modal-header">
            <div class="modal-title-wrap">
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

    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("guildModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("guildModal")) closeModal();
    });

    function closeModal() {
      document.getElementById("guildModal").style.display = "none";
      document.body.style.overflow = "";
    }

    // 실시간 카운트다운
    if (cutlineDate) {
      const countdownEl = document.getElementById("cutlineCountdown");
      function updateCountdown() {
        const now = new Date();
        const diff = cutlineDate - now;
        if (diff <= 0) {
          countdownEl.textContent = "배치 진행 중";
          return;
        }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        const pad = (n) => String(n).padStart(2, "0");
        countdownEl.textContent = `${d}일 ${pad(h)}:${pad(m)}:${pad(s)}`;
      }
      updateCountdown();
      setInterval(updateCountdown, 1000);
    }

  } catch (error) {
    console.error(error);
    renderError(null, error);
  }
});
