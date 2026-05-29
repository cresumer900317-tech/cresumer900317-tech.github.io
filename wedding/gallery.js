/* 박기백·박지은 — 웨딩 갤러리 (관리자 전용).
   URL ?key=<token> 검증, 그리드 + 다운로드 + 삭제 + lightbox + 슬라이드쇼.
   사진/동영상 모두 지원. (업로더 이름은 더 이상 받지 않음) */

(function () {
  "use strict";

  const API_BASE = "https://guild-backend-production-75a6.up.railway.app";
  const VIDEO_RE = /\.(mp4|mov|webm|m4v|3gp)(\?|#|$)/i;
  function isVideo(p) { return VIDEO_RE.test(p.public_url || p.filename || ""); }

  const params = new URLSearchParams(location.search);
  const KEY = (params.get("key") || "").trim();

  const $gate = document.getElementById("gate");
  const $app = document.getElementById("app");
  const $loading = document.getElementById("loading");
  const $grid = document.getElementById("grid");
  const $empty = document.getElementById("empty");
  const $total = document.getElementById("totalCount");
  const $zipBtn = document.getElementById("zipBtn");
  const $slideBtn = document.getElementById("slideBtn");

  // Lightbox
  const $lb = document.getElementById("lightbox");
  const $lbStage = document.getElementById("lbStage");
  const $lbCap = document.getElementById("lbCap");
  const $lbClose = document.getElementById("lbClose");
  const $lbPrev = document.getElementById("lbPrev");
  const $lbNext = document.getElementById("lbNext");

  // Slideshow
  const $ss = document.getElementById("slideshow");
  const $ssStage = document.getElementById("ssStage");
  const $ssCaption = document.getElementById("ssCaption");
  const $ssClose = document.getElementById("ssClose");

  let photos = [];
  let lbIdx = 0;

  if (!KEY) { $gate.hidden = false; return; }
  $app.hidden = false;

  // ── 로딩 ───────────────────────────────────
  async function load(silent) {
    if (!silent) $loading.hidden = false;
    try {
      const res = await fetch(`${API_BASE}/api/wedding/list?key=${encodeURIComponent(KEY)}`);
      if (res.status === 403) { $app.hidden = true; $gate.hidden = false; return; }
      if (!res.ok) throw new Error("불러오기 실패 " + res.status);
      const data = await res.json();
      photos = data.photos || [];
      $total.textContent = String(data.total || photos.length);
      render();
    } catch (e) {
      console.error(e);
      if (!silent) $grid.querySelectorAll(".wg-grid").forEach(n => n.remove());
    } finally {
      $loading.hidden = true;
    }
  }

  // 최신순 (시간 내림차순)
  function sorted() {
    return photos.slice().sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }

  function fmtTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    })[c]);
  }

  // ── 렌더 ───────────────────────────────────
  function render() {
    const list = sorted();
    $empty.hidden = list.length > 0;

    const old = $grid.querySelector(".wg-grid");
    if (old) old.remove();
    if (!list.length) return;

    const grid = document.createElement("div");
    grid.className = "wg-grid";

    list.forEach((p, idx) => {
      const card = document.createElement("article");
      card.className = "wg-card";
      const time = fmtTime(p.created_at);
      const media = isVideo(p)
        ? `<video src="${escapeHtml(p.public_url)}#t=0.1" muted playsinline preload="metadata"></video><span class="wg-play">▶</span>`
        : `<img loading="lazy" src="${escapeHtml(p.public_url)}" alt="결혼식 사진" />`;

      card.innerHTML = `
        <div class="wg-card-img" data-idx="${idx}">${media}</div>
        <div class="wg-card-meta">
          <span class="wg-card-time">${time}</span>
          <div class="wg-card-actions">
            <a href="${escapeHtml(p.public_url)}" download="${escapeHtml(p.filename || '')}" target="_blank" rel="noopener" title="다운로드">⬇</a>
            <button class="wg-card-del" type="button" title="삭제">🗑</button>
          </div>
        </div>
      `;
      card.querySelector(".wg-card-img").addEventListener("click", () => openLb(idx));
      card.querySelector(".wg-card-del").addEventListener("click", () => onDelete(p.id));
      grid.appendChild(card);
    });

    $grid.appendChild(grid);
  }

  // ── 삭제 ───────────────────────────────────
  async function onDelete(id) {
    if (!confirm("이 사진을 삭제하시겠습니까?\n복구 불가능합니다.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/wedding/${id}?key=${encodeURIComponent(KEY)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패 " + res.status);
      photos = photos.filter(p => p.id !== id);
      $total.textContent = String(photos.length);
      render();
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  }

  // ── ZIP ────────────────────────────────────
  $zipBtn.addEventListener("click", () => {
    if (!photos.length) { alert("아직 사진이 없습니다"); return; }
    window.location.href = `${API_BASE}/api/wedding/zip?key=${encodeURIComponent(KEY)}`;
  });

  // ── Lightbox ──────────────────────────────
  function renderLb() {
    const list = sorted();
    const p = list[lbIdx];
    if (!p) return;
    $lbStage.innerHTML = isVideo(p)
      ? `<video src="${escapeHtml(p.public_url)}" controls autoplay playsinline></video>`
      : `<img src="${escapeHtml(p.public_url)}" alt="" />`;
    $lbCap.textContent = fmtTime(p.created_at);
  }
  function openLb(idx) {
    const list = sorted();
    if (!list.length) return;
    lbIdx = ((idx % list.length) + list.length) % list.length;
    renderLb();
    $lb.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLb() {
    $lb.hidden = true;
    $lbStage.innerHTML = "";
    document.body.style.overflow = "";
  }
  function lbStep(d) {
    const list = sorted();
    if (!list.length) return;
    lbIdx = (lbIdx + d + list.length) % list.length;
    renderLb();
  }
  $lbClose.addEventListener("click", closeLb);
  $lbPrev.addEventListener("click", e => { e.stopPropagation(); lbStep(-1); });
  $lbNext.addEventListener("click", e => { e.stopPropagation(); lbStep(1); });
  $lb.addEventListener("click", e => { if (e.target === $lb) closeLb(); });
  // 라이트박스 스와이프
  let lbTouchX = null;
  $lbStage.addEventListener("touchstart", e => { lbTouchX = e.touches[0].clientX; }, { passive: true });
  $lbStage.addEventListener("touchend", e => {
    if (lbTouchX === null) return;
    const dx = e.changedTouches[0].clientX - lbTouchX;
    if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1);
    lbTouchX = null;
  }, { passive: true });

  // ── 슬라이드쇼 (식장 스크린용) ───────────────
  let ssTimer = null, ssRefresh = null, ssIdx = 0;

  function ssImages() { return sorted().filter(p => !isVideo(p)).reverse(); } // 오래된→최신 순서로 흐름

  function ssShow() {
    const imgs = ssImages();
    if (!imgs.length) return;
    const p = imgs[ssIdx % imgs.length];
    const img = document.createElement("img");
    img.src = p.public_url;
    img.className = "wg-ss-img";
    $ssStage.innerHTML = "";
    $ssStage.appendChild(img);
    $ssCaption.textContent = fmtTime(p.created_at);
  }
  function startSlideshow() {
    if (!ssImages().length) { alert("슬라이드쇼로 보여줄 사진이 아직 없어요."); return; }
    ssIdx = 0;
    $ss.hidden = false;
    document.body.style.overflow = "hidden";
    ssShow();
    if ($ss.requestFullscreen) $ss.requestFullscreen().catch(() => {});
    ssTimer = setInterval(() => {
      const imgs = ssImages();
      if (!imgs.length) return;
      ssIdx = (ssIdx + 1) % imgs.length;
      ssShow();
    }, 4500);
    // 새로 올라오는 사진을 슬라이드쇼에 반영
    ssRefresh = setInterval(() => load(true), 20000);
  }
  function stopSlideshow() {
    $ss.hidden = true;
    $ssStage.innerHTML = "";
    document.body.style.overflow = "";
    if (ssTimer) { clearInterval(ssTimer); ssTimer = null; }
    if (ssRefresh) { clearInterval(ssRefresh); ssRefresh = null; }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  $slideBtn.addEventListener("click", startSlideshow);
  $ssClose.addEventListener("click", stopSlideshow);

  // ── 키보드 ─────────────────────────────────
  document.addEventListener("keydown", e => {
    if (!$ss.hidden) { if (e.key === "Escape") stopSlideshow(); return; }
    if ($lb.hidden) return;
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowLeft") lbStep(-1);
    else if (e.key === "ArrowRight") lbStep(1);
  });

  load();
})();
