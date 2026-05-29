/* 박기백·박지은 결혼식 — 하객 사진·영상 업로드 (v3).
   - 입력 없음(이름/메시지 X) → 업로드 장벽 0
   - 사진: 클라이언트 압축(max 1920px, JPEG q0.85) / 동영상: 원본 업로드
   - 병렬 3개 / 익명 uuid / 꽃잎·라이브 카운터·제작자 모달 */

(function () {
  "use strict";

  const API_BASE = "https://guild-backend-production-75a6.up.railway.app";
  const MAX_DIMENSION = 1920;
  const JPEG_QUALITY = 0.85;
  const MAX_PARALLEL = 3;
  const VIDEO_RE = /^video\//i;
  const VIDEO_EXT_RE = /\.(mp4|mov|webm|m4v|3gp)$/i;
  const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

  function isVideo(file) { return VIDEO_RE.test(file.type) || VIDEO_EXT_RE.test(file.name || ""); }
  function isAccepted(file) {
    return /^image\//i.test(file.type) || isVideo(file) ||
           IMAGE_EXT_RE.test(file.name || "") || VIDEO_EXT_RE.test(file.name || "");
  }
  function getUuid() {
    try {
      let v = localStorage.getItem("wedding_uploader_uuid");
      if (!v) {
        v = (crypto.randomUUID && crypto.randomUUID()) ||
            ("uid-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
        localStorage.setItem("wedding_uploader_uuid", v);
      }
      return v;
    } catch (_) { return "uid-" + Math.random().toString(36).slice(2); }
  }

  const $ = id => document.getElementById(id);
  const $file = $("fileInput");
  const $drop = $("dropZone");
  const $previews = $("previews");
  const $upload = $("uploadBtn");
  const $status = $("status");
  const $progressWrap = $("progressWrap");
  const $progressFill = $("progressFill");
  const $progressText = $("progressText");
  const $uploadCard = $("uploadCard");
  const $doneCard = $("doneCard");
  const $doneTitle = $("doneTitle");
  const $doneRank = $("doneRank");
  const $doneGrid = $("doneGrid");
  const $moreBtn = $("moreBtn");
  const $liveCount = $("liveCount");
  const $liveNum = $("liveNum");

  // ── 꽃잎 ──────────────────────────────────────
  (function initPetals() {
    const layer = $("petals");
    if (!layer || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    const N = 14;
    for (let i = 0; i < N; i++) {
      const p = document.createElement("div");
      p.className = "wp-petal";
      const size = 8 + Math.random() * 10;
      const dur = 9 + Math.random() * 9;
      p.style.left = (Math.random() * 100) + "vw";
      p.style.width = size + "px";
      p.style.height = (size * 0.85) + "px";
      p.style.setProperty("--wp-drift", (Math.random() * 160 - 80) + "px");
      p.style.animationDuration = dur + "s";
      p.style.animationDelay = (-Math.random() * dur) + "s";
      if (i % 3 === 0) p.style.filter = "hue-rotate(-12deg) brightness(1.05)";
      layer.appendChild(p);
    }
  })();

  // ── 라이브 카운터 ─────────────────────────────
  async function fetchCount() {
    try {
      const r = await fetch(`${API_BASE}/api/wedding/count`);
      if (!r.ok) return null;
      return await r.json();
    } catch (_) { return null; }
  }
  fetchCount().then(c => {
    if (c && c.total > 0) {
      $liveNum.textContent = Number(c.total).toLocaleString("ko-KR");
      $liveCount.hidden = false;
    }
  });

  // ── 큐 ────────────────────────────────────────
  const queue = [];

  function refreshUploadBtn() {
    const pending = queue.filter(q => q.status === "idle" || q.status === "fail").length;
    $upload.disabled = pending === 0;
    $upload.querySelector(".wp-btn-label").textContent = pending > 0 ? `${pending}개 올리기` : "우리의 순간 담기";
    $previews.hidden = queue.length === 0;
  }
  function setStatus(msg, isError) {
    if (!msg) { $status.hidden = true; return; }
    $status.hidden = false; $status.textContent = msg;
    $status.classList.toggle("is-error", !!isError);
  }
  function setProgress(done, total) {
    if (!total) { $progressWrap.hidden = true; return; }
    $progressWrap.hidden = false;
    $progressFill.style.width = Math.round((done / total) * 100) + "%";
    $progressText.textContent = `${done} / ${total}`;
  }

  function addFiles(files) {
    const items = Array.from(files || []).filter(isAccepted);
    if (!items.length) return;
    items.forEach(file => {
      const id = "q-" + Math.random().toString(36).slice(2);
      const video = isVideo(file);
      const url = URL.createObjectURL(file);
      const thumb = document.createElement("div");
      thumb.className = "wp-thumb" + (video ? " is-video" : "");
      thumb.dataset.id = id;
      if (video) {
        thumb.innerHTML = `<video muted playsinline preload="metadata"></video><span class="wp-thumb-play" aria-hidden="true">▶</span><button class="wp-thumb-remove" type="button" aria-label="제거">×</button><span class="wp-thumb-status" aria-hidden="true"></span>`;
        thumb.querySelector("video").src = url;
      } else {
        thumb.innerHTML = `<img alt="" /><button class="wp-thumb-remove" type="button" aria-label="제거">×</button><span class="wp-thumb-status" aria-hidden="true"></span>`;
        thumb.querySelector("img").src = url;
      }
      thumb.querySelector(".wp-thumb-remove").addEventListener("click", () => {
        const idx = queue.findIndex(q => q.id === id);
        if (idx >= 0 && queue[idx].status !== "uploading") {
          try { URL.revokeObjectURL(queue[idx].url); } catch (_) {}
          queue.splice(idx, 1); thumb.remove(); refreshUploadBtn();
        }
      });
      $previews.appendChild(thumb);
      queue.push({ id, file, video, url, thumb, status: "idle" });
    });
    refreshUploadBtn();
    setStatus("");
  }

  // ── 압축 (사진만) ─────────────────────────────
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }
  function canvasToBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(b => resolve(b), type, quality));
  }
  async function compressImage(file) {
    let img;
    try { img = await loadImage(file); } catch (_) { return file; }
    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longEdge > MAX_DIMENSION ? MAX_DIMENSION / longEdge : 1;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (!blob) return file;
    if (blob.size >= file.size && /\.jpe?g$/i.test(file.name)) return Object.assign(file, { _w: w, _h: h });
    const compressed = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    compressed._w = w; compressed._h = h;
    return compressed;
  }

  // ── 업로드 ────────────────────────────────────
  async function uploadOne(item) {
    item.status = "uploading";
    item.thumb.classList.add("is-uploading");
    item.thumb.querySelector(".wp-thumb-status").textContent = "…";
    try {
      const payload = item.video ? item.file : await compressImage(item.file);
      const fd = new FormData();
      fd.append("file", payload, payload.name);
      fd.append("uploader_uuid", getUuid());
      if (payload._w) fd.append("width", String(payload._w));
      if (payload._h) fd.append("height", String(payload._h));
      const res = await fetch(`${API_BASE}/api/wedding/upload`, { method: "POST", body: fd });
      if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(`서버 오류 (${res.status}) ${t.slice(0,120)}`); }
      await res.json().catch(() => ({}));
      item.status = "done";
      item.thumb.classList.remove("is-uploading");
      item.thumb.classList.add("is-done");
      item.thumb.querySelector(".wp-thumb-status").textContent = "✓";
    } catch (e) {
      console.error("[wedding upload]", e);
      item.status = "fail";
      item.thumb.classList.remove("is-uploading");
      item.thumb.classList.add("is-fail");
      item.thumb.querySelector(".wp-thumb-status").textContent = "!";
    }
  }

  function showDone(items) {
    $doneGrid.innerHTML = "";
    items.forEach(it => {
      const cell = document.createElement("div");
      cell.className = "wp-done-cell";
      if (it.video) {
        cell.innerHTML = `<video muted playsinline preload="metadata"></video><span class="wp-done-play">▶</span><span class="wp-done-check">✓</span>`;
        cell.querySelector("video").src = it.url;
      } else {
        cell.innerHTML = `<img alt="" /><span class="wp-done-check">✓</span>`;
        cell.querySelector("img").src = it.url;
      }
      $doneGrid.appendChild(cell);
    });
    $doneTitle.textContent = `추억 ${items.length}개, 전달됐어요! 🎉`;
    $doneRank.hidden = true;
    $uploadCard.hidden = true;
    $doneCard.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });

    // 모인 전체 수를 다시 받아 감정 카피로
    fetchCount().then(c => {
      if (!c || !c.total) return;
      const img = Number(c.images || 0).toLocaleString("ko-KR");
      const vid = Number(c.videos || 0).toLocaleString("ko-KR");
      $doneRank.innerHTML = c.videos > 0
        ? `지금까지 사진 <b>${img}</b>장 · 영상 <b>${vid}</b>개가 모였어요`
        : `지금까지 <b>${img}</b>개의 순간이 모였어요`;
      $doneRank.hidden = false;
    });
  }

  async function uploadAll() {
    const targets = queue.filter(q => q.status === "idle" || q.status === "fail");
    if (!targets.length) return;
    targets.forEach(t => { t.status = "idle"; t.thumb.classList.remove("is-fail"); t.thumb.querySelector(".wp-thumb-status").textContent = ""; });
    $upload.disabled = true;
    setStatus("");
    const total = targets.length;
    let done = 0;
    setProgress(0, total);
    let cursor = 0;
    async function worker() {
      while (cursor < targets.length) {
        const my = targets[cursor++];
        await uploadOne(my);
        done++;
        setProgress(done, total);
      }
    }
    const workers = [];
    for (let i = 0; i < Math.min(MAX_PARALLEL, targets.length); i++) workers.push(worker());
    await Promise.all(workers);

    const succeeded = queue.filter(q => q.status === "done");
    const failed = queue.filter(q => q.status === "fail").length;
    if (failed === 0) {
      showDone(succeeded.slice());
      queue.length = 0;
      $previews.innerHTML = "";
      $previews.hidden = true;
      setProgress(0, 0);
    } else {
      setStatus(`${succeeded.length}개 성공 · ${failed}개 실패. 아래 버튼으로 다시 시도해 주세요.`, true);
      $upload.disabled = false;
      $upload.querySelector(".wp-btn-label").textContent = `실패 ${failed}개 다시 시도`;
    }
  }

  // ── 이벤트 ────────────────────────────────────
  $file.addEventListener("change", e => { addFiles(e.target.files); e.target.value = ""; });
  ["dragenter", "dragover"].forEach(t => $drop.addEventListener(t, e => { e.preventDefault(); $drop.classList.add("is-drag"); }));
  ["dragleave", "drop"].forEach(t => $drop.addEventListener(t, e => { e.preventDefault(); $drop.classList.remove("is-drag"); }));
  $drop.addEventListener("drop", e => { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
  $upload.addEventListener("click", uploadAll);
  $moreBtn.addEventListener("click", () => {
    $doneCard.hidden = true; $uploadCard.hidden = false; $doneGrid.innerHTML = "";
    refreshUploadBtn();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("beforeunload", e => {
    if (queue.some(q => q.status === "uploading")) { e.preventDefault(); e.returnValue = ""; }
  });

  // ── 제작자 / 기술 스택 모달 ───────────────────
  const $brand = $("brandBtn");
  const $modal = $("techModal");
  const $modalClose = $("techClose");
  if ($brand && $modal) {
    const open = () => { $modal.hidden = false; document.body.style.overflow = "hidden"; };
    const close = () => { $modal.hidden = true; document.body.style.overflow = ""; };
    $brand.addEventListener("click", open);
    $modalClose.addEventListener("click", close);
    $modal.addEventListener("click", e => { if (e.target === $modal) close(); });
    document.addEventListener("keydown", e => { if (!$modal.hidden && e.key === "Escape") close(); });
  }

  refreshUploadBtn();
})();
