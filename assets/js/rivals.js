document.addEventListener("DOMContentLoaded", async () => {
  renderShell();
  const main = document.querySelector("main");
  const FRIENDS = new Set(["친구들", "친구둘", "친구삼", "친구넷", "친구닷"]);

  function shell(inner) {
    main.innerHTML = `
      <style>
        .rv-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 4px 12px rgba(0,0,0,0.04);}
        .rv-add{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0 18px;}
        .rv-add select{flex:1;min-width:160px;padding:10px 12px;border:1px solid #cbd5e0;border-radius:10px;font-size:0.95rem;background:#fff;}
        .rv-add button{padding:10px 18px;border:none;border-radius:10px;background:#3182ce;color:#fff;font-weight:800;font-size:0.92rem;cursor:pointer;}
        .rv-add button:disabled{background:#cbd5e0;cursor:default;}
        .rv-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
        .rv-vs-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-bottom:10px;}
        .rv-side{display:flex;flex-direction:column;align-items:center;gap:4px;}
        .rv-side .character-avatar{width:52px;height:52px;}
        .rv-name{font-weight:800;font-size:0.92rem;color:#1a202c;text-align:center;}
        .rv-vs{font-weight:900;color:#a0aec0;font-size:0.9rem;}
        .rv-metric{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:9px 6px;border-top:1px solid #f1f5f9;}
        .rv-mv{font-weight:800;font-size:0.9rem;text-align:center;color:#4a5568;}
        .rv-mv.win{color:#2563eb;}
        .rv-mv.lose{color:#a0aec0;}
        .rv-mlabel{font-size:0.72rem;color:#94a3b8;text-align:center;white-space:nowrap;}
        .rv-summary{margin-top:10px;font-size:0.85rem;font-weight:700;text-align:center;padding:8px;border-radius:10px;background:#f8fafc;}
        .rv-del{margin-left:auto;background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:5px 12px;font-size:0.78rem;font-weight:700;cursor:pointer;}
        .rv-empty{text-align:center;color:#94a3b8;padding:24px;font-size:0.9rem;}
      </style>
      <div class="page-card"><div class="container">
        <h1 class="rk-page-title">라이벌 비교</h1>
        <div class="rk-meta">친구패밀리 멤버를 라이벌로 등록하고 나와 1:1로 비교해보세요 (최대 5명)</div>
        ${inner}
      </div></div>
      <footer class="site-footer"><div class="container footer-inner">
        <div class="footer-brand">메이플키우기 라운지 · 스카니아11 서버</div>
        <div class="footer-copy">&copy; ${new Date().getFullYear()} 메이플키우기 라운지 · 운영 친구패밀리. All rights reserved.</div>
      </div></footer>`;
  }

  const user = getUser();
  if (!user) {
    shell(`<div class="rv-card" style="text-align:center;">
        <div style="font-size:0.95rem;color:#4a5568;margin-bottom:14px;">로그인하면 라이벌을 등록하고 비교할 수 있어요</div>
        <a class="cta-btn" href="./login?redirect=./rivals">로그인하기</a>
      </div>`);
    return;
  }

  shell(`<div class="loading-box">불러오는 중…</div>`);

  let members = [];
  let me = null;
  let rivals = [];

  async function loadAll() {
    const [memRes, rivRes] = await Promise.all([
      fetch(`${API_BASE}/api/ranking`, { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/rival-picks`, { headers: authHeaders(), cache: "no-store" }).then(r => r.ok ? r.json() : []),
    ]);
    members = Array.isArray(memRes) ? memRes : [];
    rivals = Array.isArray(rivRes) ? rivRes : [];
    me = members.find(m => m.name === user.character_name) || null;
  }

  const byName = (n) => members.find(m => m.name === n);

  // 한 지표 비교 행 (높을수록 좋음: higher=true / 낮을수록 좋음: higher=false)
  function metric(label, myVal, rivVal, fmt, higher = true) {
    const a = Number(myVal || 0), b = Number(rivVal || 0);
    let myCls = "", rvCls = "";
    if (a !== b) {
      const meWins = higher ? a > b : a < b;
      myCls = meWins ? "win" : "lose";
      rvCls = meWins ? "lose" : "win";
    }
    return `<div class="rv-metric">
      <div class="rv-mv ${myCls}">${fmt(myVal)}</div>
      <div class="rv-mlabel">${label}</div>
      <div class="rv-mv ${rvCls}">${fmt(rivVal)}</div>
    </div>`;
  }

  const fmtPower = (v) => formatCompactPower(v);
  const fmtRank = (v) => v ? formatNumber(v) + "위" : "-";
  const fmtNum = (v) => formatNumber(Number(v || 0));
  const fmtGrowth = (v) => { const n = Number(v || 0); return n > 0 ? "+" + formatCompactPower(n) : n < 0 ? "-" + formatCompactPower(Math.abs(n)) : "-"; };

  function compareCard(rivalName) {
    const r = byName(rivalName);
    const head = `<div class="rv-head">
        <strong style="font-size:0.95rem;">⚔️ vs ${escapeHtml(rivalName)}</strong>
        <button class="rv-del" data-del="${escapeHtml(rivalName)}">삭제</button>
      </div>`;
    if (!r || !me) {
      return `<div class="rv-card">${head}<div class="rv-empty">${escapeHtml(rivalName)} 데이터를 찾을 수 없어요 (크롤링 전이거나 길드 이탈)</div></div>`;
    }
    const powerGap = Number(me.power || 0) - Number(r.power || 0);
    const summary = powerGap === 0
      ? "전투력 동률!"
      : powerGap > 0
        ? `전투력 <span style="color:#2563eb;">${formatCompactPower(powerGap)} 앞서요</span> 🔥`
        : `전투력 <span style="color:#dc2626;">${formatCompactPower(Math.abs(powerGap))} 뒤처져요</span> 💪`;
    return `<div class="rv-card">
      ${head}
      <div class="rv-vs-row">
        <div class="rv-side">${characterAvatarHtml({ name: me.name, guild: me.guild })}<div class="rv-name">${escapeHtml(me.name)} (나)</div></div>
        <div class="rv-vs">VS</div>
        <div class="rv-side">${characterAvatarHtml({ name: r.name, guild: r.guild })}<div class="rv-name">${escapeHtml(r.name)}</div></div>
      </div>
      ${metric("전투력", me.power, r.power, fmtPower, true)}
      ${metric("서버순위", me.serverRank, r.serverRank, fmtRank, false)}
      ${metric("주간성장", me.weeklyDiff, r.weeklyDiff, fmtGrowth, true)}
      ${metric("인기도", me.popularity, r.popularity, fmtNum, true)}
      <div class="rv-summary">${summary}</div>
    </div>`;
  }

  function addBarHtml() {
    const taken = new Set([user.character_name, ...rivals]);
    const opts = members
      .filter(m => FRIENDS.has(m.guild) && !taken.has(m.name))
      .sort((a, b) => Number(b.power || 0) - Number(a.power || 0))
      .map(m => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)} · ${escapeHtml(m.guild)}</option>`)
      .join("");
    const full = rivals.length >= 5;
    return `<div class="rv-add">
      <select id="rivalSelect" ${full ? "disabled" : ""}>
        <option value="">${full ? "라이벌 5명 가득 참" : "라이벌로 추가할 멤버 선택…"}</option>
        ${opts}
      </select>
      <button id="rivalAddBtn" ${full ? "disabled" : ""}>+ 추가</button>
    </div>`;
  }

  function render() {
    if (!me) {
      shell(`<div class="rv-card rv-empty">내 캐릭터(${escapeHtml(user.character_name)}) 데이터를 찾을 수 없어요. 크롤링 후 다시 확인해주세요.</div>`);
      return;
    }
    const cards = rivals.length
      ? rivals.map(compareCard).join("")
      : `<div class="rv-card rv-empty">아직 등록한 라이벌이 없어요.<br>위에서 멤버를 골라 추가해보세요!</div>`;
    shell(addBarHtml() + cards);
    bindEvents();
  }

  function bindEvents() {
    const addBtn = document.getElementById("rivalAddBtn");
    if (addBtn) addBtn.addEventListener("click", async () => {
      const sel = document.getElementById("rivalSelect");
      const name = sel ? sel.value : "";
      if (!name) return;
      addBtn.disabled = true; addBtn.textContent = "추가 중…";
      try {
        const res = await fetch(`${API_BASE}/api/rival-picks`, {
          method: "POST", headers: authHeaders(), body: JSON.stringify({ rival_name: name }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.detail || "추가 실패");
        rivals.push(name);
        render();
      } catch (e) { addBtn.disabled = false; addBtn.textContent = "+ 추가"; alert(e.message || "추가 실패"); }
    });
    document.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const name = btn.getAttribute("data-del");
        if (!confirm(`${name}을(를) 라이벌에서 삭제할까요?`)) return;
        try {
          const res = await fetch(`${API_BASE}/api/rival-picks/${encodeURIComponent(name)}`, {
            method: "DELETE", headers: authHeaders(),
          });
          if (!res.ok) throw new Error("삭제 실패");
          rivals = rivals.filter(n => n !== name);
          render();
        } catch (e) { alert(e.message || "삭제 실패"); }
      });
    });
  }

  try {
    await loadAll();
    render();
  } catch (e) {
    renderError(null, e);
  }
});
