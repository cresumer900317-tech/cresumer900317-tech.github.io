document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
    // 멤버 + 월간성장 데이터 병렬 로드
    const [membersRes, monthlyRes] = await Promise.all([
      fetch(`${API_BASE}/api/members`, { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/monthly`, { cache: "no-store" }).then(r => r.ok ? r.json() : []),
    ]);

    const allMembers = Array.isArray(membersRes) ? membersRes : [];
    const monthlyRows = Array.isArray(monthlyRes) ? monthlyRes : [];

    const CIVIL_GUILDS = ["친구둘", "친구삼", "친구넷"];

    const THEMES = {
      "친구둘": { color: "#3b82f6", light: "#eff6ff", border: "#bfdbfe", dark: "#1d4ed8", emoji: "⚔️", tag: "내전 참가" },
      "친구삼": { color: "#22c55e", light: "#f0fdf4", border: "#bbf7d0", dark: "#15803d", emoji: "🛡️", tag: "내전 참가" },
      "친구넷": { color: "#a855f7", light: "#faf5ff", border: "#ddd6fe", dark: "#7e22ce", emoji: "🔥", tag: "내전 참가" },
    };
    function theme(name) {
      return THEMES[name] || { color: "#6b7280", light: "#f9fafb", border: "#e5e7eb", dark: "#374151", emoji: "🏰", tag: "" };
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

    // 성장 승자
    const withGrowth = guilds.filter(g => g.monthly_growth !== null && g.monthly_growth > 0);
    const growthWinner = withGrowth.length
      ? withGrowth.reduce((a, b) => a.monthly_growth > b.monthly_growth ? a : b)
      : null;

    const maxPower = Math.max(...guilds.map(g => g.total_power));
    const updateTime = new Date().toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

    const STAT_ITEMS = [
      { label: "⚔️ 합산 전투력", key: "total_power",      fmt: v => formatCompactPower(v), higher: true },
      { label: "📈 이달 성장",   key: "monthly_growth",   fmt: v => v ? `+${formatCompactPower(v)}` : "-", higher: true, skipNull: true },
      { label: "⭐ 평균 레벨",   key: "avg_level",         fmt: v => `Lv ${v}`, higher: true },
      { label: "📊 성장률",      key: "growth_rate",       fmt: v => v ? `${v}%` : "-", higher: true, skipNull: true },
      { label: "❤️ 인기도",     key: "total_popularity",  fmt: v => v ? formatNumber(v) : "-", higher: true, skipNull: true },
    ];

    document.querySelector("main").innerHTML = battlePageHtml({
      guilds,
      themeFn: theme,
      statItems: STAT_ITEMS,
      winner: growthWinner,
      growthWinnerName: growthWinner?.guild_name || null,
      ourGuild: null,
      title: "⚔️ 길드 내전",
      subtitle: "친구둘 vs 친구삼 vs 친구넷 · 내부 리그 3파전",
      dateLabel: updateTime,
      maxPower,
    });

  } catch (error) {
    console.error(error);
    renderError(null, error);
  }
});
