document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const members = await getGuildsData();
    const rows = Array.isArray(members) ? members : [];
    const GUILDS = ["친구들", "친구둘", "친구삼", "친구넷", "친구닷"];

    let currentGuild = "전체";
    let searchKeyword = "";

    // 길드별 통계
    function guildStats(guildName) {
      const list = rows.filter(r => r.guild === guildName);
      const count = list.length;
      const avgPower = count
        ? Math.round(list.reduce((s, r) => s + Number(r.power || 0), 0) / count)
        : 0;
      return { count, avgPower };
    }

    function getFiltered() {
      let list = currentGuild === "전체" ? rows : rows.filter(r => r.guild === currentGuild);
      if (searchKeyword) {
        list = list.filter(r => (r.name || "").toLowerCase().includes(searchKeyword));
      }
      return [...list].sort((a, b) => Number(b.power || 0) - Number(a.power || 0));
    }

    function getPowerDisplay(item) {
      const pt = item.powerText || "";
      const parts = pt.trim().split(/\s+/).filter(Boolean);
      return parts.length >= 2 ? parts[0] + " " + parts[1] : pt || formatCompactPower(item.power);
    }

    function jobRoleHtml(job) {
      const dealers = ["섀도어","아크메이지(불,독)","아크메이지(썬,콜)","히어로","팔라딘","다크나이트","신궁","보우마스터","나이트로드","듀얼블레이드","메르세데스","카인","호영","카이저","제로","팬텀","은월","캐논마스터","데몬슬레이어","데몬어벤져","배틀메이지","와일드헌터","메카닉","블래스터","아란","에반","루미너스","카링","소환사","키네시스","일리움","아크","노바","래프터","엔젤릭버스터"];
      const supports = ["비숍"];
      if (supports.includes(job)) return `<span class="mb-role mb-role-support">서포터</span>`;
      if (dealers.includes(job)) return `<span class="mb-role mb-role-dealer">딜러</span>`;
      return "";
    }

    // 길드 요약 카드 (전체 탭일 때)
    function renderGuildSummary() {
      return `
        <div class="mb-guild-summary">
          ${GUILDS.map(g => {
            const stats = guildStats(g);
            const isFull = stats.count >= 30;
            return `
              <div class="mb-guild-summary-card${isFull ? " mb-guild-full" : ""}" data-guild="${escapeHtml(g)}">
                <div class="mb-gs-name">
                  ${guildBadgeHtml(g)}
                </div>
                <div class="mb-gs-count">${stats.count}<span>명</span></div>
                <div class="mb-gs-power">${formatCompactPower(stats.avgPower)}</div>
                <div class="mb-gs-label">평균 전투력</div>
                ${isFull
                  ? `<div class="mb-gs-status full">정원 마감</div>`
                  : `<div class="mb-gs-status recruit">모집 중</div>`
                }
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    // 멤버 카드 (심플 디렉토리형)
    function renderMemberCard(item, rank) {
      const power = getPowerDisplay(item);
      const isMaster = item.isMaster;

      return `
        <div class="mb-card" data-character-row="${escapeHtml((item.name || "").toLowerCase())}">
          <div class="mb-rank">${rank <= 3
            ? `<span style="font-size:1.4rem;">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>`
            : `<span class="mb-rank-num">${rank}</span>`
          }</div>
          <div class="mb-avatar">${characterAvatarHtml(item)}</div>
          <div class="mb-info">
            <div class="mb-name">
              ${escapeHtml(item.name || "-")}
              ${isMaster ? `<span class="mb-master-badge">길드장</span>` : ""}
            </div>
            <div class="mb-sub">
              ${currentGuild === "전체" ? guildBadgeHtml(item.guild || "길드 없음") : ""}
              <span class="mb-job">${escapeHtml(item.job || "-")}</span>
              ${jobRoleHtml(item.job || "")}
              <span class="mb-level">Lv ${item.level || "-"}</span>
            </div>
          </div>
          <div class="mb-power-block">
            <div class="mb-power">${escapeHtml(power)}</div>
            ${item.serverRank ? `<div class="mb-server">서버 ${formatNumber(item.serverRank)}위</div>` : ""}
          </div>
        </div>
      `;
    }

    function renderList(list) {
      if (!list.length) return createEmptyBox("해당하는 멤버가 없습니다.");
      return list.map((item, idx) => renderMemberCard(item, idx + 1)).join("");
    }

    // 탭 버튼 라벨 (인원수 포함)
    function tabLabel(g) {
      const stats = guildStats(g);
      return `${g} <span class="tab-count">${stats.count}</span>`;
    }

    function render() {
      const filtered = getFiltered();
      const showSummary = currentGuild === "전체" && !searchKeyword;

      document.getElementById("members-list").innerHTML =
        (showSummary ? renderGuildSummary() : "") + renderList(filtered);
      document.getElementById("members-count").textContent = `${formatNumber(filtered.length)}명`;
      document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("is-active", btn.dataset.guild === currentGuild);
      });
    }

    const totalCount = rows.length;

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:28px 0 12px;">
            <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0 0 4px;">👥 길드 디렉토리</h1>
            <p style="font-size:0.85rem;color:var(--text-soft);margin:0;">전체 <strong>${totalCount}명</strong> · 현재 <span id="members-count">-</span> 표시 중</p>
          </div>

          <div class="tab-bar" style="margin-bottom:12px;">
            <button class="tab-btn is-active" data-guild="전체">전체 <span class="tab-count">${totalCount}</span></button>
            ${GUILDS.map(g => `<button class="tab-btn" data-guild="${escapeHtml(g)}">${tabLabel(g)}</button>`).join("")}
          </div>

          <div class="toolbar-card">
            <label class="search-field">
              <span>🔎</span>
              <input id="membersSearchInput" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
            </label>
            <button id="membersResetButton" class="ghost-btn" type="button">초기화</button>
          </div>

          <div class="mb-list" id="members-list">
            <div class="loading-box">불러오는 중...</div>
          </div>
        </div>
      </div>
    `;

    // 탭 이벤트
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        currentGuild = btn.dataset.guild;
        render();
      });
    });

    // 검색 이벤트
    const input = document.getElementById("membersSearchInput");
    const resetBtn = document.getElementById("membersResetButton");

    input.addEventListener("input", () => {
      searchKeyword = input.value.trim().toLowerCase();
      render();
    });
    resetBtn.addEventListener("click", () => {
      input.value = "";
      searchKeyword = "";
      render();
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