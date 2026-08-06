// 아이템 비교 AI — 게임 비교 스크린샷 업로드 → 백엔드 Claude Vision 판정
document.addEventListener("DOMContentLoaded", () => {
  renderShell();
  renderItemCompare();
});

let icFile = null;      // 분석 대기 중인 File/Blob
let icBusy = false;

function renderItemCompare() {
  const main = document.querySelector("main");
  if (!main) return;
  main.innerHTML = `
    <div class="page-container ic-wrap">
      <div class="ic-head">
        <div class="ic-title">아이템 비교 AI</div>
        <div class="ic-sub">게임 속 아이템 비교 화면을 캡쳐해서 올리면, 어느 쪽이 좋은지 AI가 판정해 드려요</div>
      </div>

      <div class="ic-panel">
        <div class="ic-drop" id="icDrop" tabindex="0">
          <input type="file" id="icFileInput" accept="image/*" hidden />
          <div class="ic-drop-inner" id="icDropInner">
            <div class="ic-drop-icon">🖼️</div>
            <div class="ic-drop-text"><strong>스크린샷을 올려주세요</strong></div>
            <div class="ic-drop-hint">클릭해서 선택 · 드래그 · 붙여넣기(Ctrl+V) 모두 가능해요</div>
          </div>
          <img class="ic-preview" id="icPreview" alt="" hidden />
        </div>
        <div class="ic-actions">
          <button class="ic-btn-analyze" id="icAnalyzeBtn" disabled>AI 분석하기</button>
          <button class="ic-btn-reset" id="icResetBtn" hidden>다른 캡쳐 올리기</button>
        </div>
        <div class="ic-hint">비교 팝업의 <b>양쪽 아이템이 모두 보이게</b> 캡쳐해 주세요. 전투력 변화 숫자가 보이면 더 정확해요.</div>
      </div>

      <div id="icResult"></div>
    </div>`;

  const drop = document.getElementById("icDrop");
  const input = document.getElementById("icFileInput");

  drop.addEventListener("click", () => { if (!icBusy) input.click(); });
  input.addEventListener("change", () => { if (input.files && input.files[0]) icSetFile(input.files[0]); });

  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("ic-dragover"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("ic-dragover"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("ic-dragover");
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) icSetFile(f);
  });

  // 클립보드 붙여넣기 (페이지 아무데서나)
  document.addEventListener("paste", (e) => {
    const items = (e.clipboardData && e.clipboardData.items) || [];
    for (const it of items) {
      if (it.type && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) { icSetFile(f); e.preventDefault(); break; }
      }
    }
  });

  document.getElementById("icAnalyzeBtn").addEventListener("click", icAnalyze);
  document.getElementById("icResetBtn").addEventListener("click", icReset);
}

function icSetFile(file) {
  if (icBusy) return;
  if (!file.type.startsWith("image/")) { icShowError("이미지 파일만 올릴 수 있어요"); return; }
  icFile = file;
  const url = URL.createObjectURL(file);
  const preview = document.getElementById("icPreview");
  preview.src = url;
  preview.hidden = false;
  document.getElementById("icDropInner").hidden = true;
  document.getElementById("icAnalyzeBtn").disabled = false;
  document.getElementById("icResetBtn").hidden = false;
  document.getElementById("icResult").innerHTML = "";
}

function icReset() {
  if (icBusy) return;
  icFile = null;
  const preview = document.getElementById("icPreview");
  preview.hidden = true;
  preview.removeAttribute("src");
  document.getElementById("icDropInner").hidden = false;
  document.getElementById("icAnalyzeBtn").disabled = true;
  document.getElementById("icResetBtn").hidden = true;
  document.getElementById("icFileInput").value = "";
  document.getElementById("icResult").innerHTML = "";
}

// 큰 캡쳐는 클라이언트에서 축소(장변 1600px, JPEG) — 업로드·분석 비용 절감
async function icCompress(file) {
  const MAX_EDGE = 1600;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    if (scale >= 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    return blob || file;
  } catch (_) {
    return file; // 압축 실패 시 원본 그대로
  }
}

