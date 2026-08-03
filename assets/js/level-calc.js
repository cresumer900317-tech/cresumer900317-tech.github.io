// 레벨업 계산기 — 사냥/파티퀘 경험치 효율 계산 (데이터: level-calc-data.js)
document.addEventListener("DOMContentLoaded", () => {
  renderShell();
  renderLevelCalc();
});

// ── 포맷 유틸 ────────────────────────────────────────────────────
function lcFmtExp(n) {
  if (!isFinite(n) || isNaN(n)) return "-";
  n = Math.round(n);
  if (n >= 1e16) return (n / 1e16).toFixed(2).replace(/\.?0+$/, "") + "경";
  if (n >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, "") + "조";
  if (n >= 1e8)  return (n / 1e8).toFixed(2).replace(/\.?0+$/, "")  + "억";
  if (n >= 1e4)  return (n / 1e4).toFixed(2).replace(/\.?0+$/, "")  + "만";
  return n.toLocaleString("ko-KR");
}
function lcFmtPct(v) {
  if (!isFinite(v) || isNaN(v)) return "-";
  return v.toFixed(3).replace(/\.?0+$/, "") + "%";
}
function lcFmtTime(sec) {
  if (!isFinite(sec) || sec <= 0) return "0분";
  sec = Math.round(sec);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  let s = "";
  if (d > 0) s += d + "일 ";
  if (h > 0) s += h + "시간 ";
  if (m > 0 || s === "") s += m + "분";
  return s.trim();
}
function lcFmtSec(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}
function lcSet(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

// ── UI 렌더 ──────────────────────────────────────────────────────
function renderLevelCalc() {
  const stageOpts = (() => {
    let html = "", prevCh = null;
    STAGES.forEach(s => {
      if (s.ch !== prevCh) {
        if (prevCh !== null) html += "</optgroup>";
        html += `<optgroup label="Chapter ${s.ch}">`;
        prevCh = s.ch;
      }
      const sel = s.id === "31-1" ? " selected" : "";
      html += `<option value="${s.id}"${sel}>${s.id}  ${s.n.replace(/\s*\d+번$/, "")}</option>`;
    });
    return html + "</optgroup>";
  })();

  const pqOpts = (() => {
    let html = "", prevG = null;
    PQ_DATA.forEach(pq => {
      if (pq.group !== prevG) {
        if (prevG !== null) html += "</optgroup>";
        html += `<optgroup label="${pq.group}">`;
        prevG = pq.group;
      }
      html += `<option value="${pq.id}">${pq.name}</option>`;
    });
    return html + "</optgroup>";
  })();

  document.querySelector("main").innerHTML = `
  <div class="page-card">
    <div class="container lc-wrap">
      <header class="lc-head">
        <h1 class="lc-title">🍁 레벨업 계산기</h1>
        <p class="lc-sub">메이플키우기 사냥·파티퀘 경험치 효율을 계산해요. 최대 레벨 ${MAX_LV}.</p>
      </header>

      <div class="lc-grid">
        <!-- 입력 -->
        <section class="lc-panel lc-inputs">
          <div class="lc-block">
            <h2 class="lc-block-title">내 정보</h2>
            <div class="lc-field-row">
              <label class="lc-field">
                <span>현재 레벨 <em id="curLvRange">(1 ~ ${MAX_LV})</em></span>
                <input type="number" id="curLv" value="100" min="1" max="${MAX_LV}">
              </label>
              <label class="lc-field">
                <span>현재 경험치 (%)</span>
                <input type="number" id="curExp" value="0" min="0" max="99.99" step="0.01">
              </label>
            </div>
            <div class="lc-field-row">
              <label class="lc-field">
                <span>목표 레벨 <em id="tgtLvRange">(101 ~ ${MAX_TGT_LV})</em></span>
                <input type="number" id="tgtLv" value="101" min="2" max="${MAX_TGT_LV}">
              </label>
              <label class="lc-field">
                <span>분당 처치 수</span>
                <input type="number" id="kmp" value="100" min="1" max="9999" step="1">
              </label>
            </div>
            <label class="lc-field">
              <span>사냥 스테이지</span>
              <select id="stageSelect">${stageOpts}</select>
            </label>
          </div>

          <div class="lc-block">
            <h2 class="lc-block-title">경험치 버프 <span class="lc-buff-total" id="totalBuffVal">+0%</span></h2>
            <label class="lc-field">
              <span>경험치 증가 합계 (%)</span>
              <input type="number" id="buffPct" value="0" min="0" max="999" step="1" placeholder="예: 26">
            </label>
            <p class="lc-hint">길드 대항전·수련장, 아레나, 패키지 등 내 경험치 증가를 모두 더해 입력하세요. 예) 대항전 1위 16 + 프리미엄 10 = 26</p>
          </div>
        </section>

        <!-- 결과 -->
        <section class="lc-panel lc-results">
          <div class="lc-tabs">
            <button class="lc-tab lc-active" data-tab="next" type="button">다음 레벨</button>
            <button class="lc-tab" data-tab="target" type="button">목표 레벨</button>
          </div>

          <div class="lc-tabpanel lc-active" id="panel-next">
            <div class="lc-hero">
              <div class="lc-hero-label" id="nextLvLabel">Lv.100 → Lv.101</div>
              <div class="lc-hero-time" id="nextTime">-</div>
              <div class="lc-hero-cap">예상 소요 시간</div>
            </div>
            <div class="lc-expbar-wrap">
              <div class="lc-expbar-top">
                <span id="nextLvExpLabel">Lv.100 경험치</span>
                <span id="expPctLabel">0%</span>
              </div>
              <div class="lc-expbar"><div class="lc-expfill" id="expFill" style="width:0%"></div></div>
            </div>
            <div class="lc-stats">
              <div class="lc-stat"><span>시간당</span><b id="hourPct">-</b></div>
              <div class="lc-stat"><span>하루 기준</span><b id="dayPct">-</b></div>
              <div class="lc-stat"><span>마리당 EXP</span><b id="perKill">-</b></div>
              <div class="lc-stat"><span>분당 EXP</span><b id="perMin">-</b></div>
              <div class="lc-stat"><span>레벨업 필요</span><b id="lvNeeded">-</b></div>
              <div class="lc-stat"><span>남은 EXP</span><b id="nextExpRemain">-</b></div>
            </div>
          </div>

          <div class="lc-tabpanel" id="panel-target">
            <div class="lc-hero">
              <div class="lc-hero-label" id="targetHeroLabel">Lv.100 → Lv.101</div>
              <div class="lc-hero-time" id="targetTime">-</div>
              <div class="lc-hero-cap">예상 소요 시간</div>
            </div>
            <div class="lc-stats">
              <div class="lc-stat lc-stat-wide"><span>필요 경험치</span><b id="targetLvLabel">-</b></div>
              <div class="lc-stat"><span>시간당</span><b id="targetHourPct">-</b></div>
              <div class="lc-stat"><span>하루 기준</span><b id="targetDayPct">-</b></div>
              <div class="lc-stat"><span>남은 EXP</span><b id="targetExpRemain">-</b></div>
            </div>
          </div>
        </section>
      </div>

      <!-- 파티퀘 비교 -->
      <section class="lc-panel lc-pq">
        <h2 class="lc-block-title">파티 퀘스트 vs 사냥 효율</h2>
        <div class="lc-field-row">
          <label class="lc-field">
            <span>파티 퀘스트</span>
            <select id="pqSelect">${pqOpts}</select>
          </label>
          <label class="lc-field">
            <span>1판 클리어 시간 <em id="clearLabel">1분 30초</em></span>
            <input type="range" id="clearSlider" min="20" max="300" step="5" value="90">
          </label>
        </div>
        <div id="winnerBadge" class="lc-badge-wrap"></div>
        <div class="lc-compare">
          <div class="lc-cmp-row">
            <span class="lc-cmp-name">⚔️ 사냥</span>
            <div class="lc-cmp-track"><div class="lc-cmp-fill lc-cmp-hunt" id="huntBar"></div></div>
            <span class="lc-cmp-val" id="huntPctLabel">-</span>
          </div>
          <div class="lc-cmp-row">
            <span class="lc-cmp-name">🎉 파티퀘</span>
            <div class="lc-cmp-track"><div class="lc-cmp-fill lc-cmp-pq" id="pqBar"></div></div>
            <span class="lc-cmp-val" id="pqPctLabel">-</span>
          </div>
        </div>
        <div class="lc-stats">
          <div class="lc-stat"><span>1판 EXP</span><b id="pqExpRun">-</b></div>
          <div class="lc-stat"><span>시간당(파퀘)</span><b id="pqHourPct">-</b></div>
          <div class="lc-stat"><span>다음 레벨까지</span><b id="pqRunsNext">-</b></div>
          <div class="lc-stat"><span>목표 레벨까지</span><b id="pqRunsTarget">-</b></div>
        </div>
      </section>
    </div>
  </div>`;

  bindLevelCalc();
  lcCalc();
}

// ── 입력 클램프 ──────────────────────────────────────────────────
function lcClampInputs() {
  const curLvEl = document.getElementById("curLv");
  const tgtLvEl = document.getElementById("tgtLv");
  let curLv = parseInt(curLvEl.value) || 1;
  let tgtLv = parseInt(tgtLvEl.value) || MAX_TGT_LV;
  curLv = Math.min(MAX_LV, Math.max(1, curLv));
  tgtLv = Math.min(MAX_TGT_LV, Math.max(curLv + 1, tgtLv));
  tgtLvEl.min = curLv + 1;
  lcSet("curLvRange", `(1 ~ ${MAX_LV})`);
  lcSet("tgtLvRange", `(${curLv + 1} ~ ${MAX_TGT_LV})`);
  return { curLv, tgtLv };
}

// ── 메인 계산 ────────────────────────────────────────────────────
function lcCalc() {
  const { curLv, tgtLv } = lcClampInputs();
  const curPct = Math.min(99.99, Math.max(0, parseFloat(document.getElementById("curExp").value) || 0));
  const kmp    = Math.max(0, parseFloat(document.getElementById("kmp").value) || 0);
  const sid    = document.getElementById("stageSelect").value;

  // 버프 — 합계 %를 직접 입력
  const totalBuff = Math.max(0, parseFloat(document.getElementById("buffPct").value) || 0);
  const mul = 1 + totalBuff / 100;
  lcSet("totalBuffVal", "+" + totalBuff + "%");

  // 스테이지 EXP
  const stg     = STAGES.find(s => s.id === sid) || STAGES[0];
  const expKill = stg.e * mul;
  const expMin  = expKill * kmp;
  const expHour = expMin * 60;

  // 현재 레벨
  const curLvReq  = LEVEL_EXP[curLv] || 0;
  const curExpAbs = curLvReq * (curPct / 100);

  // 다음 레벨까지
  const nextNeeded = curLvReq - curExpAbs;
  const nextSecs   = expMin > 0 ? (nextNeeded / expMin) * 60 : Infinity;

  // 목표 레벨까지 총 EXP
  let totalNeeded = 0;
  if (tgtLv > curLv) {
    totalNeeded += curLvReq - curExpAbs;
    for (let lv = curLv + 1; lv < tgtLv; lv++) totalNeeded += LEVEL_EXP[lv] || 0;
  }
  const targetSecs = expMin > 0 ? (totalNeeded / expMin) * 60 : Infinity;

  const pctHour = curLvReq > 0 ? (expHour / curLvReq * 100) : 0;
  const pctDay  = pctHour * 24;

  // 다음 레벨 탭
  lcSet("nextTime",       lcFmtTime(nextSecs));
  lcSet("nextLvLabel",    `Lv.${curLv} → Lv.${curLv + 1}`);
  lcSet("hourPct",        lcFmtPct(pctHour) + " / Lv");
  lcSet("dayPct",         lcFmtPct(pctDay)  + " / Lv");
  lcSet("expPctLabel",    lcFmtPct(curPct));
  lcSet("nextLvExpLabel", `Lv.${curLv} 경험치`);
  document.getElementById("expFill").style.width = Math.min(curPct, 100) + "%";
  lcSet("perKill",        lcFmtExp(expKill));
  lcSet("perMin",         lcFmtExp(expMin));
  lcSet("lvNeeded",       lcFmtExp(curLvReq));
  lcSet("nextExpRemain",  lcFmtExp(nextNeeded));

  // 목표 레벨 탭
  lcSet("targetHeroLabel", `Lv.${curLv} → Lv.${tgtLv}`);
  lcSet("targetTime",      lcFmtTime(targetSecs));
  lcSet("targetLvLabel",   lcFmtExp(totalNeeded));
  lcSet("targetExpRemain", lcFmtExp(totalNeeded));
  lcSet("targetHourPct",   lcFmtPct(pctHour) + " / Lv");
  lcSet("targetDayPct",    lcFmtPct(pctDay)  + " / Lv");

  lcCalcPQ(curLvReq, expMin, nextNeeded, totalNeeded);
}

function lcCalcPQ(curLvReq, expMin, nextNeeded, totalNeeded) {
  const pqId = document.getElementById("pqSelect").value;
  const pq   = PQ_DATA.find(p => p.id === pqId) || PQ_DATA[0];
  const clearSec = parseInt(document.getElementById("clearSlider").value);
  const clearMin = clearSec / 60;

  const pqExpRun = pq.exp;
  const pqExpMin = clearMin > 0 ? pqExpRun / clearMin : 0;
  const pqHrExp  = pqExpMin * 60;

  const huntPctMin = curLvReq > 0 ? (expMin   / curLvReq * 100) : 0;
  const pqPctMin   = curLvReq > 0 ? (pqExpMin / curLvReq * 100) : 0;
  const pqHrPct    = curLvReq > 0 ? (pqHrExp  / curLvReq * 100) : 0;

  const runsNext   = pqExpRun > 0 ? Math.ceil(nextNeeded  / pqExpRun) : Infinity;
  const runsTarget = pqExpRun > 0 ? Math.ceil(totalNeeded / pqExpRun) : Infinity;
  const daysNext   = isFinite(runsNext)   ? (runsNext   * clearSec / 86400) : null;
  const daysTarget = isFinite(runsTarget) ? (runsTarget * clearSec / 86400) : null;

  function fmtRuns(runs, days) {
    if (!isFinite(runs)) return "∞";
    const dStr = days < 1 ? (days * 24).toFixed(1) + "시간"
      : days < 1000 ? days.toFixed(1) + "일"
      : Math.round(days).toLocaleString("ko-KR") + "일";
    return runs.toLocaleString("ko-KR") + "판 (" + dStr + ")";
  }

  const maxPct = Math.max(huntPctMin, pqPctMin, 1e-20);
  document.getElementById("huntBar").style.width = (huntPctMin / maxPct * 100) + "%";
  document.getElementById("pqBar").style.width   = (pqPctMin   / maxPct * 100) + "%";

  lcSet("huntPctLabel", lcFmtPct(huntPctMin) + " / Lv");
  lcSet("pqPctLabel",   lcFmtPct(pqPctMin)   + " / Lv");
  lcSet("pqExpRun",     lcFmtExp(pqExpRun));
  lcSet("pqHourPct",    lcFmtPct(pqHrPct) + " / Lv");
  lcSet("pqRunsNext",   fmtRuns(runsNext,   daysNext));
  lcSet("pqRunsTarget", fmtRuns(runsTarget, daysTarget));

  const badge = document.getElementById("winnerBadge");
  if (!isFinite(huntPctMin) || !isFinite(pqPctMin) || (huntPctMin === 0 && pqPctMin === 0)) {
    badge.innerHTML = "";
  } else if (pqPctMin > huntPctMin + 1e-12) {
    badge.innerHTML = `<div class="lc-badge lc-badge-pq">🏆 파티 퀘스트가 더 효율적이에요!</div>`;
  } else if (huntPctMin > pqPctMin + 1e-12) {
    badge.innerHTML = `<div class="lc-badge lc-badge-hunt">🏆 사냥이 더 효율적이에요!</div>`;
  } else {
    badge.innerHTML = `<div class="lc-badge lc-badge-tie">⚖️ 효율이 동일해요</div>`;
  }
}

// ── 이벤트 바인딩 ────────────────────────────────────────────────
function bindLevelCalc() {
  // 탭 전환
  document.querySelectorAll(".lc-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".lc-tab").forEach(b => b.classList.toggle("lc-active", b === btn));
      document.getElementById("panel-next").classList.toggle("lc-active", tab === "next");
      document.getElementById("panel-target").classList.toggle("lc-active", tab === "target");
    });
  });

  // 입력 변경 → 재계산
  ["curLv", "curExp", "tgtLv", "kmp", "buffPct"].forEach(id =>
    document.getElementById(id).addEventListener("input", lcCalc));
  ["stageSelect", "pqSelect"].forEach(id =>
    document.getElementById(id).addEventListener("change", lcCalc));

  // 클리어 시간 슬라이더
  const slider = document.getElementById("clearSlider");
  slider.addEventListener("input", () => {
    lcSet("clearLabel", lcFmtSec(+slider.value));
    lcCalc();
  });
}
