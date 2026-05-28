/* 박기백·박지은 — 웨딩 갤러리 (관리자 전용).
   URL ?key=<token> 검증, 그리드 + 다운로드 + 삭제 + lightbox. */

(function () {
  "use strict";

  const API_BASE = "https://guild-backend-production-75a6.up.railway.app";

  // URL key
  const params = new URLSearchParams(location.search);
  const KEY = (params.get("key") || "").trim();

  const $gate = document.getElementById("gate");
  const $app = document.getElementById("app");
  const $loading = document.getElementById("loading");
  const $grid = document.getElementById("grid");
  const $empty = document.getElementById("empty");
  const $total = document.getElementById("totalCount");
  const $zipBtn = document.getElementById("zipBtn");
  const $sortBtns = document.querySelectorAll(".wg-sort-btn");

  // Lightbox
  const $lb = document.getElementById("lightbox");
  const $lbImg = document.getElementById("lbImg");
  const $lbCap = document.getElementById("lbCap");
  const $lbClose = document.getElementById("lbClose");
  const $lbPrev = document.getElementById("lbPrev");
  const $lbNext = document.getElementById("lbNext");

  let photos = [];
  let sortBy = "time"; // 'time' | 'name'
  let lbIdx = 0;

  // 토큰 없으면 즉시 게이트
  if (!KEY) {
    $gate.hidden = false;
    return;
  }

  $app.hidden = false;

  // ── 로딩 ───────────────────────────────────
  async function load() {
    $loading.hidden = false;
    try {
      const res = await fetch(`${API_BASE}/api/wedding/list?key=${encodeURIComponent(KEY)}`);
      if (res.status === 403) {
        $app.hidden = true;
        $gate.hidden = false;
        return;
      }
      if (!res.ok) throw new Error("불러오기 실패 " + res.status);
      const data = await res.json();
      photos = data.photos || [];
      $total.textContent = String(data.total || photos.length);
      render();
    } catch (e) {
      console.error(e);
      $grid.innerHTML = `<p style="text-align:center;color:#c44;padding:40px">불러오기에 실패했습니다.<br/>${e.message}</p>`;
    } finally {
      $loading.hidden = true;
    }
  }

  // ── 렌더 ───────────────────────────────────
  function sorted() {
    const copy = photos.slice();
    if (sortBy === "name") {
      copy.sort((a, b) => {
        const an = (a.uploader_name || "").trim() || "~";
        const bn = (b.uploader_name || "").trim() || "~";
        return an.localeCompare(bn, "ko");
      });
    } else {
      copy.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    }
    return copy;
  }

  function fmtTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function render() {
    const list = sorted();
    $empty.hidden = list.length > 0;

    // 갤러리 그리드만 청소 (empty 보존)
    const old = $grid.querySelector(".wg-grid");
    if (old) old.remove();

    if (!list.length) return;

    const grid = document.createElement("div");
    grid.className = "wg-grid";

    list.forEach((p, idx) => {
      const card = document.createElement("article");
      card.className = "wg-card";

      const uploader = (p.uploader_name || "").trim() || "익명";
      const time = fmtTime(p.created_at);

      card.innerHTML = `
        <div class="wg-card-img" data-idx="${idx}">
          <img loading="lazy" src="${p.public_url}" alt="${escapeHtml(uploader)} 사진" />
        </div>
        <div class="wg-card-meta">
          <div class="wg-card-info">
            <span class="wg-card-uploader">${escapeHtml(uploader)}</span>
            <span class="wg-card-time">${time}</span>
          </div>
          <div class="wg-card-actions">
            <a href="${p.public_url}" download="${p.filename || ''}" target="_blank" rel="noopener" title="다운로드">⬇</a>
            <button class="wg-card-del" type="button" data-id="${p.id}" title="삭제">🗑</button>
          </div>
        </div>
      `;

      card.querySelector(".wg-card-img").addEventListener("click", () => openLb(idx));
      card.querySelector(".wg-card-del").addEventListener("click", () => onDelete(p.id, p.uploader_name));

      grid.appendChild(card);
    });

    $grid.appendChild(grid);
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    })[c]);
  }

  // ── 삭제 ───────────────────────────────────
  async function onDelete(id, name) {
    const who = (name || "").trim() || "익명";
    if (!confirm(`${who} 님의 사진을 삭제하시겠습니까?\n복구 불가능합니다.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/wedding/${id}?key=${encodeURIComponent(KEY)}`, {
        method: "DELETE",
      });
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
    if (!photos.length) {
      alert("아직 사진이 없습니다");
      return;
    }
    const url = `${API_BASE}/api/wedding/zip?key=${encodeURIComponent(KEY)}`;
    // ZIP 은 잠깐 시간 걸릴 수 있음 — 새 탭으로 열어 둠
    window.location.href = url;
  });

  // ── 정렬 ───────────────────────────────────
  $sortBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.sort;
      if (next === sortBy) return;
      sortBy = next;
      $sortBtns.forEach(b => b.classList.toggle("is-active", b === btn));
      render();
    });
  });

  // ── Lightbox ──────────────────────────────
  function openLb(idx) {
    const list = sorted();
    if (!list.length) return;
    lbIdx = ((idx % list.length) + list.length) % list.length;
    const p = list[lbIdx];
    $lbImg.src = p.public_url;
    const uploader = (p.uploader_name || "").trim() || "익명";
    $lbCap.textContent = `${uploader} · ${fmtTime(p.created_at)}`;
    $lb.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLb() {
    $lb.hidden = true;
    $lbImg.src = "";
    document.body.style.overflow = "";
  }
  function lbStep(d) {
    const list = sorted();
    if (!list.length) return;
    lbIdx = (lbIdx + d + list.length) % list.length;
    const p = list[lbIdx];
    $lbImg.src = p.public_url;
    const uploader = (p.uploader_name || "").trim() || "익명";
    $lbCap.textContent = `${uploader} · ${fmtTime(p.created_at)}`;
  }

  $lbClose.addEventListener("click", closeLb);
  $lbPrev.addEventListener("click", e => { e.stopPropagation(); lbStep(-1); });
  $lbNext.addEventListener("click", e => { e.stopPropagation(); lbStep(1); });
  $lb.addEventListener("click", e => {
    if (e.target === $lb) closeLb();
  });
  document.addEventListener("keydown", e => {
    if ($lb.hidden) return;
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowLeft") lbStep(-1);
    else if (e.key === "ArrowRight") lbStep(1);
  });

  load();
})();
