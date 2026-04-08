// ── 라이벌전 / 내전 공통 렌더링 ──────────────────────────────

const BATTLE_JOB_KO = {
  bishop:"비숍", shadower:"섀도어", darkknight:"다크나이트",
  hero:"히어로", paladin:"팔라딘", bowmaster:"보우마스터",
  marksman:"신궁", nightlord:"나이트로드", mage_sc:"썬콜",
  mage_fd:"불독", dualblade:"듀블", phantom:"팬텀",
  luminous:"루미너스", evan:"에반", mercedes:"메르세데스",
  kaiser:"카이저", kain:"카인", adele:"아델", ark:"아크",
  aran:"아란", blaster:"블래스터",
};

function battleGuildIconHtml(t, size = 28, inline = false) {
  if (t.icon) {
    const style = inline
      ? `width:${size}px;height:${size}px;image-rendering:pixelated;object-fit:contain;mix-blend-mode:multiply;display:inline-block;vertical-align:middle;`
      : `width:${size}px;height:${size}px;image-rendering:pixelated;object-fit:contain;mix-blend-mode:multiply;display:block;margin:0 auto;`;
    return `<img src="${t.icon}" alt="길드마크" style="${style}" />`;
  }
  const style = inline
    ? `font-size:${size}px;line-height:1;vertical-align:middle;`
    : `font-size:${size}px;line-height:1;display:block;text-align:center;`;
  return `<span style="${style}">${t.emoji}</span>`;
}

function battleWinnerBanner(winner, themeFn, ourGuild) {
  if (!winner) return "";
  const t = themeFn(winner.guild_name);
  const isUs = ourGuild && winner.guild_name === ourGuild;
  return `
    <div class="rv2-winner-banner" style="border-color:${t.border};background:${t.light};">
      <div class="rv2-winner-left">
        <span class="rv2-winner-crown">🏆 이번 달 성장 1위</span>
        <div class="rv2-winner-name" style="color:${t.color};">
          ${battleGuildIconHtml(t, 22, !ourGuild)} ${escapeHtml(winner.guild_name)}
          ${isUs ? `<span class="rv2-us-badge">우리 길드!</span>` : ""}
        </div>
        <div class="rv2-winner-sub">🔥 +${formatCompactPower(winner.monthly_growth)} 성장</div>
      </div>
      ${isUs ? `<div class="rv2-winner-right">🎉</div>` : `<div class="rv2-winner-right">🎉</div>`}
    </div>
  `;
}

function battleResultCard(guild, rank, themeFn, growthWinnerName, ourGuild) {
  const t = themeFn(guild.guild_name);
  const isUs = ourGuild && guild.guild_name === ourGuild;
  const medals = ["🥇", "🥈", "🥉"];

  const growthText = guild.monthly_growth != null && guild.monthly_growth !== 0
    ? (guild.monthly_growth > 0 ? `+${formatCompactPower(guild.monthly_growth)}` : `-${formatCompactPower(Math.abs(guild.monthly_growth))}`)
    : "-";
  const isGrowthWinner = growthWinnerName === guild.guild_name;

  return `
    <div class="rv2-result-card${isUs ? " rv2-result-us" : ""}" style="border-color:${isUs ? t.color : t.border};background:${t.light};">
      ${isUs ? `<div class="rv2-us-crown" style="background:${t.color};">😊 우리 길드</div>` : ""}
      <div class="rv2-result-medal">${medals[rank-1] || rank+"위"}</div>
      <div style="margin:4px 0;">${battleGuildIconHtml(t, 30)}</div>
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

function battleMedalBoard(guilds, statItems, themeFn) {
  return statItems.map(item => {
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
          const t = themeFn(g.guild_name);
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

function battleMemberGrid(guilds, themeFn, maxPower) {
  const maxLen = Math.max(...guilds.map(g => (g.members||[]).length));

  const headerRow = guilds.map(g => {
    const t = themeFn(g.guild_name);
    const pct = maxPower > 0 ? Math.round((g.total_power/maxPower)*100) : 0;
    return `
      <div class="rv2-col-header" style="border-color:${t.border};background:${t.light};">
        ${battleGuildIconHtml(t, 26)}
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
      const t = themeFn(g.guild_name);
      if (!m) return `<div class="rv2-member-cell rv2-empty-cell" style="border-color:${t.border}20;"></div>`;

      const dispPower = getPowerDisplay({ powerText: m.power_text, power: m.power });
      const jobDisplay = BATTLE_JOB_KO[m.job] || m.job || "";

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

function battlePageHtml(cfg) {
  const { guilds, themeFn, statItems, winner, growthWinnerName, ourGuild, title, subtitle, dateLabel, maxPower } = cfg;
  return `
    <div class="page-card">
      <div class="container">
        <div style="padding:32px 0 16px;">
          <h1 style="font-size:1.8rem;font-weight:900;color:var(--text);margin:0 0 6px;line-height:1;">${title}</h1>
          <p style="font-size:0.85rem;color:var(--text-soft);margin:0 0 2px;">${subtitle}</p>
          <p style="font-size:0.75rem;color:var(--text-faint);margin:0;">📅 ${escapeHtml(dateLabel)} 기준</p>
        </div>

        ${battleWinnerBanner(winner, themeFn, ourGuild)}

        <div class="rv2-result-grid" style="margin-top:16px;">
          ${guilds.map((g, i) => battleResultCard(g, i+1, themeFn, growthWinnerName, ourGuild)).join("")}
        </div>

        <div style="margin:24px 0 8px;">
          <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:12px;">🏅 항목별 1위</div>
          <div class="rv2-medal-board">
            <div class="rv2-medal-row rv2-medal-header">
              <div class="rv2-medal-label">항목</div>
              ${guilds.map(g => {
                const t = themeFn(g.guild_name);
                return `<div class="rv2-medal-guild" style="color:${t.color};">${battleGuildIconHtml(t, 18, true)} ${escapeHtml(g.guild_name)}</div>`;
              }).join("")}
            </div>
            ${battleMedalBoard(guilds, statItems, themeFn)}
          </div>
        </div>

        <div style="margin-top:28px;">
          <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:12px;">⚔️ 전원 대전</div>
          ${battleMemberGrid(guilds, themeFn, maxPower)}
        </div>
      </div>
    </div>
  `;
}
