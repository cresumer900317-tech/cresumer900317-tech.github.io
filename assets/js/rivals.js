document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const API_BASE = "https://guild-backend-production-75a6.up.railway.app";
    const res = await fetch(`${API_BASE}/api/rivals`, { cache: "no-store" });
    if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
    const guilds = await res.json();
    if (!guilds.length) throw new Error("길드 데이터가 없습니다.");

    const THEMES = {
      "친구들":  { color: "#f59e0b", light: "#fffbeb", border: "#fde68a", dark: "#92400e", emoji: "😊", icon: null,                              tag: "우리 길드" },
      "싸이월드": { color: "#3b82f6", light: "#eff6ff", border: "#bfdbfe", dark: "#1d4ed8", emoji: "🌐", icon: "./assets/img/cyworld-imoge.png", tag: "라이벌" },
      "리안":    { color: "#8b5cf6", light: "#f5f3ff", border: "#ddd6fe", dark: "#6d28d9", emoji: "⚔️", icon: "./assets/img/lian-imoge.png",    tag: "라이벌" },
    };
    function theme(name) {
      return THEMES[name] || { color: "#6b7280", light: "#f9fafb", border: "#e5e7eb", dark: "#374151", emoji: "🏰", icon: null, tag: "" };
    }
    function guildIconHtml(t, size = 28) {
      if (t.icon) {
        return `<img src="${t.icon}" alt="길드마크" style="width:${size}px;height:${size}px;image-rendering:pixelated;object-fit:contain;mix-blend-mode:multiply;display:block;margin:0 auto;" />`;
      }
      return `<span style="font-size:${size}px;line-height:1;display:block;text-align:center;">${t.emoji}</span>`;
    }

    // ── 추가 계산 ──
    guilds.forEach(g => {
      const members = g.members || [];
      g.avg_power = members.length ? Math.round(members.reduce((s,m) => s + (m.power||0), 0) / members.length) : 0;
    });

    // ── 이번 주 승자 계산 ──
    function getWinner(key, higher = true) {
      const valid = guilds.filter(g => g[key] > 0);
      if (!valid.length) return null;
      return higher
        ? valid.reduce((a, b) => (a[key] > b[key] ? a : b))
        : valid.reduce((a, b) => (a[key] < b[key] ? a : b));
    }
    const growthWinner = getWinner("monthly_growth");
    const thisWeekWinner = growthWinner; // 성장량 기준

    const updateTime = guilds[0]?.captured_at
      ? new Date(guilds[0].captured_at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "-";

    // ── 1. 이번 주 승자 배너 ──
    function weeklyWinnerBanner() {
      if (!thisWeekWinner) return "";
      const t = theme(thisWeekWinner.guild_name);
      const isUs = thisWeekWinner.guild_name === "친구들";
      return `
        <div class="rv2-winner-banner" style="border-color:${t.border};background:${t.light};">
          <div class="rv2-winner-left">
            <span class="rv2-winner-crown">🏆 이번 달 성장 1위</span>
            <div class="rv2-winner-name" style="color:${t.color};">
              ${guildIconHtml(t, 22)} ${escapeHtml(thisWeekWinner.guild_name)}
              ${isUs ? `<span class="rv2-us-badge">우리 길드!</span>` : ""}
            </div>
            <div class="rv2-winner-sub">🔥 +${formatCompactPower(thisWeekWinner.monthly_growth)} 성장</div>
          </div>
          ${isUs ? `<div class="rv2-winner-right">🎉</div>` : ""}
        </div>
      `;
    }

    // ── 2. 승부 결과판 ──
    function resultCardHtml(guild, rank) {
      const t = theme(guild.guild_name);
      const isUs = guild.guild_name === "친구들";
      const medals = ["🥇", "🥈", "🥉"];

      const growthText = guild.monthly_growth
        ? (guild.monthly_growth > 0 ? `+${formatCompactPower(guild.monthly_growth)}` : `-${formatCompactPower(Math.abs(guild.monthly_growth))}`)
        : "-";
      const isGrowthWinner = growthWinner?.guild_name === guild.guild_name;

      return `
        <div class="rv2-result-card${isUs ? " rv2-result-us" : ""}" style="border-color:${isUs ? t.color : t.border};background:${t.light};">
          ${isUs ? `<div class="rv2-us-crown" style="background:${t.color};">😊 우리 길드</div>` : ""}
          <div class="rv2-result-medal">${medals[rank-1] || rank+"위"}</div>
          <div style="margin:4px 0;">${guildIconHtml(t, 30)}</div>
          <div class="rv2-result-guild" style="color:${t.color};">${escapeHtml(guild.guild_name)}</div>
          <div class="rv2-result-power" style="color:${t.color};">${formatCompactPower(guild.total_power)}</div>
          <div class="rv2-result-sub">합산 전투력</div>
          <div class="rv2-result-stats">
            <div class="rv2-rs-item">👥 ${guild.member_count}명</div>
            <div class="rv2-rs-item">⭐ 평균 Lv ${guild.avg_level||"-"}</div>
            <div class="rv2-rs-item ${isGrowthWinner ? "rv2-rs-winner" : ""}">
              📈 ${growthText}${isGrowthWinner ? " 🏆" : ""}
            </div>
          </div>
          <div class="rv2-result-top1">
            <span style="color:${t.color};font-weight:700;">🔥 ${escapeHtml(guild.top1_name||"-")}</span>
            <span style="color:var(--text-soft);font-size:0.78rem;">${formatCompactPower(guild.top1_power)}</span>
          </div>
        </div>
      `;
    }

    // ── 3. 항목별 메달 ──
    const STAT_ITEMS = [
      { label: "⚔️ 합산 전투력", key: "total_power",     fmt: v => formatCompactPower(v), higher: true },
      { label: "📈 이달 성장",   key: "monthly_growth",  fmt: v => v ? `+${formatCompactPower(v)}` : "-", higher: true, skipNull: true },
      { label: "⭐ 평균 레벨",   key: "avg_level",        fmt: v => `Lv ${v}`, higher: true },
      { label: "🗺️ 서버 순위",  key: "server_rank",      fmt: v => v ? `${formatNumber(v)}위` : "-", higher: false },
      { label: "📊 성장률",      key: "growth_rate",      fmt: v => v ? `${v}%` : "-", higher: true, skipNull: true },
      { label: "❤️ 인기도",     key: "total_popularity", fmt: v => v ? formatNumber(v) : "-", higher: true, skipNull: true },
      { label: "🏆 월간 공헌도", key: "total_contribution", fmt: v => v ? formatNumber(v) : "-", higher: true, skipNull: true },
    ];

    function medalBoardHtml() {
      return STAT_ITEMS.map(item => {
        const vals = guilds.map(g => {
          const v = g[item.key];
          if (item.skipNull && (v === null || v === undefined || v <= 0)) return -1;
          return Number(v) || 0;
        });
        const validVals = vals.filter(v => v > 0);
        if (!validVals.length) return "";
        const best = item.higher ? Math.max(...validVals) : Math.min(...validVals);

        return `
          <div class="rv2-medal-row">
            <div class="rv2-medal-label">${item.label}</div>
            ${guilds.map((g, i) => {
              const val = Number(g[item.key]) || 0;
              const isBest = val === best && val > 0;
              const t = theme(g.guild_name);
              return `
                <div class="rv2-medal-cell${isBest ? " rv2-medal-best" : ""}"
                     style="${isBest ? `background:${t.light};border-color:${t.border};` : ""}">
                  ${isBest ? `<span>🥇</span>` : ""}
                  <span style="${isBest ? `color:${t.color};font-weight:800;` : ""}">${item.fmt(g[item.key])}</span>
                </div>
              `;
            }).join("")}
          </div>
        `;
      }).join("");
    }

    // ── 4. 전원 대전 (VS 느낌) ──
    function memberGridHtml() {
      const maxLen = Math.max(...guilds.map(g => (g.members||[]).length));
      const maxPower = Math.max(...guilds.map(g => g.total_power||0));

      const JOB_KO = {
        bishop:"비숍", shadower:"섀도어", darkknight:"다크나이트",
        hero:"히어로", paladin:"팔라딘", bowmaster:"보우마스터",
        marksman:"신궁", nightlord:"나이트로드", mage_sc:"썬콜",
        mage_fd:"불독", dualblade:"듀블", phantom:"팬텀",
        luminous:"루미너스", evan:"에반", mercedes:"메르세데스",
        kaiser:"카이저", kain:"카인", adele:"아델", ark:"아크",
        aran:"아란", blaster:"블래스터",
      };

      const headerRow = guilds.map(g => {
        const t = theme(g.guild_name);
        const pct = maxPower > 0 ? Math.round((g.total_power/maxPower)*100) : 0;
        return `
          <div class="rv2-col-header" style="border-color:${t.border};background:${t.light};">
            ${guildIconHtml(t, 26)}
            <div style="font-size:0.95rem;font-weight:800;color:${t.color};margin-top:4px;">${escapeHtml(g.guild_name)}</div>
            <div style="font-size:0.75rem;color:var(--text-soft);">${g.member_count}명</div>
            <div class="rv2-mini-bar-track"><div class="rv2-mini-bar-fill" style="width:${pct}%;background:${t.color};"></div></div>
            <div style="font-size:0.72rem;color:${t.color};font-weight:700;">${formatCompactPower(g.total_power)}</div>
          </div>
        `;
      }).join("");

      let rows = "";
      for (let i = 0; i < maxLen; i++) {
        const cells = guilds.map(g => {
          const m = (g.members||[])[i];
          const t = theme(g.guild_name);
          if (!m) return `<div class="rv2-member-cell rv2-empty-cell" style="border-color:${t.border}20;"></div>`;

          const pt = m.power_text || "";
          const parts = pt.trim().split(/\s+/).filter(Boolean);
          const dispPower = parts.length >= 2 ? parts[0]+" "+parts[1] : pt || formatCompactPower(m.power);
          const jobDisplay = JOB_KO[m.job] || m.job || "";

          return `
            <div class="rv2-member-cell" style="border-color:${t.border}30;">
              <div class="rv2-member-rank" style="color:${t.color};">${i+1}</div>
              <div class="rv2-member-avatar">${characterAvatarHtml(m)}</div>
              <div class="rv2-member-info">
                <div class="rv2-member-name">${escapeHtml(m.name||"-")}</div>
                <div class="rv2-member-meta">${escapeHtml(jobDisplay)} · Lv ${m.level||"-"}</div>
                <div class="rv2-member-power" style="color:${t.color};">${escapeHtml(dispPower)}</div>
              </div>
            </div>
          `;
        }).join("");
        rows += `<div class="rv2-member-row">${cells}</div>`;
      }

      return `
        <div class="rv2-battle-grid">
          <div class="rv2-member-row rv2-header-row">${headerRow}</div>
          ${rows}
        </div>
      `;
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:32px 0 16px;">
            <h1 style="font-size:1.8rem;font-weight:900;color:var(--text);margin:0 0 6px;line-height:1;">⚔️ 길드 라이벌전</h1>
            <p style="font-size:0.85rem;color:var(--text-soft);margin:0 0 2px;">친구들 vs 싸이월드 vs 리안 · 스카니아 11서버 3파전</p>
            <p style="font-size:0.75rem;color:var(--text-faint);margin:0;">📅 ${updateTime} 기준</p>
          </div>

          ${weeklyWinnerBanner()}

          <div class="rv2-result-grid" style="margin-top:16px;">
            ${guilds.map((g, i) => resultCardHtml(g, i+1)).join("")}
          </div>

          <div style="margin:24px 0 8px;">
            <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:12px;">🏅 항목별 1위</div>
            <div class="rv2-medal-board">
              <div class="rv2-medal-row rv2-medal-header">
                <div class="rv2-medal-label">항목</div>
                ${guilds.map(g => {
                  const t = theme(g.guild_name);
                  return `<div class="rv2-medal-guild" style="color:${t.color};">${guildIconHtml(t, 18)} ${escapeHtml(g.guild_name)}</div>`;
                }).join("")}
              </div>
              ${medalBoardHtml()}
            </div>
          </div>

          <div style="margin-top:28px;">
            <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:12px;">⚔️ 전원 대전</div>
            ${memberGridHtml()}
          </div>
        </div>
      </div>
    `;

  } catch (error) {
    console.error(error);
    document.querySelector("main").innerHTML = `
      <div class="container" style="padding-top:40px;">
        <div class="error-box">데이터를 불러오지 못했습니다: ${escapeHtml(error?.message||"오류")}</div>
      </div>
    `;
  }
});