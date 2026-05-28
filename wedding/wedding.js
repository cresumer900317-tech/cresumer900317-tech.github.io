/* 박기백·박지은 결혼식 — 하객 사진 업로드 클라이언트.
   - 클라이언트단 압축 (Canvas, max 1920px long edge, JPEG q0.85)
   - 병렬 업로드 동시 3개 제한
   - 익명 식별: localStorage uuid */

(function () {
  "use strict";

  const API_BASE = "https://guild-backend-production-75a6.up.railway.app";
  const MAX_DIMENSION = 1920;
  const JPEG_QUALITY = 0.85;
  const MAX_PARALLEL = 3;

  // ── UUID (재방문 식별) ─────────────────────────
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
  const $name = document.getElementById("uploaderName");
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
  const $moreBtn = document.getElementById("moreBtn");

  // 저장된 이름 복원
  try {
    const savedName = localStorage.getItem("wedding_uploader_name");
    if (savedName) $name.value = savedName;
  } catch (_) {}

  // ── 큐 ────────────────────────────────────────
  /** @type {{id:string, file:File, thumb:HTMLElement, status:'idle'|'uploading'|'done'|'fail'}[]} */
  const queue = [];

  function refreshUploadBtn() {
    const pending = queue.filter(q => q.status === "idle" || q.status === "fail").length;
    $upload.disabled = pending === 0;
    $upload.querySelector(".wp-btn-label").textContent =
      pending > 0 ? `사진 ${pending}장 업로드` : "사진 업로드";
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
    const items = Array.from(files || []).filter(f => /^image\//i.test(f.type) || /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(f.name));
    if (!items.length) return;

    items.forEach(file => {
      const id = "q-" + Math.random().toString(36).slice(2);
      const thumb = document.createElement("div");
      thumb.className = "wp-thumb";
      thumb.dataset.id = id;
      thumb.innerHTML = `
        <img alt="" />
        <button class="wp-thumb-remove" type="button" aria-label="제거">×</button>
        <span class="wp-thumb-status" aria-hidden="true"></span>
      `;
      const $img = thumb.querySelector("img");
      const reader = new FileReader();
      reader.onload = e => { $img.src = e.target.result; };
      reader.readAsDataURL(file);

      thumb.querySelector(".wp-thumb-remove").addEventListener("click", () => {
        const idx = queue.findIndex(q => q.id === id);
        if (idx >= 0 && queue[idx].status !== "uploading") {
          queue.splice(idx, 1);
          thumb.remove();
          refreshUploadBtn();
        }
      });

      $previews.appendChild(thumb);
      queue.push({ id, file, thumb, status: "idle" });
    });

    refreshUploadBtn();
    setStatus("");
  }

  // ── 압축 ──────────────────────────────────────
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
    return new Promise(resolve => {
      canvas.toBlob(b => resolve(b), type, quality);
    });
  }

  async function compressImage(file) {
    // HEIC/HEIF 같이 브라우저가 못 그리는 포맷이면 원본 그대로 전송
    let img;
    try {
      img = await loadImage(file);
    } catch (_) {
      return file;
    }

    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    let scale = 1;
    if (longEdge > MAX_DIMENSION) scale = MAX_DIMENSION / longEdge;

    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (!blob) return file;

    // 압축 결과가 원본보다 크면 원본 사용
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
      const compressed = await compressImage(item.file);

      const fd = new FormData();
      fd.append("file", compressed, compressed.name);
      fd.append("uploader_name", ($name.value || "").trim().slice(0, 40));
      fd.append("uploader_uuid", getUuid());
      if (compressed._w) fd.append("width", String(compressed._w));
      if (compressed._h) fd.append("height", String(compressed._h));

      const res = await fetch(`${API_BASE}/api/wedding/upload`, {
        method: "POST",
        body: fd,
      });

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

  async function uploadAll() {
    const targets = queue.filter(q => q.status === "idle" || q.status === "fail");
    if (!targets.length) return;

    // fail 재시도용 초기화
    targets.forEach(t => {
      t.status = "idle";
      t.thumb.classList.remove("is-fail");
      t.thumb.querySelector(".wp-thumb-status").textContent = "";
    });

    // 이름 저장
    try {
      const n = ($name.value || "").trim();
      if (n) localStorage.setItem("wedding_uploader_name", n);
    } catch (_) {}

    $upload.disabled = true;
    setStatus("");

    const total = targets.length;
    let done = 0;
    setProgress(0, total);

    // 동시 MAX_PARALLEL 개 worker
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
    for (let i = 0; i < Math.min(MAX_PARALLEL, targets.length); i++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    const failed = queue.filter(q => q.status === "fail").length;
    const succeeded = queue.filter(q => q.status === "done").length;

    if (failed === 0) {
      // 전부 성공 — 완료 화면으로
      $uploadCard.hidden = true;
      $doneCard.hidden = false;
      // 다음을 위해 큐 비우기
      queue.length = 0;
      $previews.innerHTML = "";
      $previews.hidden = true;
      setProgress(0, 0);
    } else {
      setStatus(`${succeeded}장 성공 · ${failed}장 실패. 다시 시도하기 버튼을 눌러주세요.`, true);
      $upload.disabled = false;
      $upload.querySelector(".wp-btn-label").textContent = `실패 ${failed}장 다시 시도`;
    }
  }

  // ── 이벤트 ────────────────────────────────────
  $file.addEventListener("change", e => {
    addFiles(e.target.files);
    e.target.value = "";  // 같은 파일 재선택 가능하게
  });

  ["dragenter", "dragover"].forEach(t => {
    $drop.addEventListener(t, e => {
      e.preventDefault();
      $drop.classList.add("is-drag");
    });
  });
  ["dragleave", "drop"].forEach(t => {
    $drop.addEventListener(t, e => {
      e.preventDefault();
      $drop.classList.remove("is-drag");
    });
  });
  $drop.addEventListener("drop", e => {
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  $upload.addEventListener("click", uploadAll);

  $moreBtn.addEventListener("click", () => {
    $doneCard.hidden = true;
    $uploadCard.hidden = false;
    refreshUploadBtn();
  });

  // 페이지 떠날 때 업로드 중이면 확인
  window.addEventListener("beforeunload", e => {
    if (queue.some(q => q.status === "uploading")) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  refreshUploadBtn();
})();
