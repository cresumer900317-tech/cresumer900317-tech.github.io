document.addEventListener("DOMContentLoaded", async () => {
  renderShell();
  const main = document.querySelector("main");
  main.innerHTML = `<div class="page-card"><div class="container"><div class="loading-box">불러오는 중…</div></div></div>`;

  async function loadRanking() {
    try {
      const r = await fetch(`${API_BASE}/api/points/ranking?limit=100`, { cache: "no-store" });
      return r.ok ? await r.json() : [];
    } catch { return []; }
  }
  async function loadMe() {
    if (!getUser()) return null;
    try {
      const r = await fetch(`${API_BASE}/api/points/me`, { headers: authHeaders(), cache: "no-store" });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }

  function myCardHtml(me) {
    const user = getUser();
    if (!user) {
      return `
        <div class="pt-card pt-login">
          <div class="pt-login-text">로그인하면 <b>매일 출석</b>으로 포인트를 모을 수 있어요 🔥</div>
          <a class="cta-btn" href="./login?redirect=./points">로그인하기</a>
        </div>`;
    }
    const checked = me && me.checkedToday;
    return `
      <div class="pt-card">
        <div class="pt-my-head">
          <div class="pt-my-avatar">${characterAvatarHtml({ name: user.character_name, guild: user.guild })}</div>
          <div>
            <div class="pt-my-name">${escapeHtml(user.character_name)}</div>
            <div>${guildBadgeHtml(user.guild || "길드 없음")}</div>
          </div>
        </div>
        <div class="pt-my-stats">
          <div class="pt-stat"><span>내 포인트</span><b>${formatNumber((me && me.total) || 0)}P</b></div>
          <div class="pt-stat"><span>연속 출석</span><b>${(me && me.streak) || 0}일 🔥</b></div>
        </div>
        <button id="checkinBtn" class="pt-checkin-btn${checked ? " done" : ""}" ${checked ? "disabled" : ""}>
          ${checked ? "오늘 출석 완료 ✓" : "📅 오늘 출석 체크하기"}
        </button>
        <div id="checkinMsg" class="pt-checkin-msg"></div>
      </div>`;
  }

  function rankingHtml(rows) {
    if (!rows.length) return createEmptyBox("아직 포인트 기록이 없어요. 첫 출석의 주인공이 되어보세요!");
    return `<div class="rk-list">` + rows.map(r => {
      const top3 = r.rank <= 3;
      const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank;
      return `
        <div class="rk-compact-card${top3 ? " rk-top3-card" : ""}">
          <div class="rk-c-rank"><span class="${top3 ? "rk-c-medal" : "rk-c-num"}">${medal}</span></div>
          <div class="rk-c-avatar">${characterAvatarHtml({ name: r.characterName, guild: r.guild })}</div>
          <div class="rk-c-info">
            <div class="rk-c-name">${escapeHtml(r.characterName || "-")}</div>
            <div class="rk-c-sub">${guildBadgeHtml(r.guild || "길드 없음")} <span class="rk-c-job">연속 ${r.streak || 0}일 🔥</span></div>
          </div>
          <div class="rk-c-right">
            <div class="rk-c-power"><span style="color:#f59e0b;font-weight:900;">${formatNumber(r.total)}P</span></div>
          </div>
        </div>`;
    }).join("") + `</div>`;
  }

  function render(me, rows) {
    main.innerHTML = `
      <style>
        .pt-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:6px 0 16px;box-shadow:0 4px 14px rgba(0,0,0,0.05);}
        .pt-login{text-align:center;}
        .pt-login-text{font-size:0.95rem;color:#4a5568;margin-bottom:14px;}
        .pt-my-head{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
        .pt-my-avatar{width:48px;height:48px;flex-shrink:0;}
        .pt-my-avatar .character-avatar{width:48px;height:48px;}
        .pt-my-name{font-size:1.05rem;font-weight:800;color:#1a202c;margin-bottom:4px;}
        .pt-my-stats{display:flex;gap:12px;margin-bottom:14px;}
        .pt-stat{flex:1;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px;text-align:center;}
        .pt-stat span{display:block;font-size:0.74rem;color:#92400e;margin-bottom:4px;}
        .pt-stat b{font-size:1.3rem;font-weight:900;color:#b45309;}
        .pt-checkin-btn{width:100%;padding:14px;border:none;border-radius:12px;background:#f59e0b;color:#fff;font-size:1rem;font-weight:800;cursor:pointer;transition:background .15s;}
        .pt-checkin-btn:hover:not(:disabled){background:#d97706;}
        .pt-checkin-btn.done{background:#e2e8f0;color:#718096;cursor:default;}
        .pt-checkin-msg{text-align:center;font-size:0.9rem;font-weight:700;color:#16a34a;margin-top:10px;min-height:20px;}
        .pt-guide{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px;}
        .pt-guide span{font-size:0.78rem;background:#f7fafc;border:1px solid #e2e8f0;border-radius:999px;padding:5px 12px;color:#4a5568;font-weight:600;}
      </style>
      <div class="page-card">
        <div class="container">
          <h1 class="rk-page-title">포인트 랭킹</h1>
          <div class="rk-meta">매일 출석·연속 보너스·게시판 활동으로 적립 · 누적 포인트 순위</div>
          ${myCardHtml(me)}
          <div class="pt-guide">
            <span>📅 출석 +10</span><span>🔥 연속 보너스 최대 +20</span><span>🎉 7일마다 +50</span><span>✏️ 자유글 +5</span><span>💡 팁 +10</span>
          </div>
          ${rankingHtml(rows)}
        </div>
      </div>
      <footer class="site-footer">
        <div class="container footer-inner">
          <div class="footer-brand">메이플키우기 라운지 · 스카니아11 서버</div>
          <div class="footer-copy">&copy; ${new Date().getFullYear()} 메이플키우기 라운지 · 운영 친구패밀리. All rights reserved.</div>
        </div>
      </footer>`;
    bindCheckin();
  }

  function bindCheckin() {
    const btn = document.getElementById("checkinBtn");
    if (!btn || btn.disabled) return;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "출석 중…";
      const msg = document.getElementById("checkinMsg");
      try {
        const r = await fetch(`${API_BASE}/api/points/checkin`, { method: "POST", headers: authHeaders() });
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "출석 실패");
        if (d.alreadyChecked) {
          msg.textContent = "오늘은 이미 출석했어요 ✓";
        } else {
          let t = `+${d.awarded}P 획득! (기본 ${d.base} + 연속 ${d.streakBonus}`;
          if (d.milestone) t += ` + ${d.streak}일 보너스 ${d.milestone}`;
          t += ")";
          msg.textContent = t;
        }
        const [me2, rows2] = await Promise.all([loadMe(), loadRanking()]);
        render(me2, rows2);
        // 메시지 유지 — 갱신 후 다시 표시
        const msg2 = document.getElementById("checkinMsg");
        if (msg2 && !d.alreadyChecked) msg2.textContent = `오늘 +${d.awarded}P 적립 완료!`;
      } catch (e) {
        btn.disabled = false;
        btn.textContent = "📅 오늘 출석 체크하기";
        if (msg) { msg.style.color = "#dc2626"; msg.textContent = e.message || "출석 실패"; }
      }
    });
  }

  try {
    const [me, rows] = await Promise.all([loadMe(), loadRanking()]);
    render(me, rows);
  } catch (e) {
    renderError(null, e);
  }
});
