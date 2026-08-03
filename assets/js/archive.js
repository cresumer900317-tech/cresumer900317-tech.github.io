// 지난 시즌 아카이브 — /api/content-archive
const AR_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
const AR_BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';

document.addEventListener("DOMContentLoaded", async () => {
  renderShell();  // 공용 프리미엄 헤더 (검색·길드 드롭다운·모바일 패널 포함)

  const main = document.querySelector("main");
  main.innerHTML = `<div class="container" style="padding-top:30px"><div class="sk sk-title"></div><div class="sk sk-card" style="margin-top:16px"></div></div>`;

  let data = [];
  try {
    const res = await fetch(`${API_BASE}/api/content-archive`, { cache: "no-store" });
    data = res.ok ? await res.json() : [];
  } catch (e) { data = []; }
  data = Array.isArray(data) ? data : [];

  const fmt = (n) => Number(n || 0).toLocaleString("ko-KR");
  const period = (a) => {
    if (!a.startsAt && !a.endsAt) return "";
    const d = (s) => { const x = new Date(s + "T00:00:00"); return `${x.getFullYear()}.${x.getMonth() + 1}.${x.getDate()}`; };
    return `${a.startsAt ? d(a.startsAt) : ""}${a.endsAt ? " ~ " + d(a.endsAt) : ""}`;
  };

  main.innerHTML = `
    <section class="section" style="padding-top:28px">
      <div class="container">
        <a class="section-link" href="./" style="margin-bottom:14px">${AR_BACK} 홈으로</a>
        <div class="section-head" style="margin-top:6px">
          <div>
            <span class="section-eyebrow">GUILD ACTIVITY</span>
            <div class="section-title">지난 시즌 아카이브</div>
            <div class="section-sub">종료된 시즌 컨텐츠의 최종 기록</div>
          </div>
        </div>
        ${data.length ? `<div class="content-grid">${data.map(a => `
          <div class="content-card">
            <div class="cc-top"><span class="cc-name">${escapeHtml(a.icon ? a.icon + " " : "")}${escapeHtml(a.name || "")}</span><span class="cc-badge">종료</span></div>
            <div class="cc-score"><b>${fmt(a.finalScore)}</b><span class="unit">점${a.roundLabel ? ` · ${escapeHtml(a.roundLabel)}` : ""}</span></div>
            <div class="cc-meta">최고 ${fmt(a.best)}${a.count ? ` · ${a.count}회 기록` : ""}</div>
            <div class="cc-foot"><span>${a.participants ? `참여 ${a.participants}명` : "&nbsp;"}</span><span class="go" style="font-variant-numeric:tabular-nums">${period(a)}</span></div>
          </div>`).join("")}</div>`
        : `<div class="panel" style="padding:44px;text-align:center;color:var(--ink-faint);font-size:0.9rem">아직 종료된 시즌 기록이 없어요.</div>`}
      </div>
    </section>

    <footer class="footer"><div class="container footer-inner">
      <div class="footer-brand">메이플키우기 라운지 · 스카니아11 서버</div>
      <div class="footer-links"><a href="./">홈</a><a href="./ranking">서버 랭킹</a><a href="./level-calc">계산기</a></div>
      <div class="footer-copy">© ${new Date().getFullYear()} 메이플키우기 라운지 · 운영 친구패밀리.</div>
    </div></footer>`;
});
