document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const API_BASE = "https://guild-backend-production-75a6.up.railway.app";

    // 멤버 + 월간성장 데이터 병렬 로드
    const [membersRes, monthlyRes] = await Promise.all([
      fetch(`${API_BASE}/api/members`, { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/monthly`, { cache: "no-store" }).then(r => r.ok ? r.json() : []),
    ]);

    const allMembers = Array.isArray(membersRes) ? membersRes : [];
    const monthlyRows = Array.isArray(monthlyRes) ? monthlyRes : [];

    const CIVIL_GUILDS = ["친구둘", "친구삼", "친구넷"];

    // 길드별 테마
    const THEMES = {
      "친구둘": { color: "#3b82f6", light: "#eff6ff", border: "#bfdbfe", dark: "#1d4ed8", emoji: "⚔️", tag: "내전 참가" },
      "친구삼": { color: "#22c55e", light: "#f0fdf4", border: "#bbf7d0", dark: "#15803d", emoji: "🛡️", tag: "내전 참가" },
      "친구넷": { color: "#a855f7", light: "#faf5ff", border: "#ddd6fe", dark: "#7e22ce", emoji: "🔥", tag: "내전 참가" },
    };
    function theme(name) {
      return THEMES[name] || { color: "#6b7280", light: "#f9fafb", border: "#e5e7eb", dark: "#374151", emoji: "🏰", tag: "" };
    }
    function guildIconHtml(t, size = 28, inline = false) {
      const style = inline
        ? `font-size:${size}px;line-height:1;vertical-align:middle;`
        : `font-size:${size}px;line-height:1;display:block;text-align:center;`;
      return `<span style="${style}">${t.emoji}</span>`;
    }

    // 길드별 데이터 구성
    const guilds = CIVIL_GUILDS.map(guildName => {
      const members = allMembers
        .filter(m => m.guild === guildName)
        .sort((a, b) => Number(b.power||0) - Number(a.power||0));

      const totalPower = members.reduce((s, m) => s + Number(m.power||0), 0);
      const memberCount = members.length;
      const avgLevel = memberCount
        ? Math.round(members.reduce((s, m) => s + Number(m.level||0), 0) / memberCount * 10) / 10
        : 0;
      const avgPower = memberCount ? Math.round(totalPower / memberCount) : 0;
      const top1 = members[0] || {};
      const top10Power = members.slice(0, 10).reduce((s, m) => s + Number(m.power||0), 0);
      const totalPopularity = members.reduce((s, m) => s + Number(m.popularity||0), 0);

      // 월간 성장량
      const guildMonthly = monthlyRows.filter(r => r.guild === guildName);
      const monthlyGrowth = guildMonthly.reduce((s, r) => s + Number(r.monthlyDiff||0), 0);
      const hasSnapshot = guildMonthly.some(r => r.hasSnapshot);
      const growthRate = (hasSnapshot && totalPower > 0 && monthlyGrowth > 0)
        ? Math.round((monthlyGrowth / (totalPower - monthlyGrowth)) * 10000) / 100
        : null;

      return {
        guild_name: guildName,
        total_power: totalPower,
        member_count: memberCount,
        avg_level: avgLevel,
        avg_power: avgPower,
        top1_name: top1.name || "",
        top1_power: top1.power || 0,
        top1_job: top1.job || "",
        top10_power: top10Power,
        total_popularity: totalPopularity,
        monthly_growth: hasSnapshot ? monthlyGrowth : null,
        growth_rate: growthRate,
        members: members.map(m => ({
          name: m.name,
          job: m.job,
          level: m.level,
          power: m.power,
          power_text: m.powerText || m.power_text,
          server_rank: m.serverRank || m.server_rank,
          detail_url: m.detailUrl || m.detail_url,
        })),
      };
    });

    // 총전투력 기준 정렬
    guilds.sort((a, b) => b.total_power - a.total_power);

    const maxPower = Math.max(...guilds.map(g => g.total_power));
    const updateTime = new Date().toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

    // ── 성장 1위 배너 ──
    function weeklyWinnerBanner() {
      const withGrowth = guilds.filter(g => g.monthly_growth !== null && g.monthly_growth > 0);
      if (!withGrowth.length) return "";
      const winner = withGrowth.reduce((a, b) => a.monthly_growth > b.monthly_growth ? a : b);
      const t = theme(winner.guild_name);
      return `
        <div class="rv2-winner-banner" style="border-color:${t.border};background:${t.light};">
          <div class="rv2-winner-left">
            <span class="rv2-winner-crown">🏆 이번 달 성장 1위</span>
            <div class="rv2-winner-name" style="color:${t.color};">
              ${guildIconHtml(t, 22, true)} ${escapeHtml(winner.guild_name)}
            </div>
            <div class="rv2-winner-sub">🔥 +${formatCompactPower(winner.monthly_growth)} 성장</div>
          </div>
          <div class="rv2-winner-right">🎉</div>
        </div>
      `;
    }

    // ── 승부 결과판 ──
    function resultCardHtml(guild, rank) {
      const t = theme(guild.guild_name);
      const medals = ["🥇", "🥈", "🥉"];
      const growthText = guild.monthly_growth !== null
        ? `+${formatCompactPower(guild.monthly_growth)}`
        : "-";
      const isGrowthWinner = guilds
        .filter(g => g.monthly_growth !== null)
        .every(g => g.guild_name === guild.guild_name || guild.monthly_growth >= g.monthly_growth);

      return `
        <div class="rv2-result-card" style="border-color:${t.border};background:${t.light};">
          <div class="rv2-result-medal">${medals[rank-1] || rank+"위"}</div>
          <div style="margin:4px 0;">${guildIconHtml(t, 30)}</div>
          <div class="rv2-result-guild" style="color:${t.color};">${escapeHtml(guild.guild_name)}</div>
          <div class="rv2-result-power" style="color:${t.color};">${formatCompactPower(guild.total_power)}</div>
          <div class="rv2-result-sub">합산 전투력</div>
          <div class="rv2-result-stats">
            <div class="rv2-rs-item">👥 ${guild.member_count}명</div>
            <div class="rv2-rs-item">⭐ 평균 Lv ${guild.avg_level}</div>
            <div class="rv2-rs-item ${isGrowthWinner && guild.monthly_growth ? "rv2-rs-winner" : ""}">
              📈 ${growthText}${isGrowthWinner && guild.monthly_growth ? " 🏆" : ""}
            </div>
          </div>
          <div class="rv2-result-top1">
            <span style="color:${t.color};font-weight:700;">🔥 ${escapeHtml(guild.top1_name||"-")}</span>
            <span style="color:var(--text-soft);font-size:0.78rem;">${formatCompactPower(guild.top1_power)}</span>
          </div>
        </div>
      `;
    }

    // ── 항목별 메달 ──
    const STAT_ITEMS = [
      { label: "⚔️ 합산 전투력", key: "total_power",      fmt: v => formatCompactPower(v), higher: true },
      { label: "📈 이달 성장",   key: "monthly_growth",   fmt: v => v ? `+${formatCompactPower(v)}` : "-", higher: true, skipNull: true },
      { label: "🔥 에이스",      key: "top1_power",        fmt: v => formatCompactPower(v), higher: true },
      { label: "💎 평균 전투력", key: "avg_power",         fmt: v => formatCompactPower(v), higher: true },
      { label: "⭐ 평균 레벨",   key: "avg_level",         fmt: v => `Lv ${v}`, higher: true },
      { label: "📊 성장률",      key: "growth_rate",       fmt: v => v ? `${v}%` : "-", higher: true, skipNull: true },
      { label: "❤️ 인기도",     key: "total_popularity",  fmt: v => v ? formatNumber(v) : "-", higher: true, skipNull: true },
      { label: "👥 인원수",      key: "member_count",      fmt: v => `${v}명`, higher: true },
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
            ${guilds.map(g => {
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

    // ── 전원 대전 ──
    function memberGridHtml() {
      const maxLen = Math.max(...guilds.map(g => g.members.length));

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
          const m = g.members[i];
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
            <h1 style="font-size:1.8rem;font-weight:900;color:var(--text);margin:0 0 6px;line-height:1;">⚔️ 길드 내전</h1>
            <p style="font-size:0.85rem;color:var(--text-soft);margin:0 0 2px;">친구둘 vs 친구삼 vs 친구넷 · 내부 리그 3파전</p>
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
                  return `<div class="rv2-medal-guild" style="color:${t.color};">${guildIconHtml(t, 18, true)} ${escapeHtml(g.guild_name)}</div>`;
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