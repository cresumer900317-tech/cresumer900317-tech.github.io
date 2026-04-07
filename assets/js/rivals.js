document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    const API_BASE = "https://guild-backend-production-75a6.up.railway.app";
    const res = await fetch(`${API_BASE}/api/rivals`, { cache: "no-store" });
    if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
    const guilds = await res.json();

    if (!guilds.length) throw new Error("길드 데이터가 없습니다.");

    // 1위 결정
    const maxPower = Math.max(...guilds.map(g => g.total_power || 0));

    // 길드별 색상
    const GUILD_COLORS = {
      "친구패밀리": { main: "#f59e0b", light: "#fffbeb", border: "#fde68a", text: "#92400e", emoji: "😊" },
      "싸이월드":   { main: "#3b82f6", light: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", emoji: "🌐" },
      "리안":       { main: "#8b5cf6", light: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9", emoji: "⚔️" },
    };

    function getColor(name) {
      return GUILD_COLORS[name] || { main: "#6b7280", light: "#f9fafb", border: "#e5e7eb", text: "#374151", emoji: "🏰" };
    }

    function powerBarHtml(guild, rank) {
      const color = getColor(guild.guild_name);
      const pct = maxPower > 0 ? Math.round((guild.total_power / maxPower) * 100) : 0;
      const isFirst = guild.total_power === maxPower;

      return `
        <div class="rv-bar-row${isFirst ? " rv-bar-first" : ""}">
          <div class="rv-bar-meta">
            <div class="rv-bar-guild-name">
              <span class="rv-bar-emoji">${color.emoji}</span>
              <span style="font-weight:800;font-size:1rem;color:var(--text);">${escapeHtml(guild.guild_name)}</span>
              ${isFirst ? `<span class="rv-win-badge">👑 1위</span>` : `<span class="rv-rank-badge">${rank}위</span>`}
            </div>
            <div class="rv-bar-power" style="color:${color.main};">
              ${escapeHtml(formatCompactPower(guild.total_power))}
            </div>
          </div>
          <div class="rv-bar-track">
            <div class="rv-bar-fill" style="width:${pct}%;background:${color.main};"></div>
          </div>
          <div class="rv-bar-info">
            <span>${guild.member_count || "-"}명</span>
            ${guild.server_rank ? `<span>서버 ${formatNumber(guild.server_rank)}위</span>` : ""}
            ${guild.top1_name ? `<span>🔥 ${escapeHtml(guild.top1_name)} ${formatCompactPower(guild.top1_power)}</span>` : ""}
          </div>
        </div>
      `;
    }

    // 스탯 비교 테이블
    function statCompareHtml() {
      const rows = [
        { label: "합산 전투력", key: "total_power", fmt: v => formatCompactPower(v), higher: true },
        { label: "길드원 수",   key: "member_count", fmt: v => `${v}명`, higher: true },
        { label: "서버 순위",   key: "server_rank",  fmt: v => v ? `${formatNumber(v)}위` : "-", higher: false },
        { label: "1위 전투력",  key: "top1_power",   fmt: v => formatCompactPower(v), higher: true },
      ];

      return rows.map(row => {
        const vals = guilds.map(g => g[row.key] || 0);
        const best = row.higher ? Math.max(...vals) : Math.min(...vals.filter(v => v > 0));

        return `
          <div class="rv-stat-row">
            <div class="rv-stat-label">${row.label}</div>
            ${guilds.map(g => {
              const val = g[row.key] || 0;
              const isBest = val === best && val > 0;
              const color = getColor(g.guild_name);
              return `
                <div class="rv-stat-cell${isBest ? " rv-stat-best" : ""}" style="${isBest ? `background:${color.light};border-color:${color.border};` : ""}">
                  ${isBest ? "🏆 " : ""}${row.fmt(val)}
                </div>
              `;
            }).join("")}
          </div>
        `;
      }).join("");
    }

    // 최근 업데이트 시간
    const updateTime = guilds[0]?.captured_at
      ? new Date(guilds[0].captured_at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "-";

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">

          <!-- 헤더 -->
          <div style="padding:32px 0 24px;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
              <h1 style="font-size:1.7rem;font-weight:900;color:var(--text);margin:0;line-height:1;">⚔️ 길드 라이벌전</h1>
              <span style="font-size:0.82rem;color:var(--text-faint);">업데이트: ${updateTime}</span>
            </div>
            <p style="font-size:0.88rem;color:var(--text-soft);margin:0;">
              친구패밀리 · 싸이월드 · 리안 · 스카니아 11서버 3파전
            </p>
          </div>

          <!-- 순위 바 -->
          <div class="rv-bars">
            ${guilds.map((g, i) => powerBarHtml(g, i + 1)).join("")}
          </div>

          <!-- 스탯 비교 -->
          <div class="rv-compare">
            <div class="rv-compare-header">
              <div class="rv-stat-label">항목</div>
              ${guilds.map(g => {
                const color = getColor(g.guild_name);
                return `<div class="rv-compare-guild-name" style="color:${color.main};">${color.emoji} ${escapeHtml(g.guild_name)}</div>`;
              }).join("")}
            </div>
            ${statCompareHtml()}
          </div>

          <!-- TOP1 대결 -->
          <div style="margin-top:28px;">
            <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:12px;">🔥 에이스 대결</div>
            <div class="rv-ace-grid">
              ${guilds.map(g => {
                const color = getColor(g.guild_name);
                const isTop = g.top1_power === Math.max(...guilds.map(x => x.top1_power || 0));
                return `
                  <div class="rv-ace-card${isTop ? " rv-ace-top" : ""}" style="border-color:${color.border};background:${color.light};">
                    ${isTop ? `<div class="rv-ace-crown">👑 최강</div>` : ""}
                    <div class="rv-ace-guild" style="color:${color.main};">${color.emoji} ${escapeHtml(g.guild_name)}</div>
                    <div class="rv-ace-name">${g.top1_name ? escapeHtml(g.top1_name) : "-"}</div>
                    <div class="rv-ace-power" style="color:${color.main};">${formatCompactPower(g.top1_power)}</div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

        </div>
      </div>
    `;

  } catch (error) {
    console.error(error);
    document.querySelector("main").innerHTML = `
      <div class="container" style="padding-top:40px;">
        <div class="error-box">데이터를 불러오지 못했습니다: ${escapeHtml(error?.message || "오류")}</div>
      </div>
    `;
  }
});