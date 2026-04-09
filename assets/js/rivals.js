document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  try {
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

    // 추가 계산
    guilds.forEach(g => {
      const members = g.members || [];
      g.avg_power = members.length ? Math.round(members.reduce((s,m) => s + (m.power||0), 0) / members.length) : 0;
    });

    // 성장 승자
    function getWinner(key, higher = true) {
      const valid = guilds.filter(g => g[key] > 0);
      if (!valid.length) return null;
      return higher
        ? valid.reduce((a, b) => (a[key] > b[key] ? a : b))
        : valid.reduce((a, b) => (a[key] < b[key] ? a : b));
    }
    const growthWinner = getWinner("monthly_growth");

    const updateTime = guilds[0]?.captured_at
      ? new Date(guilds[0].captured_at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "-";

    const STAT_ITEMS = [
      { label: "⚔️ 합산 전투력", key: "total_power",     fmt: v => formatCompactPower(v), higher: true },
      { label: "📈 이달 성장",   key: "monthly_growth",  fmt: v => v ? `+${formatCompactPower(v)}` : "-", higher: true, skipNull: true },
      { label: "⭐ 평균 레벨",   key: "avg_level",        fmt: v => `Lv ${v}`, higher: true },
      { label: "🗺️ 서버 순위",  key: "server_rank",      fmt: v => v ? `${formatNumber(v)}위` : "-", higher: false },
      { label: "📊 성장률",      key: "growth_rate",      fmt: v => v ? `${v}%` : "-", higher: true, skipNull: true },
      { label: "❤️ 인기도",     key: "total_popularity", fmt: v => v ? formatNumber(v) : "-", higher: true, skipNull: true },
    ];

    const maxPower = Math.max(...guilds.map(g => g.total_power||0));

    document.querySelector("main").innerHTML = battlePageHtml({
      guilds,
      themeFn: theme,
      statItems: STAT_ITEMS,
      winner: growthWinner,
      growthWinnerName: growthWinner?.guild_name || null,
      ourGuild: "친구들",
      title: "⚔️ 길드 라이벌전",
      subtitle: "친구들 vs 싸이월드 vs 리안 · 스카니아 11서버 3파전",
      dateLabel: updateTime,
      maxPower,
    });

  } catch (error) {
    console.error(error);
    renderError(null, error);
  }
});