async function icAnalyze() {
  if (!icFile || icBusy) return;
  icBusy = true;
  const btn = document.getElementById("icAnalyzeBtn");
  btn.disabled = true;
  btn.textContent = "분석 중…";
  document.getElementById("icResult").innerHTML = `
    <div class="ic-panel ic-loading">
      <div class="ic-spinner"></div>
      <div class="ic-loading-text">AI가 스크린샷을 읽고 있어요… (10~30초)</div>
    </div>`;

  try {
    const blob = await icCompress(icFile);
    const fd = new FormData();
    fd.append("file", blob, "screenshot.jpg");
    const res = await fetch(`${API_BASE}/api/item-compare/analyze`, { method: "POST", body: fd });
    let data = null;
    try { data = await res.json(); } catch (_) { /* 비 JSON 응답 */ }
    if (!res.ok) {
      icShowError((data && data.detail) || `분석에 실패했어요 (${res.status})`);
      return;
    }
    if (!data || data.parse_ok === false) {
      icShowError((data && data.error) || "아이템 비교 화면을 찾지 못했어요. 양쪽 아이템이 보이게 다시 캡쳐해 주세요.");
      return;
    }
    icRenderResult(data);
  } catch (e) {
    icShowError("서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
  } finally {
    icBusy = false;
    btn.disabled = !icFile;
    btn.textContent = "AI 분석하기";
  }
}

function icShowError(msg) {
  document.getElementById("icResult").innerHTML = `
    <div class="ic-panel ic-error">⚠️ ${escapeHtml(String(msg))}</div>`;
}

const IC_WINNER = {
  left:  { label: "지금 장착 중인 아이템 유지", cls: "ic-w-left",  icon: "🛡️" },
  right: { label: "새 아이템으로 교체 추천",     cls: "ic-w-right", icon: "✨" },
  tie:   { label: "사실상 동급 — 취향대로",      cls: "ic-w-tie",   icon: "⚖️" },
  depends: { label: "콘텐츠에 따라 달라요",      cls: "ic-w-tie",   icon: "🔀" },
  unknown: { label: "판정 보류",                cls: "ic-w-tie",   icon: "❓" },
};
const IC_CONF = { high: "확신 높음", medium: "확신 보통", low: "확신 낮음" };
const IC_SIDE = { left: "왼쪽", right: "오른쪽", tie: "동급", unknown: "-" };

function icRenderResult(data) {
  const v = data.verdict || {};
  const w = IC_WINNER[v.winner] || IC_WINNER.unknown;

  const byContent = (v.by_content || []).map((c) => `
    <div class="ic-content-row">
      <span class="ic-content-name">${escapeHtml(c.content || "")}</span>
      <span class="ic-content-winner ic-cw-${escapeHtml(c.winner || "unknown")}">${IC_SIDE[c.winner] || "-"} 유리</span>
      <span class="ic-content-reason">${escapeHtml(c.reason || "")}</span>
    </div>`).join("");

  const statsTable = icStatsTable(data.left, data.right);

  document.getElementById("icResult").innerHTML = `
    <div class="ic-panel ic-verdict">
      <div class="ic-verdict-hero ${w.cls}">
        <div class="ic-verdict-icon">${w.icon}</div>
        <div class="ic-verdict-label">${w.label}</div>
        <div class="ic-verdict-conf">${IC_CONF[v.confidence] || ""}${v.power_change_read ? ` · 전투력 변화 ${escapeHtml(v.power_change_read)}` : ""}</div>
      </div>
      <div class="ic-summary">${escapeHtml(v.summary || "")}</div>
      ${byContent ? `<div class="ic-block-title">콘텐츠별 판정</div><div class="ic-contents">${byContent}</div>` : ""}
      ${statsTable}
      ${v.caution ? `<div class="ic-caution">💡 ${escapeHtml(v.caution)}</div>` : ""}
      <div class="ic-meta">AI 판독 결과는 참고용이에요 · 넥슨 공식 전투 공식 기준${data.meta ? ` · ${data.meta.elapsed_sec}초` : ""}</div>
    </div>`;
  document.getElementById("icResult").scrollIntoView({ behavior: "smooth", block: "start" });
}

function icStatsTable(left, right) {
  if (!left || !right) return "";
  const itemHead = (it, side) => {
    const bits = [it.grade, it.level ? `Lv.${it.level}` : null].filter(Boolean).join(" · ");
    return `<div class="ic-item-head">
      <span class="ic-item-side">${side}${it.equipped ? " (장착중)" : ""}</span>
      <strong>${escapeHtml(it.name || "아이템")}</strong>
      ${bits ? `<em>${escapeHtml(bits)}</em>` : ""}
    </div>`;
  };
  // 스탯 이름 기준으로 좌/우 병합
  const names = [];
  const map = {};
  const add = (arr, side) => (arr || []).forEach((s) => {
    const key = s.stat || "";
    if (!map[key]) { map[key] = {}; names.push(key); }
    map[key][side] = s;
  });
  add(left.stats, "l"); add(right.stats, "r");

  const rows = names.map((n) => {
    const l = map[n].l, r = map[n].r;
    const diff = (r && r.diff) ? `<span class="ic-diff">${escapeHtml(r.diff)}</span>` : "";
    return `<tr>
      <td class="ic-td-stat">${escapeHtml(n)}</td>
      <td>${l ? escapeHtml(l.value) : "<span class='ic-none'>—</span>"}</td>
      <td>${r ? escapeHtml(r.value) : "<span class='ic-none'>—</span>"} ${diff}</td>
    </tr>`;
  }).join("");

  return `
    <div class="ic-block-title">스탯 비교</div>
    <div class="ic-table-scroll">
      <table class="ic-table">
        <thead><tr>
          <th>옵션</th>
          <th>${itemHead(left, "왼쪽")}</th>
          <th>${itemHead(right, "오른쪽")}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
