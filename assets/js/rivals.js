document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const API_BASE = "https://guild-backend-production-75a6.up.railway.app";
    const res = await fetch(`${API_BASE}/api/rivals`, { cache: "no-store" });
    if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
    const guilds = await res.json();
    if (!guilds.length) throw new Error("길드 데이터가 없습니다.");

    // 길드별 테마
    const THEMES = {
      "친구들":  { color: "#f59e0b", light: "#fffbeb", border: "#fde68a", dark: "#92400e", emoji: "😊", tag: "우리 길드" },
      "싸이월드": { color: "#3b82f6", light: "#eff6ff", border: "#bfdbfe", dark: "#1d4ed8", emoji: "🌐", tag: "라이벌" },
      "리안":    { color: "#8b5cf6", light: "#f5f3ff", border: "#ddd6fe", dark: "#6d28d9", emoji: "⚔️", tag: "라이벌" },
    };
    function theme(name) {
      return THEMES[name] || { color: "#6b7280", light: "#f9fafb", border: "#e5e7eb", dark: "#374151", emoji: "🏰", tag: "" };
    }

    const maxPower = Math.max(...guilds.map(g => g.total_power || 0));

    // ── 업데이트 시간 ──
    const updateTime = guilds[0]?.captured_at
      ? new Date(guilds[0].captured_at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "-";

    // ── 1. 승부 결과판 카드 ──
    function resultCardHtml(guild, rank) {
      const t = theme(guild.guild_name);
      const isFirst = rank === 1;
      const medals = ["🥇", "🥈", "🥉"];

      const growthText = guild.monthly_growth !== null && guild.monthly_growth !== undefined
        ? (guild.monthly_growth > 0 ? `📈 +${formatCompactPower(guild.monthly_growth)}` : `📉 ${formatCompactPower(guild.monthly_growth)}`)
        : "📈 -";

      return `
        <div class="rv2-result-card${isFirst ? " rv2-result-first" : ""}" style="border-color:${t.border};background:${t.light};">
          ${isFirst ? `<div class="rv2-first-crown" style="background:${t.color};">👑 1위</div>` : ""}
          <div class="rv2-result-medal">${medals[rank - 1] || rank + "위"}</div>
          <div class="rv2-result-guild" style="color:${t.color};">${t.emoji} ${escapeHtml(guild.guild_name)}</div>
          ${t.tag ? `<div class="rv2-result-tag" style="background:${t.color}20;color:${t.dark};">${t.tag}</div>` : ""}
          <div class="rv2-result-power" style="color:${t.color};">${formatCompactPower(guild.total_power)}</div>
          <div class="rv2-result-sub">총 전투력</div>
          <div class="rv2-result-stats">
            <div class="rv2-rs-item"><span>👥</span>${guild.member_count}명</div>
            <div class="rv2-rs-item"><span>⭐</span>평균 Lv ${guild.avg_level || "-"}</div>
            <div class="rv2-rs-item" style="${guild.monthly_growth > 0 ? "color:#059669;" : "color:var(--text-soft);"}">${growthText}</div>
          </div>
          <div class="rv2-result-top1">
            <span style="color:${t.color};font-weight:700;">🔥 ${escapeHtml(guild.top1_name || "-")}</span>
            <span style="color:var(--text-soft);font-size:0.78rem;">${formatCompactPower(guild.top1_power)}</span>
          </div>
        </div>
      `;
    }

    // ── 2. 길드별 캐릭터 나열 (세로 비교형) ──
    function memberGridHtml() {
      const maxLen = Math.max(...guilds.map(g => (g.members || []).length));

      const headerRow = guilds.map(g => {
        const t = theme(g.guild_name);
        const pct = maxPower > 0 ? Math.round((g.total_power / maxPower) * 100) : 0;
        return `
          <div class="rv2-col-header" style="border-color:${t.border};background:${t.light};">
            <div style="font-size:1.1rem;font-weight:800;color:${t.color};">${t.emoji} ${escapeHtml(g.guild_name)}</div>
            <div style="font-size:0.78rem;color:var(--text-soft);margin:2px 0;">${g.member_count}명</div>
            <div class="rv2-mini-bar-track">
              <div class="rv2-mini-bar-fill" style="width:${pct}%;background:${t.color};"></div>
            </div>
            <div style="font-size:0.72rem;color:${t.color};font-weight:700;">${formatCompactPower(g.total_power)}</div>
          </div>
        `;
      }).join("");

      let rows = "";
      for (let i = 0; i < maxLen; i++) {
        const cells = guilds.map(g => {
          const m = (g.members || [])[i];
          const t = theme(g.guild_name);
          if (!m) return `<div class="rv2-member-cell rv2-empty-cell"></div>`;

          const pt = m.power_text || "";
          const parts = pt.trim().split(/\s+/).filter(Boolean);
          const dispPower = parts.length >= 2 ? parts[0] + " " + parts[1] : pt || formatCompactPower(m.power);

          return `
            <div class="rv2-member-cell" style="border-color:${t.border}20;">
              <div class="rv2-member-rank" style="color:${t.color};">${i + 1}</div>
              <div class="rv2-member-avatar">
                ${characterAvatarHtml(m)}
              </div>
              <div class="rv2-member-info">
                <div class="rv2-member-name">${escapeHtml(m.name || "-")}</div>
                <div class="rv2-member-meta">${escapeHtml(m.job || "")} · Lv ${m.level || "-"}</div>
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

    // ── 3. 항목별 메달 ──
    function medalBoardHtml() {
      const items = [
        { label: "⚔️ 합산 전투력", key: "total_power", fmt: v => formatCompactPower(v), higher: true },
        { label: "📈 월간 성장", key: "monthly_growth", fmt: v => v !== null ? `+${formatCompactPower(v)}` : "-", higher: true, skipNull: true },
        { label: "🔥 에이스 전투력", key: "top1_power", fmt: v => formatCompactPower(v), higher: true },
        { label: "⭐ 평균 레벨", key: "avg_level", fmt: v => `Lv ${v}`, higher: true },
        { label: "👥 인원수", key: "member_count", fmt: v => `${v}명`, higher: true },
        { label: "🗺️ 서버 순위", key: "server_rank", fmt: v => v ? `${formatNumber(v)}위` : "-", higher: false },
      ];

      return items.map(item => {
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
                  ${isBest ? `<span class="rv2-medal-icon">🥇</span>` : ""}
                  <span style="${isBest ? `color:${t.color};font-weight:800;` : ""}">${item.fmt(g[item.key])}</span>
                </div>
              `;
            }).join("")}
          </div>
        `;
      }).join("");
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">

          <div style="padding:32px 0 20px;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px;">
              <h1 style="font-size:1.8rem;font-weight:900;color:var(--text);margin:0;line-height:1;">⚔️ 길드 라이벌전</h1>
            </div>
            <p style="font-size:0.85rem;color:var(--text-soft);margin:0 0 2px;">
              친구들 vs 싸이월드 vs 리안 · 스카니아 11서버 3파전
            </p>
            <p style="font-size:0.75rem;color:var(--text-faint);margin:0;">📅 ${updateTime} 기준</p>
          </div>

          <!-- 1. 승부 결과판 -->
          <div class="rv2-result-grid">
            ${guilds.map((g, i) => resultCardHtml(g, i + 1)).join("")}
          </div>

          <!-- 2. 항목별 메달 -->
          <div style="margin:24px 0 8px;">
            <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:12px;">🏅 항목별 1위</div>
            <div class="rv2-medal-board">
              <div class="rv2-medal-row rv2-medal-header">
                <div class="rv2-medal-label">항목</div>
                ${guilds.map(g => {
                  const t = theme(g.guild_name);
                  return `<div class="rv2-medal-guild" style="color:${t.color};">${t.emoji} ${escapeHtml(g.guild_name)}</div>`;
                }).join("")}
              </div>
              ${medalBoardHtml()}
            </div>
          </div>

          <!-- 3. 길드별 캐릭터 대전 -->
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
        <div class="error-box">데이터를 불러오지 못했습니다: ${escapeHtml(error?.message || "오류")}<br>
        <small style="color:var(--text-faint);">경쟁 길드 크롤링이 아직 실행되지 않았을 수 있어요.</small></div>
      </div>
    `;
  }
});