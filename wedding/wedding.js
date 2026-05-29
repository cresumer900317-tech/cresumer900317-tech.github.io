/* 박기백·박지은 결혼식 — 하객 사진·영상 업로드 클라이언트.
   - 사진: 클라이언트 압축 (Canvas, max 1920px long edge, JPEG q0.85)
   - 동영상: 원본 그대로 업로드 (압축 안 함)
   - 병렬 업로드 동시 3개 제한
   - 익명 식별: localStorage uuid (이름 입력은 없음) */

(function () {
  "use strict";

  const API_BASE = "https://guild-backend-production-75a6.up.railway.app";
  const MAX_DIMENSION = 1920;
  const JPEG_QUALITY = 0.85;
  const MAX_PARALLEL = 3;
  const VIDEO_RE = /^video\//i;
  const VIDEO_EXT_RE = /\.(mp4|mov|webm|m4v|3gp)$/i;
  const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

  function isVideo(file) {
    return VIDEO_RE.test(file.type) || VIDEO_EXT_RE.test(file.name || "");
  }
  function isAccepted(file) {
    return /^image\//i.test(file.type) || isVideo(file) ||
           IMAGE_EXT_RE.test(file.name || "") || VIDEO_EXT_RE.test(file.name || "");
  }

  // ── UUID (재방문 식별, 화면에 노출 안 함) ───────
  function getUuid() {
    try {
      let v = localStorage.getItem("wedding_uploader_uuid");
      if (!v) {
        v = (crypto.randomUUID && crypto.randomUUID()) ||
            ("uid-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
        localStorage.setItem("wedding_uploader_uuid", v);
      }
      return v;
    } catch (_) {
      return "uid-" + Math.random().toString(36).slice(2);
    }
  }

  // ── DOM ───────────────────────────────────────
  const $file = document.getElementById("fileInput");
  const $drop = document.getElementById("dropZone");
  const $previews = document.getElementById("previews");
  const $upload = document.getElementById("uploadBtn");
  const $status = document.getElementById("status");
  const $progressWrap = document.getElementById("progressWrap");
  const $progressFill = document.getElementById("progressFill");
  const $progressText = document.getElementById("progressText");
  const $uploadCard = document.getElementById("uploadCard");
  const $doneCard = document.getElementById("doneCard");
  const $doneTitle = document.getElementById("doneTitle");
  const $doneGrid = document.getElementById("doneGrid");
  const $moreBtn = document.getElementById("moreBtn");

  // ── 큐 ────────────────────────────────────────
  /** @type {{id:string, file:File, video:boolean, url:string, thumb:HTMLElement, status:'idle'|'uploading'|'done'|'fail'}[]} */
  const queue = [];

  function refreshUploadBtn() {
    const pending = queue.filter(q => q.status === "idle" || q.status === "fail").length;
    $upload.disabled = pending === 0;
    $upload.querySelector(".wp-btn-label").textContent =
      pending > 0 ? `${pending}개 업로드` : "사진 업로드";
    $previews.hidden = queue.length === 0;
  }

  function setStatus(msg, isError) {
    if (!msg) { $status.hidden = true; return; }
    $status.hidden = false;
    $status.textContent = msg;
    $status.classList.toggle("is-error", !!isError);
  }

  function setProgress(done, total) {
    if (!total) { $progressWrap.hidden = true; return; }
    $progressWrap.hidden = false;
    const pct = Math.round((done / total) * 100);
    $progressFill.style.width = pct + "%";
    $progressText.textContent = `${done} / ${total}`;
  }

  // ── 파일 추가 ─────────────────────────────────
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
        thumb.innerHTML = `
          <video muted playsinline preload="metadata"></video>
          <span class="wp-thumb-play" aria-hidden="true">▶</span>
          <button class="wp-thumb-remove" type="button" aria-label="제거">×</button>
          <span class="wp-thumb-status" aria-hidden="true"></span>
        `;
        thumb.querySelector("video").src = url;
      } else {
        thumb.innerHTML = `
          <img alt="" />
          <button class="wp-thumb-remove" type="button" aria-label="제거">×</button>
          <span class="wp-thumb-status" aria-hidden="true"></span>
        `;
        thumb.querySelector("img").src = url;
      }

      thumb.querySelector(".wp-thumb-remove").addEventListener("click", () => {
        const idx = queue.findIndex(q => q.id === id);
        if (idx >= 0 && queue[idx].status !== "uploading") {
          try { URL.revokeObjectURL(queue[idx].url); } catch (_) {}
          queue.splice(idx, 1);
          thumb.remove();
          refreshUploadBtn();
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
    return new Promise(resolve => { canvas.toBlob(b => resolve(b), type, quality); });
  }

  async function compressImage(file) {
    let img;
    try {
      img = await loadImage(file);
    } catch (_) {
      return file; // HEIC 등 브라우저가 못 그리면 원본 전송
    }

    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    let scale = 1;
    if (longEdge > MAX_DIMENSION) scale = MAX_DIMENSION / longEdge;

    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);

    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (!blob) return file;

    if (blob.size >= file.size && /\.jpe?g$/i.test(file.name)) {
      return Object.assign(file, { _w: w, _h: h });
    }
    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    const compressed = new File([blob], newName, { type: "image/jpeg" });
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
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`서버 오류 (${res.status}) ${txt.slice(0, 120)}`);
      }
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
    // 방금 올린 사진/영상 미리보기 — "정말 올라갔구나" 확신을 주기 위함
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
    const n = items.length;
    $doneTitle.textContent = `${n}개 올렸어요! ✓`;
    $uploadCard.hidden = true;
    $doneCard.hidden = false;
  }

  async function uploadAll() {
    const targets = queue.filter(q => q.status === "idle" || q.status === "fail");
    if (!targets.length) return;

    targets.forEach(t => {
      t.status = "idle";
      t.thumb.classList.remove("is-fail");
      t.thumb.querySelector(".wp-thumb-status").textContent = "";
    });

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

    const succeededItems = queue.filter(q => q.status === "done");
    const failed = queue.filter(q => q.status === "fail").length;

    if (failed === 0) {
      showDone(succeededItems.slice());
      // 큐 비우기 (미리보기는 done 화면에 별도 렌더됨)
      queue.length = 0;
      $previews.innerHTML = "";
      $previews.hidden = true;
      setProgress(0, 0);
    } else {
      setStatus(`${succeededItems.length}개 성공 · ${failed}개 실패. 아래 버튼으로 다시 시도해 주세요.`, true);
      $upload.disabled = false;
      $upload.querySelector(".wp-btn-label").textContent = `실패 ${failed}개 다시 시도`;
    }
  }

  // ── 이벤트 ────────────────────────────────────
  $file.addEventListener("change", e => {
    addFiles(e.target.files);
    e.target.value = "";
  });

  ["dragenter", "dragover"].forEach(t => {
    $drop.addEventListener(t, e => { e.preventDefault(); $drop.classList.add("is-drag"); });
  });
  ["dragleave", "drop"].forEach(t => {
    $drop.addEventListener(t, e => { e.preventDefault(); $drop.classList.remove("is-drag"); });
  });
  $drop.addEventListener("drop", e => {
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  $upload.addEventListener("click", uploadAll);

  $moreBtn.addEventListener("click", () => {
    $doneCard.hidden = true;
    $uploadCard.hidden = false;
    $doneGrid.innerHTML = "";
    refreshUploadBtn();
  });

  window.addEventListener("beforeunload", e => {
    if (queue.some(q => q.status === "uploading")) { e.preventDefault(); e.returnValue = ""; }
  });

  refreshUploadBtn();
})();
