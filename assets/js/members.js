document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const members = await getGuildsData();
    const rows = Array.isArray(members) ? members : [];
    const GUILDS = ["친구들", "친구둘", "친구삼", "친구넷", "친구닷"];

    let currentGuild = "전체";
    let searchKeyword = "";
    let sortMode = "power";

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
      return sortList(list);
    }

    function sortList(list) {
      return [...list].sort((a, b) => {
        if (sortMode === "power") return Number(b.power || 0) - Number(a.power || 0);
        if (sortMode === "level") return Number(b.level || 0) - Number(a.level || 0);
        if (sortMode === "name") return (a.name || "").localeCompare(b.name || "", "ko");
        if (sortMode === "popularity") return Number(b.popularity || 0) - Number(a.popularity || 0);
        return 0;
      });
    }

    function getPowerDisplay(item) {
      const pt = item.powerText || "";
      const parts = pt.trim().split(/\s+/).filter(Boolean);
      return parts.length >= 2 ? parts[0] + " " + parts[1] : pt || formatCompactPower(item.power);
    }

    // 길드 요약 카드 (항상 고정)
    function renderGuildSummary() {
      return `
        <div class="mb-guild-summary">
          ${GUILDS.map(g => {
            const stats = guildStats(g);
            const isFull = stats.count >= 30;
            const isActive = currentGuild === g;
            return `
              <div class="mb-guild-summary-card${isFull ? " mb-guild-full" : ""}${isActive ? " mb-guild-active" : ""}" data-guild-filter="${escapeHtml(g)}">
                <div class="mb-gs-name">${guildBadgeHtml(g)}</div>
                <div class="mb-gs-count">${stats.count}<span>명</span></div>
                <div class="mb-gs-power">${formatCompactPower(stats.avgPower)}</div>
                <div class="mb-gs-label">평균 전투력</div>
                <div class="mb-gs-status ${isFull ? "full" : "recruit"}">${isFull ? "정원 마감" : "모집 중"}</div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    // 멤버 카드
    function renderMemberCard(item, rank) {
      const power = getPowerDisplay(item);
      const isMaster = item.isMaster;
      return `
        <div class="mb-card" data-character-row="${escapeHtml((item.name || "").toLowerCase())}">
          <div class="mb-rank">
            ${rank <= 3
              ? `<span style="font-size:1.3rem;">${rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>`
              : `<span class="mb-rank-num">${rank}</span>`
            }
          </div>
          <div class="mb-avatar">${characterAvatarHtml(item)}</div>
          <div class="mb-info">
            <div class="mb-name">
              ${escapeHtml(item.name || "-")}
              ${isMaster ? `<span class="mb-master-badge">길드장</span>` : ""}
            </div>
            <div class="mb-sub">
              ${currentGuild === "전체" ? guildBadgeHtml(item.guild || "길드 없음") : ""}
              <span class="mb-job">${escapeHtml(item.job || "-")}</span>
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

    // 전체 탭: 길드별 그룹 묶음
    function renderGrouped(list) {
      if (!list.length) return createEmptyBox("해당하는 멤버가 없습니다.");
      if (searchKeyword) {
        return list.map((item, idx) => renderMemberCard(item, idx + 1)).join("");
      }
      return GUILDS.map(g => {
        const gList = list.filter(r => r.guild === g);
        if (!gList.length) return "";
        const stats = guildStats(g);
        return `
          <div class="mb-group">
            <div class="mb-group-header">
              ${guildBadgeHtml(g)}
              <span class="mb-group-count">${gList.length}명</span>
              <span class="mb-group-power">평균 ${formatCompactPower(stats.avgPower)}</span>
            </div>
            <div class="mb-group-list">
              ${gList.map((item, idx) => renderMemberCard(item, idx + 1)).join("")}
            </div>
          </div>
        `;
      }).join("");
    }

    // 단일 길드: flat 리스트
    function renderFlat(list) {
      if (!list.length) return createEmptyBox("해당하는 멤버가 없습니다.");
      return list.map((item, idx) => renderMemberCard(item, idx + 1)).join("");
    }

    function tabLabel(g) {
      const stats = guildStats(g);
      return `${g} <span class="tab-count">${stats.count}</span>`;
    }

    function render() {
      const filtered = getFiltered();
      const isAll = currentGuild === "전체";

      // 길드 요약 카드는 항상 고정
      document.getElementById("mb-guild-summary-area").innerHTML = renderGuildSummary();

      // 리스트 영역
      const listHtml = isAll ? renderGrouped(filtered) : renderFlat(filtered);
      document.getElementById("members-list").innerHTML = listHtml;

      document.getElementById("members-count").textContent = `${formatNumber(filtered.length)}명`;

      // 탭 활성화
      document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("is-active", btn.dataset.guild === currentGuild);
      });

      // 정렬 버튼 활성화
      document.querySelectorAll(".sort-btn").forEach(btn => {
        btn.classList.toggle("is-active", btn.dataset.sort === sortMode);
      });

      // 요약 카드 클릭 이벤트 재등록
      document.querySelectorAll("[data-guild-filter]").forEach(card => {
        card.addEventListener("click", () => {
          const guild = card.dataset.guildFilter;
          currentGuild = guild;
          render();
        });
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

          <!-- 길드 요약 카드: 항상 고정 -->
          <div id="mb-guild-summary-area"></div>

          <div class="toolbar-card">
            <label class="search-field">
              <span>🔎</span>
              <input id="membersSearchInput" type="text" placeholder="캐릭터명 검색" autocomplete="off" />
            </label>
            <button id="membersResetButton" class="ghost-btn" type="button">초기화</button>
            <div class="mb-sort-group">
              <button class="sort-btn is-active" data-sort="power">전투력</button>
              <button class="sort-btn" data-sort="level">레벨</button>
              <button class="sort-btn" data-sort="name">이름</button>
              <button class="sort-btn" data-sort="popularity">인기도</button>
            </div>
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

    // 정렬 이벤트
    document.querySelectorAll(".sort-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        sortMode = btn.dataset.sort;
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