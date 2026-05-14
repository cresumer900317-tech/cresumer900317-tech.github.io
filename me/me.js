// 개인 업무 통합 관리 페이지 (/me)
// API_BASE 는 ../assets/js/common.js 에서 정의됨

const STATE = {
  tab: "dashboard",          // dashboard | inbox | tasks | projects | calendar | gantt | daily
  view: "list",              // tasks 안의 list | kanban
  inboxFilter: "active",     // active | processed
  filterCategory: null,
  search: "",
  sort: "created_desc",

  tasks: [],
  categories: [],
  projects: [],
  inbox: [],
  dailyLogs: [],

  // Phase 6d: AI 분류 제안 { inbox_id: {suggested_title, suggested_category, suggested_priority, suggested_tags, cached} }
  inboxSuggestions: {},
  aiBusy: false,

  // AI (Phase 5)
  aiEnabled: null,           // null=unknown, true/false 후 자동 분기
  aiExtract: null,           // { id, extract, promoted, dismissed }
  aiAnalyzing: false,
  smartSearching: false,

  editingTaskId: null,
  editingProjectId: null,
  promotingInboxId: null,

  // Calendar
  calCursor: null,           // Date — 표시 중인 달 (1일 기준)

  // Gantt
  ganttCellW: 32,            // 1일 픽셀

  // Daily Log
  dailyDate: null,           // YYYY-MM-DD
  dailyDirty: false,
  dailySaving: false,
  dailySearch: "",
};

const STATUS_LABEL = {
  todo: "할 일",
  in_progress: "진행 중",
  waiting: "대기",
  done: "완료",
};
const PRIORITY_LABEL = { high: "높음", medium: "보통", low: "낮음" };
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const PROJECT_STATUS_LABEL = {
  active: "진행 중",
  paused: "일시정지",
  done: "완료",
  dropped: "중단",
};
const COLOR_FALLBACK = "#6366f1";

// ── 부팅 ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  if (!user || !getToken()) {
    document.getElementById("loginGate").hidden = false;
    return;
  }
  document.getElementById("app").hidden = false;
  document.getElementById("userChip").textContent = user.character_name;

  STATE.calCursor = startOfMonth(new Date());
  STATE.dailyDate = todayStr();

  bindEvents();
  bindCmdk();
  refreshAll();
});

// ── 통신 ──────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: authHeaders() };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    location.reload();
    throw new Error("로그인이 만료됐습니다");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `요청 실패 (${res.status})`);
  }
  return data;
}

async function refreshAll() {
  try {
    const dash = await api("GET", "/api/me/dashboard");
    STATE.tasks = dash.tasks || [];
    STATE.categories = dash.categories || [];
    STATE.projects = dash.projects || [];
    STATE.inbox = dash.inbox || [];
    STATE.dailyLogs = dash.daily_logs || [];
    renderAll();
  } catch (e) {
    showToast(e.message, true);
  }
}

async function refreshTasksOnly() {
  try {
    STATE.tasks = await api("GET", "/api/me/tasks");
    if (STATE.tab === "projects") refreshProjectsOnly();
    renderAll();
  } catch (e) { showToast(e.message, true); }
}

async function refreshProjectsOnly() {
  try {
    STATE.projects = await api("GET", "/api/me/projects");
    renderAll();
  } catch (e) { showToast(e.message, true); }
}

async function refreshInboxOnly() {
  try {
    const list = await api(
      "GET",
      `/api/me/inbox?processed=${STATE.inboxFilter === "processed"}`
    );
    STATE.inbox = list;
    renderAll();
  } catch (e) { showToast(e.message, true); }
}

async function refreshDailyLogsList() {
  try {
    const today = new Date();
    const start = new Date(today.getTime() - 90 * 24 * 3600 * 1000);
    STATE.dailyLogs = await api(
      "GET",
      `/api/me/daily-logs?start=${dateOnly(start)}&end=${dateOnly(today)}&limit=120`
    );
    renderDailyList();
  } catch (e) { showToast(e.message, true); }
}

// ── 탭 전환 ──────────────────────────────────────────────
function setTab(name) {
  STATE.tab = name;
  document.querySelectorAll(".nav-tab").forEach(b => {
    b.classList.toggle("is-active", b.dataset.tab === name);
  });
  document.querySelectorAll(".page").forEach(p => p.hidden = true);
  const map = {
    dashboard: "pageDashboard",
    inbox: "pageInbox",
    tasks: "pageTasks",
    projects: "pageProjects",
    calendar: "pageCalendar",
    gantt: "pageGantt",
    daily: "pageDaily",
  };
  const page = document.getElementById(map[name]);
  if (page) page.hidden = false;

  // FAB 는 tasks 탭에서만 보이게
  document.getElementById("newTaskBtn").hidden = name !== "tasks";

  // 탭별 진입 시 렌더
  if (name === "dashboard") {
    // Inbox 위젯이 항상 미처리만 보여주도록 강제 동기화
    if (STATE.inboxFilter !== "active") {
      STATE.inboxFilter = "active";
      refreshInboxOnly().then(renderDashboard);
    } else {
      renderDashboard();
    }
  }
  else if (name === "inbox") renderInbox();
  else if (name === "tasks") renderTasks();
  else if (name === "projects") {
    renderProjects();
    refreshProjectsOnly();
  }
  else if (name === "calendar") renderCalendar();
  else if (name === "gantt") renderGantt();
  else if (name === "daily") {
    renderDailyEditor();
    refreshDailyLogsList();
  }

  window.scrollTo({ top: 0, behavior: "instant" });
}

// ── 전체 렌더 ───────────────────────────────────────────
function renderAll() {
  renderCategoryOptions();
  renderProjectOptions();
  if (STATE.tab === "dashboard") renderDashboard();
  else if (STATE.tab === "inbox") renderInbox();
  else if (STATE.tab === "tasks") renderTasks();
  else if (STATE.tab === "projects") renderProjects();
  else if (STATE.tab === "calendar") renderCalendar();
  else if (STATE.tab === "gantt") renderGantt();
  else if (STATE.tab === "daily") renderDailyEditor();
}

// ════════════════════════════════════════════════════════
// 1) DASHBOARD
// ════════════════════════════════════════════════════════
function renderDashboard() {
  const today = startOfDay(new Date());
  const todayMs = today.getTime();
  const day = 24 * 3600 * 1000;

  const tasksOpen = STATE.tasks.filter(t => t.status !== "done");

  const tasksToday = tasksOpen.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date + "T00:00:00").getTime();
    return d <= todayMs; // 오늘 + overdue
  });

  const tasksUpcoming = tasksOpen
    .filter(t => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date + "T00:00:00").getTime();
      const diff = Math.round((d - todayMs) / day);
      return diff > 0 && diff <= 3;
    });

  const tasksWeek = tasksOpen
    .filter(t => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date + "T00:00:00").getTime();
      const diff = Math.round((d - todayMs) / day);
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

  const projectsActive = STATE.projects.filter(p => p.status === "active");

  fillWidget(
    "dashToday", "dashTodayCount", tasksToday.length,
    tasksToday.map(t => dashTaskRow(t, "오늘 할 일이 없습니다 🌿"))
  );
  fillWidget(
    "dashUpcoming", "dashUpcomingCount", tasksUpcoming.length,
    tasksUpcoming.map(t => dashTaskRow(t, "곧 마감되는 일이 없습니다."))
  );
  fillWidget(
    "dashWeek", "dashWeekCount", tasksWeek.length,
    tasksWeek.map(t => dashTaskRow(t, "이번 주 일정이 없습니다."))
  );
  fillWidget(
    "dashProjects", "dashProjectsCount", projectsActive.length,
    projectsActive.map(p => dashProjectRow(p)),
    "진행 중인 프로젝트가 없습니다."
  );
  fillWidget(
    "dashInbox", "dashInboxCount", STATE.inbox.length,
    STATE.inbox.slice(0, 8).map(i => dashInboxRow(i)),
    "받은 메모가 비어있어요."
  );
  fillWidget(
    "dashLogs", null, null,
    STATE.dailyLogs.slice(0, 5).map(l => dashLogRow(l)),
    "아직 작성한 로그가 없어요."
  );

  // Dashboard click 핸들러
  document.querySelectorAll("#dashToday .dash-item, #dashUpcoming .dash-item, #dashWeek .dash-item")
    .forEach(el => el.addEventListener("click", () => {
      setTab("tasks");
      setTimeout(() => openTaskModal(Number(el.dataset.id)), 50);
    }));
  document.querySelectorAll("#dashProjects .dash-project")
    .forEach(el => el.addEventListener("click", () => {
      setTab("projects");
      setTimeout(() => openProjectModal(Number(el.dataset.id)), 50);
    }));
  document.querySelectorAll("#dashInbox .dash-inbox-item")
    .forEach(el => el.addEventListener("click", () => setTab("inbox")));
  document.querySelectorAll("#dashLogs .dash-log")
    .forEach(el => el.addEventListener("click", () => {
      STATE.dailyDate = el.dataset.date;
      setTab("daily");
    }));
}

function fillWidget(bodyId, countId, count, items, emptyMsg) {
  const body = document.getElementById(bodyId);
  if (countId) {
    const c = document.getElementById(countId);
    if (c) c.textContent = count ?? items.length;
  }
  if (!items.length) {
    body.innerHTML = `<div class="widget-empty">${emptyMsg || "비어있어요."}</div>`;
  } else {
    body.innerHTML = items.join("");
  }
}

function dashTaskRow(t) {
  const cat = STATE.categories.find(c => c.name === t.category);
  const dot = cat ? `<span class="di-cat-dot" style="background:${escapeAttr(cat.color)}"></span>` : "";
  const due = dueDisplay(t.due_date);
  const dueClass = due.urgency ? `is-${due.urgency}` : "";
  return `<div class="dash-item" data-id="${t.id}">
    ${dot}
    <span class="di-title">${escapeHtml(t.title)}</span>
    <span class="di-due ${dueClass}">${due.label}</span>
  </div>`;
}

function dashProjectRow(p) {
  const pct = (p.progress_pct ?? 0) > 0 ? p.progress_pct : (p.computed_progress ?? 0);
  const dd = dDayInfo(p.end_date);
  return `<div class="dash-project" data-id="${p.id}">
    <div class="dp-name">
      <span class="dp-color-dot" style="background:${escapeAttr(p.color || COLOR_FALLBACK)}"></span>
      ${escapeHtml(p.name)}
      ${dd ? `<span class="pc-dday pc-dday-sm ${dd.urgency}">${dd.label}</span>` : ""}
    </div>
    <div class="dp-bar">
      <div class="dp-fill" style="width:${pct}%;background:${escapeAttr(p.color || COLOR_FALLBACK)}"></div>
    </div>
    <div class="dp-meta">
      <span>${pct}%</span>
      <span>${p.done_count ?? 0} / ${p.task_count ?? 0} 완료</span>
    </div>
  </div>`;
}

function dashInboxRow(i) {
  const ago = relativeTime(i.created_at);
  return `<div class="dash-inbox-item" data-id="${i.id}">
    <span class="dii-text">${escapeHtml(i.content)}</span>
    <span class="dii-time">${ago}</span>
  </div>`;
}

function dashLogRow(l) {
  const date = formatDateLong(l.log_date);
  return `<div class="dash-log" data-date="${escapeAttr(l.log_date)}">
    <div class="dl-date">${date}</div>
    <div class="dl-preview">${escapeHtml(l.content || "(빈 로그)")}</div>
  </div>`;
}

// ════════════════════════════════════════════════════════
// 2) INBOX
// ════════════════════════════════════════════════════════
function renderInbox() {
  document.querySelectorAll(".inbox-tab").forEach(b => {
    b.classList.toggle("is-active", b.dataset.inboxTab === STATE.inboxFilter);
  });
  // AI 바: 미처리 탭 + 항목 1개 이상일 때만 노출
  const aiBar = document.getElementById("inboxAiBar");
  if (aiBar) {
    const showBar = STATE.inboxFilter === "active" && STATE.inbox.length > 0;
    aiBar.hidden = !showBar;
    if (showBar) {
      const btn = document.getElementById("inboxAiBtn");
      const noSugCount = STATE.inbox.filter(i => !STATE.inboxSuggestions[i.id]).length;
      if (btn) {
        const lbl = btn.querySelector(".btn-ai-label");
        if (lbl) lbl.textContent = noSugCount > 0
          ? `AI로 정리 (${noSugCount}개)`
          : "전부 분석됨";
        btn.disabled = STATE.aiBusy || noSugCount === 0;
      }
    }
  }
  const list = document.getElementById("inboxList");
  if (!STATE.inbox.length) {
    list.innerHTML = `<div class="widget-empty">${
      STATE.inboxFilter === "active"
        ? "받은 메모가 비어있어요. 위 입력창에 떠오르는 대로 적어두세요."
        : "처리된 메모가 없습니다."
    }</div>`;
    return;
  }
  list.innerHTML = STATE.inbox.map(i => inboxItemHtml(i)).join("");
  list.querySelectorAll("[data-action='delete']").forEach(btn => {
    btn.addEventListener("click", () => deleteInbox(Number(btn.dataset.id)));
  });
  list.querySelectorAll("[data-action='processed']").forEach(btn => {
    btn.addEventListener("click", () => toggleInboxProcessed(Number(btn.dataset.id), true));
  });
  list.querySelectorAll("[data-action='unprocess']").forEach(btn => {
    btn.addEventListener("click", () => toggleInboxProcessed(Number(btn.dataset.id), false));
  });
  list.querySelectorAll("[data-action='promote']").forEach(btn => {
    btn.addEventListener("click", () => openPromoteModal(Number(btn.dataset.id)));
  });
  list.querySelectorAll("[data-action='ai-classify-one']").forEach(btn => {
    btn.addEventListener("click", () => aiClassifyOne(Number(btn.dataset.id)));
  });
  list.querySelectorAll("[data-action='ai-apply']").forEach(btn => {
    btn.addEventListener("click", () => aiApplySuggestion(Number(btn.dataset.id)));
  });
  list.querySelectorAll("[data-action='ai-dismiss']").forEach(btn => {
    btn.addEventListener("click", () => aiDismissSuggestion(Number(btn.dataset.id)));
  });
}

function inboxItemHtml(i) {
  const ago = relativeTime(i.created_at);
  const processed = i.processed
    ? `<small>처리됨 · ${relativeTime(i.processed_at) || ""}</small>`
    : `<small>${ago}</small>`;
  const sug = !i.processed ? STATE.inboxSuggestions[i.id] : null;
  const actions = i.processed
    ? `
      <button class="ii-btn" data-action="unprocess" data-id="${i.id}">되돌리기</button>
      <button class="ii-btn is-danger" data-action="delete" data-id="${i.id}">삭제</button>
    `
    : `
      <button class="ii-btn is-primary" data-action="promote" data-id="${i.id}">할 일로</button>
      ${sug ? "" : `<button class="ii-btn" data-action="ai-classify-one" data-id="${i.id}" title="이 메모만 AI로 분류">✨ AI</button>`}
      <button class="ii-btn" data-action="processed" data-id="${i.id}">처리됨</button>
      <button class="ii-btn is-danger" data-action="delete" data-id="${i.id}">삭제</button>
    `;
  return `
    <div class="inbox-item ${i.processed ? "is-processed" : ""}">
      <div>
        <div class="ii-content">${escapeHtml(i.content)}</div>
        ${processed}
        ${sug ? aiSuggestionHtml(i, sug) : ""}
      </div>
      <div class="ii-actions">${actions}</div>
    </div>
  `;
}

function aiSuggestionHtml(inboxItem, sug) {
  const rows = [];
  if (sug.suggested_title && sug.suggested_title !== inboxItem.content) {
    rows.push(`<span class="ai-suggestion-row"><span class="ais-label">제목</span><span class="ais-val">${escapeHtml(sug.suggested_title)}</span></span>`);
  }
  if (sug.suggested_category) {
    const color = getCategoryColor(sug.suggested_category);
    rows.push(`<span class="ai-suggestion-row" style="border-color:${escapeAttr(color)};"><span class="ais-label">카테고리</span><span class="ais-val">${escapeHtml(sug.suggested_category)}</span></span>`);
  }
  if (sug.suggested_priority) {
    rows.push(`<span class="ai-suggestion-row"><span class="ais-label">우선순위</span><span class="ais-val">${priorityIcon(sug.suggested_priority)}${PRIORITY_LABEL[sug.suggested_priority] || sug.suggested_priority}</span></span>`);
  }
  if ((sug.suggested_tags || []).length) {
    rows.push(`<span class="ai-suggestion-row"><span class="ais-label">태그</span><span class="ais-val">${sug.suggested_tags.map(t => `#${escapeHtml(t)}`).join(" ")}</span></span>`);
  }
  const cachedBadge = sug.cached ? `<span class="ais-label" style="margin-left:auto;">(캐시)</span>` : "";
  return `
    <div class="ai-suggestion">
      <div class="ai-suggestion-head">
        ✨ AI 제안 ${cachedBadge}
      </div>
      <div class="ai-suggestion-body">
        ${rows.join("")}
      </div>
      <div class="ai-suggestion-foot">
        <button class="ii-btn" data-action="ai-dismiss" data-id="${inboxItem.id}">무시</button>
        <button class="ii-btn is-primary" data-action="ai-apply" data-id="${inboxItem.id}">적용</button>
      </div>
    </div>
  `;
}

async function addInbox(content) {
  if (!content.trim()) return;
  try {
    const created = await api("POST", "/api/me/inbox", { content: content.trim() });
    STATE.inbox.unshift(created);
    if (STATE.tab === "dashboard") renderDashboard();
    else if (STATE.tab === "inbox" && STATE.inboxFilter === "active") renderInbox();
    showToast("담아뒀어요");
  } catch (e) { showToast(e.message, true); }
}

// 자연어 파싱: "내일 오후 3시 회의" → {type:"task", title:"회의 (15:00)", due_date:"2026-05-15"}
// 날짜/시간 표현이 없으면 {type:"memo"} 반환 → 기존 Inbox 흐름.
function parseNL(rawText) {
  const text = (rawText || "").trim();
  if (!text) return null;

  let working = " " + text + " ";
  let dueDate = null;
  let timeStr = null;
  let matched = false;

  const now = new Date();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  // 1) 절대 날짜: M월 D일
  let m = working.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) {
    let y = now.getFullYear();
    const candidate = new Date(y, +m[1] - 1, +m[2]);
    if (candidate < startOfDay(now)) y++;
    dueDate = new Date(y, +m[1] - 1, +m[2]);
    working = working.replace(m[0], " ");
    matched = true;
  } else if ((m = working.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})(?=\s|$)/))) {
    let y = now.getFullYear();
    const candidate = new Date(y, +m[1] - 1, +m[2]);
    if (candidate < startOfDay(now)) y++;
    dueDate = new Date(y, +m[1] - 1, +m[2]);
    working = working.replace(m[0], " ");
    matched = true;
  }

  // 2) 상대 날짜
  if (!dueDate) {
    const rel = [
      [/오늘/, 0], [/내일/, 1], [/모레/, 2], [/글피/, 3]
    ];
    for (const [re, n] of rel) {
      if (re.test(working)) {
        dueDate = addDays(startOfDay(now), n);
        working = working.replace(re, " ");
        matched = true;
        break;
      }
    }
  }

  // 3) N일/N주 후|뒤
  if (!dueDate) {
    if ((m = working.match(/(\d+)\s*일\s*(?:후|뒤)/))) {
      dueDate = addDays(startOfDay(now), +m[1]);
      working = working.replace(m[0], " ");
      matched = true;
    } else if ((m = working.match(/(\d+)\s*주\s*(?:후|뒤)/))) {
      dueDate = addDays(startOfDay(now), +m[1] * 7);
      working = working.replace(m[0], " ");
      matched = true;
    }
  }

  // 4) (다음주|이번주)? + 요일
  const dowMap = { "일":0, "월":1, "화":2, "수":3, "목":4, "금":5, "토":6 };
  if (!dueDate) {
    if ((m = working.match(/(다음주|담주|이번주|금주)\s*([일월화수목금토])요일?/))) {
      const todayDow = now.getDay();
      let diff = dowMap[m[2]] - todayDow;
      if (m[1] === "다음주" || m[1] === "담주") {
        if (diff <= 0) diff += 7;
        diff += 7;
      } else {
        if (diff < 0) diff += 7;
      }
      dueDate = addDays(startOfDay(now), diff);
      working = working.replace(m[0], " ");
      matched = true;
    } else if ((m = working.match(/([일월화수목금토])요일/))) {
      const todayDow = now.getDay();
      let diff = dowMap[m[1]] - todayDow;
      if (diff <= 0) diff += 7;
      dueDate = addDays(startOfDay(now), diff);
      working = working.replace(m[0], " ");
      matched = true;
    }
  }

  // 5) 시간: 오전/오후 N시 (M분)? / HH:MM
  let m2 = working.match(/(오전|오후|아침|저녁|밤)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분)?/);
  if (m2) {
    let hr = +m2[2];
    const min = m2[3] ? +m2[3] : 0;
    if (/오후|저녁|밤/.test(m2[1] || "") && hr < 12) hr += 12;
    if (/오전|아침/.test(m2[1] || "") && hr === 12) hr = 0;
    if (hr <= 23 && min <= 59) {
      timeStr = `${String(hr).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
      working = working.replace(m2[0], " ");
      matched = true;
    }
  } else if ((m2 = working.match(/(?:^|\s)(\d{1,2}):(\d{2})(?=\s|$)/))) {
    const hr = +m2[1], min = +m2[2];
    if (hr <= 23 && min <= 59) {
      timeStr = `${String(hr).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
      working = working.replace(m2[0], " ");
      matched = true;
    }
  }

  let title = working.replace(/\s+/g, " ").trim();

  // 날짜는 있고 제목이 비었으면 → 의미 없는 task → memo 로 폴백
  if (dueDate && !title) return { type: "memo" };

  if (dueDate) {
    const displayTitle = timeStr ? `${title} (${timeStr})` : title;
    return {
      type: "task",
      title: displayTitle,
      due_date: dateOnly(dueDate),
      time: timeStr,
      preview: `${formatDateLong(dateOnly(dueDate))}${timeStr ? ` ${timeStr}` : ""} · ${title}`
    };
  }

  // 시간만 있는 경우 → 오늘 일정으로 해석
  if (timeStr && title) {
    return {
      type: "task",
      title: `${title} (${timeStr})`,
      due_date: dateOnly(startOfDay(now)),
      time: timeStr,
      preview: `오늘 ${timeStr} · ${title}`
    };
  }

  return { type: "memo" };
}

async function addTaskFromNL(parsed) {
  const payload = {
    title: parsed.title,
    due_date: parsed.due_date,
    status: "todo",
    priority: "medium",
    category: null,
    project_id: null,
    tags: [],
    notes: "",
  };
  try {
    const created = await api("POST", "/api/me/tasks", payload);
    STATE.tasks.unshift(created);
    if (STATE.tab === "dashboard") renderDashboard();
    else if (STATE.tab === "tasks") renderTasks();
    showToast(`할 일 추가 · ${parsed.preview}`);
  } catch (e) { showToast(e.message, true); }
}

async function deleteInbox(id) {
  if (!confirm("이 메모를 삭제할까요?")) return;
  try {
    await api("DELETE", `/api/me/inbox/${id}`);
    STATE.inbox = STATE.inbox.filter(i => i.id !== id);
    renderAll();
    showToast("삭제됨");
  } catch (e) { showToast(e.message, true); }
}

// ── Phase 6d: AI Inbox 분류 ──────────────────────────────
async function aiClassifyBulk() {
  if (STATE.aiBusy) return;
  const targets = STATE.inbox.filter(i => !i.processed && !STATE.inboxSuggestions[i.id]);
  if (!targets.length) {
    showToast("이미 모두 분석됐어요");
    return;
  }
  STATE.aiBusy = true;
  setAiBusy(true);
  try {
    const data = await api("POST", "/api/me/inbox/bulk-ai-classify");
    const results = data.results || [];
    let added = 0;
    results.forEach(r => {
      if (!r || !r.inbox_id) return;
      STATE.inboxSuggestions[r.inbox_id] = {
        suggested_title: r.suggested_title || "",
        suggested_category: r.suggested_category || null,
        suggested_priority: r.suggested_priority || "medium",
        suggested_tags: r.suggested_tags || [],
        cached: !!r.cached,
        error: r.error || null,
      };
      added++;
    });
    renderInbox();
    if (added) showToast(`${added}건 분석 완료 — 각 메모 아래 제안 확인`);
    else showToast("분석 결과가 없어요", true);
  } catch (e) {
    showToast(e.message, true);
  } finally {
    STATE.aiBusy = false;
    setAiBusy(false);
  }
}

async function aiClassifyOne(inboxId) {
  if (STATE.aiBusy) return;
  STATE.aiBusy = true;
  setAiBusy(true);
  try {
    const r = await api("POST", `/api/me/inbox/${inboxId}/ai-classify`);
    STATE.inboxSuggestions[inboxId] = {
      suggested_title: r.suggested_title || "",
      suggested_category: r.suggested_category || null,
      suggested_priority: r.suggested_priority || "medium",
      suggested_tags: r.suggested_tags || [],
      cached: !!r.cached,
    };
    renderInbox();
  } catch (e) {
    showToast(e.message, true);
  } finally {
    STATE.aiBusy = false;
    setAiBusy(false);
  }
}

function aiDismissSuggestion(inboxId) {
  delete STATE.inboxSuggestions[inboxId];
  renderInbox();
}

async function aiApplySuggestion(inboxId) {
  const sug = STATE.inboxSuggestions[inboxId];
  const item = STATE.inbox.find(i => i.id === inboxId);
  if (!sug || !item) return;
  const payload = {
    title: (sug.suggested_title || item.content || "").slice(0, 200),
    category: sug.suggested_category || null,
    priority: sug.suggested_priority || "medium",
    project_id: null,
    due_date: null,
  };
  try {
    const result = await api("POST", `/api/me/inbox/${inboxId}/promote`, payload);
    // 태그 제안이 있으면 새 task에 PATCH로 붙이기
    if (result.task && (sug.suggested_tags || []).length) {
      try {
        const upd = await api("PATCH", `/api/me/tasks/${result.task.id}`, {
          tags: sug.suggested_tags.slice(0, 5),
        });
        Object.assign(result.task, upd);
      } catch (_) { /* 태그 실패는 무시 */ }
    }
    if (result.task) STATE.tasks.unshift(result.task);
    STATE.inbox = STATE.inbox.filter(i => i.id !== inboxId);
    delete STATE.inboxSuggestions[inboxId];
    renderAll();
    showToast("AI 제안으로 할 일 생성");
  } catch (e) { showToast(e.message, true); }
}

function setAiBusy(busy) {
  const btn = document.getElementById("inboxAiBtn");
  if (!btn) return;
  if (busy) {
    btn.disabled = true;
    const lbl = btn.querySelector(".btn-ai-label");
    if (lbl) lbl.innerHTML = `<span class="btn-ai-spinner"></span> 분석 중...`;
  } else {
    btn.disabled = false;
    const lbl = btn.querySelector(".btn-ai-label");
    if (lbl) lbl.textContent = "AI로 정리";
  }
}

async function toggleInboxProcessed(id, processed) {
  try {
    const updated = await api("PATCH", `/api/me/inbox/${id}`, { processed });
    if (STATE.tab === "inbox") {
      // 현재 필터에 안 맞으면 리스트에서 제거
      const matchesFilter = (STATE.inboxFilter === "processed") === !!processed;
      if (matchesFilter) {
        const idx = STATE.inbox.findIndex(i => i.id === id);
        if (idx >= 0) STATE.inbox[idx] = updated;
      } else {
        STATE.inbox = STATE.inbox.filter(i => i.id !== id);
      }
    } else {
      STATE.inbox = STATE.inbox.filter(i => i.id !== id);
    }
    renderAll();
  } catch (e) { showToast(e.message, true); }
}

// ── Promote 모달 ─────────────────────────────────────────
function openPromoteModal(inboxId) {
  const item = STATE.inbox.find(i => i.id === inboxId);
  if (!item) return;
  STATE.promotingInboxId = inboxId;
  document.getElementById("promoteInboxId").value = inboxId;
  document.getElementById("promoteTitle").value = item.content.slice(0, 200);
  document.getElementById("promoteCategory").value = "";
  document.getElementById("promoteProject").value = "";
  document.getElementById("promotePriority").value = "medium";
  document.getElementById("promoteDueDate").value = "";
  // 카테고리/프로젝트 옵션 채우기
  fillSelectOptions(
    "promoteCategory", "(없음)",
    STATE.categories.map(c => ({ value: c.name, label: c.name }))
  );
  fillSelectOptions(
    "promoteProject", "(없음)",
    STATE.projects.map(p => ({ value: String(p.id), label: p.name }))
  );
  document.getElementById("promoteModal").hidden = false;
  setTimeout(() => document.getElementById("promoteTitle").focus(), 0);
}

function closePromoteModal() {
  document.getElementById("promoteModal").hidden = true;
  STATE.promotingInboxId = null;
}

async function submitPromote() {
  const id = STATE.promotingInboxId;
  if (!id) return;
  const payload = {
    title: document.getElementById("promoteTitle").value.trim(),
    category: document.getElementById("promoteCategory").value || null,
    project_id: parseIntOrNull(document.getElementById("promoteProject").value),
    priority: document.getElementById("promotePriority").value,
    due_date: document.getElementById("promoteDueDate").value || null,
  };
  if (!payload.title) return;
  try {
    const result = await api("POST", `/api/me/inbox/${id}/promote`, payload);
    if (result.task) STATE.tasks.unshift(result.task);
    STATE.inbox = STATE.inbox.filter(i => i.id !== id);
    closePromoteModal();
    renderAll();
    showToast("할 일로 옮겼어요");
  } catch (e) { showToast(e.message, true); }
}

// ════════════════════════════════════════════════════════
// 3) TASKS (기존 리스트/칸반)
// ════════════════════════════════════════════════════════
function renderTasks() {
  renderCategoryChips();
  if (STATE.view === "list") renderList();
  else renderKanban();
}

function renderCategoryChips() {
  const wrap = document.getElementById("categoryChips");
  const chips = [
    { name: null, label: "전체", count: STATE.tasks.length, color: null },
    ...STATE.categories.map(c => ({
      name: c.name, label: c.name, color: c.color,
      count: STATE.tasks.filter(t => t.category === c.name).length,
    })),
    {
      name: "__none__", label: "미분류",
      count: STATE.tasks.filter(t => !t.category).length, color: null,
    },
  ];
  wrap.innerHTML = chips.map(c => `
    <button class="chip ${STATE.filterCategory === c.name ? "is-active" : ""}"
            data-cat="${c.name === null ? "" : escapeAttr(c.name)}">
      ${c.color ? `<span class="chip-dot" style="background:${escapeAttr(c.color)}"></span>` : ""}
      ${escapeHtml(c.label)} <span style="opacity:0.6;">${c.count}</span>
    </button>
  `).join("");
  wrap.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const raw = btn.getAttribute("data-cat");
      STATE.filterCategory = raw === "" ? null : raw;
      renderTasks();
    });
  });
}

function renderCategoryOptions() {
  ["taskCategory", "promoteCategory"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    fillSelectOptions(
      id, "(없음)",
      STATE.categories.map(c => ({ value: c.name, label: c.name }))
    );
    if (current) sel.value = current;
  });
}

function renderProjectOptions() {
  ["taskProject", "promoteProject"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    fillSelectOptions(
      id, "(없음)",
      STATE.projects.map(p => ({ value: String(p.id), label: p.name }))
    );
    if (current) sel.value = current;
  });
}

function fillSelectOptions(selectId, noneLabel, items) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">${escapeHtml(noneLabel)}</option>` +
    items.map(it => `<option value="${escapeAttr(it.value)}">${escapeHtml(it.label)}</option>`).join("");
}

function filteredTasks() {
  let tasks = STATE.tasks.slice();
  if (STATE.filterCategory !== null) {
    if (STATE.filterCategory === "__none__") tasks = tasks.filter(t => !t.category);
    else tasks = tasks.filter(t => t.category === STATE.filterCategory);
  }
  if (STATE.search) {
    const q = STATE.search.toLowerCase();
    tasks = tasks.filter(t =>
      (t.title || "").toLowerCase().includes(q) ||
      (t.notes || "").toLowerCase().includes(q) ||
      (t.tags || []).some(tag => (tag || "").toLowerCase().includes(q))
    );
  }
  switch (STATE.sort) {
    case "due_asc":
      tasks.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
      break;
    case "priority":
      tasks.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
      break;
    case "title":
      tasks.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "created_desc":
    default:
      tasks.sort((a, b) => (b.id || 0) - (a.id || 0));
  }
  return tasks;
}

function renderList() {
  document.getElementById("viewList").hidden = false;
  document.getElementById("viewKanban").hidden = true;

  const stack = document.getElementById("listStack");
  const tasks = filteredTasks();
  if (tasks.length === 0) {
    stack.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <div>업무가 없습니다. 우측 하단 ＋ 버튼으로 추가해보세요.</div>
    </div>`;
    return;
  }
  stack.innerHTML = tasks.map(t => listRowHtml(t)).join("");
  stack.querySelectorAll(".list-row").forEach(row => {
    row.addEventListener("click", e => {
      if (e.target.closest(".row-check")) return;
      openTaskModal(Number(row.dataset.id));
    });
  });
  stack.querySelectorAll(".row-check").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const id = Number(btn.closest(".list-row").dataset.id);
      const t = STATE.tasks.find(x => x.id === id);
      if (!t) return;
      const next = t.status === "done" ? "todo" : "done";
      try {
        const updated = await api("PATCH", `/api/me/tasks/${id}`, { status: next });
        Object.assign(t, updated);
        renderAll();
      } catch (e) { showToast(e.message, true); }
    });
  });
}

function getCategoryColor(name) {
  const c = STATE.categories.find(c => c.name === name);
  return c?.color || COLOR_FALLBACK;
}

function listRowHtml(t) {
  const cat = t.category || null;
  const catColor = cat ? getCategoryColor(cat) : "#475569";
  const due = dueDisplay(t.due_date);
  const dueClass = due.urgency ? `is-${due.urgency}` : "";
  const rowUrgency = t.status !== "done" && due.urgency ? `is-urgent-${due.urgency}` : "";
  const prioHigh = t.priority === "high" && t.status !== "done" ? "is-prio-high" : "";
  return `
    <div class="list-row ${t.status === "done" ? "is-done" : ""} ${rowUrgency} ${prioHigh}" data-id="${t.id}">
      <button class="row-check ${t.status === "done" ? "is-checked" : ""}">✓</button>
      <div class="row-main">
        <div class="row-title">${escapeHtml(t.title)}</div>
        <div class="row-meta">
          ${t.status !== "todo" && t.status !== "done" ? `<span>${STATUS_LABEL[t.status]}</span>` : ""}
          ${(t.tags || []).map(tag => `<span class="row-tag">#${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      ${cat ? `<span class="row-category" style="background:${hexToBg(catColor)};color:${catColor}">${escapeHtml(cat)}</span>` : `<span></span>`}
      <span class="row-priority priority-${t.priority}">${priorityIcon(t.priority)}${PRIORITY_LABEL[t.priority]}</span>
      <span class="row-due ${dueClass}">${due.label}</span>
    </div>
  `;
}

function priorityIcon(p) {
  if (p === "high") return `<span class="prio-icon">🔥</span>`;
  if (p === "medium") return `<span class="prio-icon">●</span>`;
  return `<span class="prio-icon">○</span>`;
}

function dueDisplay(dateStr) {
  if (!dateStr) return { label: "-", urgency: "" };
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d - today) / (24*3600*1000));
  let label;
  if (diff === 0) label = "오늘";
  else if (diff === 1) label = "내일";
  else if (diff === -1) label = "어제";
  else if (diff > 0 && diff < 7) label = `D-${diff}`;
  else if (diff < 0) label = `D+${-diff}`;
  else label = `${d.getMonth()+1}/${d.getDate()}`;
  let urgency = "";
  if (diff < 0) urgency = "overdue";
  else if (diff === 0) urgency = "today";
  return { label, urgency };
}

function renderKanban() {
  document.getElementById("viewList").hidden = true;
  document.getElementById("viewKanban").hidden = false;
  const tasks = filteredTasks();
  ["todo","in_progress","waiting","done"].forEach(status => {
    const list = document.querySelector(`.kanban-list[data-drop="${status}"]`);
    const items = tasks.filter(t => t.status === status);
    document.querySelector(`[data-count="${status}"]`).textContent = items.length;
    list.innerHTML = items.map(t => kanbanCardHtml(t)).join("") || "";
  });
  bindKanbanDnD();
}

function kanbanCardHtml(t) {
  const cat = t.category;
  const catColor = cat ? getCategoryColor(cat) : null;
  const due = dueDisplay(t.due_date);
  const cardUrgency = t.status !== "done" && due.urgency ? `is-urgent-${due.urgency}` : "";
  const prioHigh = t.priority === "high" && t.status !== "done" ? "is-prio-high" : "";
  return `
    <div class="kanban-card ${cardUrgency} ${prioHigh}" draggable="true" data-id="${t.id}">
      <div class="card-title">${escapeHtml(t.title)}</div>
      <div class="card-meta">
        ${cat ? `<span class="row-category" style="background:${hexToBg(catColor)};color:${catColor}">${escapeHtml(cat)}</span>` : ""}
        <span class="row-priority priority-${t.priority}">${priorityIcon(t.priority)}${PRIORITY_LABEL[t.priority]}</span>
        ${t.due_date ? `<span class="row-due ${due.urgency ? `is-${due.urgency}` : ""}">${due.label}</span>` : ""}
      </div>
    </div>
  `;
}

function bindKanbanDnD() {
  let draggingId = null;
  document.querySelectorAll(".kanban-card").forEach(card => {
    card.addEventListener("click", () => openTaskModal(Number(card.dataset.id)));
    card.addEventListener("dragstart", e => {
      draggingId = Number(card.dataset.id);
      card.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("is-dragging");
      draggingId = null;
    });
  });
  document.querySelectorAll(".kanban-list").forEach(list => {
    const col = list.closest(".kanban-col");
    list.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      list.classList.add("is-dragover");
      if (col) col.classList.add("is-dragover-col");
    });
    list.addEventListener("dragleave", e => {
      // Only un-mark when leaving the actual list (avoid flicker on children)
      if (!list.contains(e.relatedTarget)) {
        list.classList.remove("is-dragover");
        if (col) col.classList.remove("is-dragover-col");
      }
    });
    list.addEventListener("drop", async e => {
      e.preventDefault();
      list.classList.remove("is-dragover");
      if (col) col.classList.remove("is-dragover-col");
      if (!draggingId) return;
      const newStatus = list.dataset.drop;
      const task = STATE.tasks.find(t => t.id === draggingId);
      if (!task || task.status === newStatus) return;
      try {
        const updated = await api("PATCH", `/api/me/tasks/${draggingId}`, { status: newStatus });
        Object.assign(task, updated);
        renderKanban();
        showToast(`→ ${STATUS_LABEL[newStatus] || newStatus}`);
      } catch (e) { showToast(e.message, true); }
    });
  });
}

// ── Task 모달 ────────────────────────────────────────────
function openTaskModal(taskId) {
  STATE.editingTaskId = taskId || null;
  const t = taskId ? STATE.tasks.find(x => x.id === taskId) : null;
  document.getElementById("taskModalTitle").textContent = t ? "할 일 편집" : "새 할 일";
  document.getElementById("taskId").value = t?.id || "";
  document.getElementById("taskTitle").value = t?.title || "";
  document.getElementById("taskCategory").value = t?.category || "";
  document.getElementById("taskProject").value = t?.project_id ? String(t.project_id) : "";
  document.getElementById("taskStatus").value = t?.status || "todo";
  document.getElementById("taskPriority").value = t?.priority || "medium";
  document.getElementById("taskDueDate").value = t?.due_date || "";
  document.getElementById("taskTags").value = (t?.tags || []).join(", ");
  document.getElementById("taskNotes").value = t?.notes || "";
  document.getElementById("deleteTaskBtn").hidden = !t;
  document.getElementById("taskModal").hidden = false;
  setTimeout(() => document.getElementById("taskTitle").focus(), 0);
}

function closeTaskModal() {
  document.getElementById("taskModal").hidden = true;
  STATE.editingTaskId = null;
}

// ════════════════════════════════════════════════════════
// 4) PROJECTS
// ════════════════════════════════════════════════════════
function renderProjects() {
  const grid = document.getElementById("projectGrid");
  if (!STATE.projects.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📁</div>
      <div>아직 프로젝트가 없습니다. 우측 상단 "＋ 새 프로젝트"로 시작해보세요.</div>
    </div>`;
    return;
  }
  grid.innerHTML = STATE.projects.map(p => projectCardHtml(p)).join("");
  grid.querySelectorAll(".project-card").forEach(card => {
    card.addEventListener("click", () => openProjectModal(Number(card.dataset.id)));
  });
}

function projectCardHtml(p) {
  const pct = (p.progress_pct ?? 0) > 0 ? p.progress_pct : (p.computed_progress ?? 0);
  const dd = dDayInfo(p.end_date);
  const projTasks = STATE.tasks.filter(t => t.project_id === p.id);
  const openTasks = projTasks.filter(t => t.status !== "done");
  const nextAction = pickNextAction(openTasks);
  const recentTask = pickRecent(projTasks);
  const tags = collectTopTags(projTasks, 3);
  const dateRange = p.start_date || p.end_date
    ? `${p.start_date || "?"} ~ ${p.end_date || "?"}`
    : "기간 미설정";

  const ddayHtml = dd
    ? `<span class="pc-dday ${dd.urgency}">${dd.label}</span>`
    : "";

  const nextActionHtml = nextAction
    ? `<div class="pc-next-action">
         <span class="pc-next-label">다음 액션</span>
         <span class="pc-next-title">${escapeHtml(nextAction.title)}</span>
         ${nextAction.due_date
           ? `<span class="pc-next-due ${dueDisplay(nextAction.due_date).urgency ? `is-${dueDisplay(nextAction.due_date).urgency}` : ""}">${dueDisplay(nextAction.due_date).label}</span>`
           : ""}
       </div>`
    : openTasks.length === 0 && projTasks.length > 0
      ? `<div class="pc-next-action is-empty">모든 할 일 완료 🎉</div>`
      : `<div class="pc-next-action is-empty">아직 연결된 할 일이 없습니다</div>`;

  const tagsHtml = tags.length
    ? `<div class="pc-tags">${tags.map(t => `<span class="pc-tag">#${escapeHtml(t)}</span>`).join("")}</div>`
    : "";

  const recentHtml = recentTask
    ? `<span class="pc-recent" title="${escapeAttr(recentTask.title)}">최근 · ${relativeTime(recentTask.updated_at || recentTask.created_at)}</span>`
    : "";

  return `
    <div class="project-card" data-id="${p.id}" style="--proj-color:${escapeAttr(p.color || COLOR_FALLBACK)}">
      <div class="pc-head">
        <div class="pc-name">${escapeHtml(p.name)}</div>
        ${ddayHtml}
        <span class="pc-status s-${p.status}">${PROJECT_STATUS_LABEL[p.status] || p.status}</span>
      </div>
      ${p.description ? `<div class="pc-desc">${escapeHtml(p.description)}</div>` : ""}
      ${nextActionHtml}
      <div class="pc-bar"><div class="pc-fill" style="width:${pct}%"></div></div>
      <div class="pc-meta">
        <span class="pc-progress"><strong>${pct}%</strong> · ${p.done_count ?? 0}/${p.task_count ?? 0} 완료</span>
        <span class="pc-range">${dateRange}</span>
      </div>
      ${tags.length || recentTask ? `<div class="pc-foot">${tagsHtml}${recentHtml}</div>` : ""}
    </div>
  `;
}

function dDayInfo(endDateStr) {
  if (!endDateStr) return null;
  const today = startOfDay(new Date());
  const d = new Date(endDateStr + "T00:00:00");
  const diff = Math.round((d - today) / (24 * 3600 * 1000));
  let label, urgency = "";
  if (diff === 0) { label = "D-DAY"; urgency = "is-today"; }
  else if (diff > 0) {
    label = `D-${diff}`;
    if (diff <= 7) urgency = "is-soon";
  }
  else { label = `D+${-diff}`; urgency = "is-overdue"; }
  return { label, urgency };
}

function pickNextAction(openTasks) {
  if (!openTasks.length) return null;
  const sorted = openTasks.slice().sort((a, b) => {
    const aDue = a.due_date || "9999-12-31";
    const bDue = b.due_date || "9999-12-31";
    if (aDue !== bDue) return aDue.localeCompare(bDue);
    return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
  });
  return sorted[0];
}

function pickRecent(tasks) {
  if (!tasks.length) return null;
  return tasks.slice().sort((a, b) =>
    (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || "")
  )[0];
}

function collectTopTags(tasks, max) {
  const counts = new Map();
  tasks.forEach(t => (t.tags || []).forEach(tag => {
    if (!tag) return;
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([tag]) => tag);
}

function openProjectModal(projectId) {
  STATE.editingProjectId = projectId || null;
  const p = projectId ? STATE.projects.find(x => x.id === projectId) : null;
  document.getElementById("projectModalTitle").textContent = p ? "프로젝트 편집" : "새 프로젝트";
  document.getElementById("projectId").value = p?.id || "";
  document.getElementById("projectName").value = p?.name || "";
  document.getElementById("projectDescription").value = p?.description || "";
  document.getElementById("projectStatus").value = p?.status || "active";
  document.getElementById("projectColor").value = p?.color || "#6366f1";
  document.getElementById("projectStartDate").value = p?.start_date || "";
  document.getElementById("projectEndDate").value = p?.end_date || "";
  document.getElementById("projectProgress").value = p?.progress_pct || "";
  document.getElementById("projectNotes").value = p?.notes || "";
  document.getElementById("deleteProjectBtn").hidden = !p;
  document.getElementById("projectModal").hidden = false;
  setTimeout(() => document.getElementById("projectName").focus(), 0);
}

function closeProjectModal() {
  document.getElementById("projectModal").hidden = true;
  STATE.editingProjectId = null;
}

// ════════════════════════════════════════════════════════
// 5) CALENDAR (월간)
// ════════════════════════════════════════════════════════
function renderCalendar() {
  if (!STATE.calCursor) STATE.calCursor = startOfMonth(new Date());
  const cur = STATE.calCursor;
  document.getElementById("calMonthLabel").textContent =
    `${cur.getFullYear()}년 ${cur.getMonth() + 1}월`;

  const grid = document.getElementById("calGrid");
  const firstDay = new Date(cur.getFullYear(), cur.getMonth(), 1);
  const startWeekDay = firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(1 - startWeekDay);

  const today = startOfDay(new Date());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const isOther = d.getMonth() !== cur.getMonth();
    const isToday = d.getTime() === today.getTime();
    const dateStr = dateOnly(d);
    const events = collectCalendarEvents(dateStr);
    const evHtml = events.slice(0, 4).map(e =>
      `<div class="cal-event ${e.cls}" title="${escapeAttr(e.title)}">${escapeHtml(e.title)}</div>`
    ).join("");
    const more = events.length > 4
      ? `<div class="cal-event" style="opacity:0.7;">+${events.length - 4}</div>` : "";
    cells.push(`
      <div class="cal-cell ${isOther ? "is-other-month" : ""} ${isToday ? "is-today" : ""}"
           data-date="${dateStr}">
        <div class="cal-day">${d.getDate()}</div>
        <div class="cal-events">${evHtml}${more}</div>
      </div>
    `);
  }
  grid.innerHTML = cells.join("");
  grid.querySelectorAll(".cal-cell").forEach(cell => {
    cell.addEventListener("click", () => {
      // 클릭 → daily 탭으로 + 해당 날짜
      STATE.dailyDate = cell.dataset.date;
      setTab("daily");
    });
  });
}

function collectCalendarEvents(dateStr) {
  const events = [];
  STATE.tasks.forEach(t => {
    if (t.due_date === dateStr) {
      events.push({ title: `📋 ${t.title}`, cls: "is-task" });
    }
  });
  STATE.projects.forEach(p => {
    if (p.start_date === dateStr) {
      events.push({ title: `▶ ${p.name} 시작`, cls: "is-project-start" });
    }
    if (p.end_date === dateStr) {
      events.push({ title: `⏹ ${p.name} 종료`, cls: "is-project-end" });
    }
  });
  return events;
}

// ════════════════════════════════════════════════════════
// 6) GANTT (365일 일단위)
// ════════════════════════════════════════════════════════
function renderGantt() {
  const wrap = document.getElementById("ganttWrap");
  const cellW = STATE.ganttCellW;
  const labelW = 200;
  const today = startOfDay(new Date());

  // 365일 윈도우: 30일 전 ~ 335일 후 (총 365일, 오늘 위치는 31번째)
  const windowStart = new Date(today);
  windowStart.setDate(today.getDate() - 30);
  const totalDays = 365;

  // 행: 진행 중·일시정지·완료 모든 프로젝트 (start/end 있는 것만)
  const projects = STATE.projects.filter(p => p.start_date || p.end_date);

  if (!projects.length) {
    wrap.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📊</div>
      <div>간트차트에 표시할 프로젝트가 없습니다.<br>
      프로젝트의 시작일/종료일을 설정해주세요.</div>
    </div>`;
    return;
  }

  // grid-template-columns 동적 설정
  const tableCols = `${labelW}px repeat(${totalDays}, ${cellW}px)`;

  // 월 라벨 행 (sticky top, 22px)
  let monthRowHtml = `<div class="gantt-month-corner"></div>`;
  let prevMonth = -1;
  let monthSpanStart = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    if (d.getMonth() !== prevMonth) {
      if (prevMonth !== -1) {
        const span = i - monthSpanStart;
        const dStart = new Date(windowStart);
        dStart.setDate(windowStart.getDate() + monthSpanStart);
        monthRowHtml += `<div class="gantt-month-label" style="grid-column: span ${span};">
          ${dStart.getFullYear()}년 ${dStart.getMonth() + 1}월
        </div>`;
      }
      prevMonth = d.getMonth();
      monthSpanStart = i;
    }
  }
  // 마지막 월
  const span = totalDays - monthSpanStart;
  const dStart = new Date(windowStart);
  dStart.setDate(windowStart.getDate() + monthSpanStart);
  monthRowHtml += `<div class="gantt-month-label" style="grid-column: span ${span};">
    ${dStart.getFullYear()}년 ${dStart.getMonth() + 1}월
  </div>`;

  // 일 헤더 행
  let headerRowHtml = `<div class="gantt-header-corner">프로젝트</div>`;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    const isToday = d.getTime() === today.getTime();
    const wd = d.getDay();
    const cls = [
      isToday ? "is-today" : "",
      (wd === 0 || wd === 6) ? "is-weekend" : "",
      wd === 0 ? "is-sunday" : "",
      wd === 6 ? "is-saturday" : "",
    ].join(" ");
    headerRowHtml += `
      <div class="gantt-header-day ${cls}">
        <div class="ghd-day">${d.getDate()}</div>
        <div>${["일","월","화","수","목","금","토"][wd]}</div>
      </div>
    `;
  }

  // 프로젝트 행들
  let bodyHtml = "";
  projects.forEach(p => {
    bodyHtml += `<div class="gantt-row-label">
      <span class="grl-color" style="background:${escapeAttr(p.color || COLOR_FALLBACK)}"></span>
      ${escapeHtml(p.name)}
    </div>`;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(windowStart);
      d.setDate(windowStart.getDate() + i);
      const wd = d.getDay();
      const cls = [
        (wd === 0 || wd === 6) ? "is-weekend" : "",
        d.getDate() === 1 ? "is-month-start" : "",
      ].join(" ");
      bodyHtml += `<div class="gantt-cell ${cls}"></div>`;
    }
  });

  wrap.innerHTML = `
    <div class="gantt-table" style="grid-template-columns: ${tableCols};">
      ${monthRowHtml}
      ${headerRowHtml}
      ${bodyHtml}
    </div>
  `;

  // 막대 + 오늘 세로선 — DOM 위에 absolute 로 그리기
  const table = wrap.querySelector(".gantt-table");
  const headerHeight = 22 + 44; // month row + day row
  const rowH = 44;

  projects.forEach((p, rowIdx) => {
    if (!p.start_date || !p.end_date) {
      // start 만 또는 end 만 있으면 점 하나
      const single = p.start_date || p.end_date;
      const idx = dayIndexFromStart(windowStart, single, totalDays);
      if (idx < 0) return;
      const x = labelW + idx * cellW;
      const y = headerHeight + rowIdx * rowH;
      const bar = document.createElement("div");
      bar.className = "gantt-bar";
      bar.style.left = `${x + 2}px`;
      bar.style.width = `${cellW - 4}px`;
      bar.style.top = `${y + 8}px`;
      bar.style.height = `${rowH - 16}px`;
      bar.style.background = p.color || COLOR_FALLBACK;
      bar.textContent = p.name;
      bar.addEventListener("click", () => openProjectModal(p.id));
      table.appendChild(bar);
      return;
    }
    const startIdx = dayIndexFromStart(windowStart, p.start_date, totalDays);
    const endIdx = dayIndexFromStart(windowStart, p.end_date, totalDays);
    // 윈도우 밖 처리
    const visibleStart = Math.max(0, startIdx);
    const visibleEnd = Math.min(totalDays - 1, endIdx);
    if (visibleEnd < 0 || visibleStart > totalDays - 1 || visibleStart > visibleEnd) return;
    const x = labelW + visibleStart * cellW;
    const w = (visibleEnd - visibleStart + 1) * cellW;
    const y = headerHeight + rowIdx * rowH;
    const bar = document.createElement("div");
    bar.className = `gantt-bar ${p.status === "done" ? "is-done" : ""}`;
    bar.style.left = `${x + 2}px`;
    bar.style.width = `${w - 4}px`;
    bar.style.top = `${y + 8}px`;
    bar.style.height = `${rowH - 16}px`;
    bar.style.background = p.color || COLOR_FALLBACK;
    bar.textContent = p.name;
    bar.title = `${p.name} (${p.start_date} ~ ${p.end_date})`;
    bar.addEventListener("click", () => openProjectModal(p.id));
    table.appendChild(bar);
  });

  // 오늘 세로선
  const todayIdx = dayIndexFromStart(windowStart, dateOnly(today), totalDays);
  if (todayIdx >= 0 && todayIdx < totalDays) {
    const todayLine = document.createElement("div");
    todayLine.className = "gantt-today-line";
    todayLine.style.left = `${labelW + todayIdx * cellW + cellW / 2}px`;
    todayLine.style.height = `${headerHeight + projects.length * rowH - 22}px`;
    table.appendChild(todayLine);
  }

  // 오늘 위치로 자동 스크롤 (1회만)
  if (todayIdx >= 0) {
    const targetLeft = labelW + todayIdx * cellW - wrap.clientWidth / 2 + cellW / 2;
    wrap.scrollLeft = Math.max(0, targetLeft);
  }
}

function dayIndexFromStart(windowStart, dateStr, totalDays) {
  if (!dateStr) return -1;
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d - windowStart) / (24 * 3600 * 1000));
  return diff;
}

// ════════════════════════════════════════════════════════
// 7) DAILY LOG
// ════════════════════════════════════════════════════════
async function renderDailyEditor() {
  document.getElementById("dailyDateInput").value = STATE.dailyDate;
  // 해당 날짜 로그 로드
  try {
    const log = await api("GET", `/api/me/daily-logs/${STATE.dailyDate}`);
    document.getElementById("dailyContent").value = log.content || "";
    STATE.dailyDirty = false;
    setDailyStatus("saved", "저장됨");
  } catch (e) {
    if (e.message && !e.message.includes("404")) showToast(e.message, true);
    document.getElementById("dailyContent").value = "";
    STATE.dailyDirty = false;
    setDailyStatus("", "변경사항 없음");
  }
  renderDailyList();
  // AI 분석 결과 캐시 로드 (있으면 표시, 없으면 섹션 숨김)
  loadAiExtracts(STATE.dailyDate);
}

function renderDailyList() {
  const list = document.getElementById("dailyList");
  const q = STATE.dailySearch.toLowerCase();
  const filtered = q
    ? STATE.dailyLogs.filter(l => (l.content || "").toLowerCase().includes(q))
    : STATE.dailyLogs;
  if (!filtered.length) {
    list.innerHTML = `<div class="widget-empty">${
      q ? "검색 결과가 없습니다." : "최근 로그가 없습니다."
    }</div>`;
    return;
  }
  list.innerHTML = filtered.map(l => `
    <div class="daily-list-item" data-date="${escapeAttr(l.log_date)}">
      <div class="dli-date">${formatDateLong(l.log_date)}</div>
      <div class="dli-preview">${escapeHtml(l.content || "(빈 로그)")}</div>
    </div>
  `).join("");
  list.querySelectorAll(".daily-list-item").forEach(el => {
    el.addEventListener("click", () => {
      STATE.dailyDate = el.dataset.date;
      renderDailyEditor();
    });
  });
}

function setDailyStatus(cls, text) {
  const el = document.getElementById("dailySaveStatus");
  el.classList.remove("is-dirty", "is-saved");
  if (cls) el.classList.add(`is-${cls}`);
  el.textContent = text;
}

async function saveDailyLog(opts = {}) {
  if (STATE.dailySaving) return;
  STATE.dailySaving = true;
  setDailyStatus("dirty", "저장 중...");
  try {
    const content = document.getElementById("dailyContent").value;
    await api("PUT", "/api/me/daily-logs", {
      log_date: STATE.dailyDate,
      content,
    });
    STATE.dailyDirty = false;
    setDailyStatus("saved", "저장됨");
    // 로컬 캐시 업데이트
    const idx = STATE.dailyLogs.findIndex(l => l.log_date === STATE.dailyDate);
    if (idx >= 0) STATE.dailyLogs[idx].content = content;
    else STATE.dailyLogs.unshift({ log_date: STATE.dailyDate, content });
    renderDailyList();
    // 저장 후 AI 캐시 결과를 자동으로 새로고침 (이미 분석된 동일 내용이면 즉시 표시)
    if (!opts.skipAi) loadAiExtracts(STATE.dailyDate);
  } catch (e) {
    showToast(e.message, true);
    setDailyStatus("dirty", "저장 실패 — 재시도하세요");
  } finally {
    STATE.dailySaving = false;
  }
}

// ════════════════════════════════════════════════════════
// AI (Phase 5) — 하루 로그 추출 + 자연어 검색
// ════════════════════════════════════════════════════════

async function ensureAiStatus() {
  if (STATE.aiEnabled !== null) return STATE.aiEnabled;
  try {
    const data = await api("GET", "/api/me/ai/status");
    STATE.aiEnabled = !!data.enabled;
  } catch (e) {
    STATE.aiEnabled = false;
  }
  return STATE.aiEnabled;
}

async function loadAiExtracts(logDate) {
  const section = document.getElementById("aiExtracts");
  if (!section) return;
  const enabled = await ensureAiStatus();
  if (!enabled) {
    STATE.aiExtract = null;
    section.hidden = true;
    return;
  }
  try {
    const data = await api("GET", `/api/me/daily-logs/${logDate}/extracts`);
    if (!data || !data.extract) {
      STATE.aiExtract = null;
      hideAiExtracts();
      return;
    }
    STATE.aiExtract = data;
    renderAiExtracts();
  } catch (e) {
    STATE.aiExtract = null;
    hideAiExtracts();
  }
}

async function analyzeDailyLogNow() {
  const enabled = await ensureAiStatus();
  if (!enabled) {
    showToast("AI 기능이 비활성 상태입니다 (서버에 ANTHROPIC_API_KEY 미설정)", true);
    return;
  }
  if (STATE.aiAnalyzing) return;
  // 미저장 내용이 있으면 먼저 저장
  if (STATE.dailyDirty) {
    await saveDailyLog({ skipAi: true });
  }
  STATE.aiAnalyzing = true;
  const section = document.getElementById("aiExtracts");
  const status = document.getElementById("aiExtractsStatus");
  section.hidden = false;
  section.classList.add("is-analyzing");
  if (status) status.textContent = "분석 중...";
  document.getElementById("aiExtractsBody").innerHTML =
    `<div class="ai-empty">AI 가 하루 로그를 읽고 있어요... (보통 5–10초)</div>`;
  try {
    const data = await api("POST", `/api/me/daily-logs/${STATE.dailyDate}/analyze`);
    if (data.status === "empty") {
      document.getElementById("aiExtractsBody").innerHTML =
        `<div class="ai-empty">로그가 비어있어요. 뭐라도 적어보세요.</div>`;
      STATE.aiExtract = null;
    } else {
      STATE.aiExtract = data;
      renderAiExtracts();
    }
  } catch (e) {
    showToast("AI 분석 실패: " + e.message, true);
    document.getElementById("aiExtractsBody").innerHTML =
      `<div class="ai-empty">분석 중 오류가 발생했어요.</div>`;
  } finally {
    STATE.aiAnalyzing = false;
    section.classList.remove("is-analyzing");
    if (status) status.textContent = "";
  }
}

function hideAiExtracts() {
  const section = document.getElementById("aiExtracts");
  if (section) section.hidden = true;
}

function renderAiExtracts() {
  const section = document.getElementById("aiExtracts");
  const body = document.getElementById("aiExtractsBody");
  if (!section || !body) return;
  const data = STATE.aiExtract;
  if (!data || !data.extract) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  const ex = data.extract;
  const promoted = new Set(data.promoted || []);
  const dismissed = new Set(data.dismissed || []);

  const tasksHtml = renderExtractActionGroup(
    "tasks", ex.tasks || [], promoted, dismissed,
    "📋 할 일 후보", "오늘/단기 안에 해야 할 일",
  );
  const futureHtml = renderExtractActionGroup(
    "future", ex.future || [], promoted, dismissed,
    "📅 앞으로 할 거", "1주 이후 미래 할 일",
  );
  const decisionsHtml = renderExtractDecisions(
    ex.decisions || [], dismissed,
  );
  const tagsHtml = renderExtractTags(ex.tags || []);

  const hasAny =
    (ex.tasks || []).length || (ex.future || []).length ||
    (ex.decisions || []).length || (ex.tags || []).length;

  if (!hasAny) {
    body.innerHTML = `<div class="ai-empty">뽑을 만한 항목이 보이지 않아요. 회의/할 일/결정사항을 더 자세히 적어보세요.</div>`;
  } else {
    body.innerHTML = [tasksHtml, futureHtml, decisionsHtml, tagsHtml].filter(Boolean).join("");
  }

  // 핸들러 바인딩
  body.querySelectorAll("[data-ai-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.aiAction;
      const kind = btn.dataset.aiKind;
      const idx = Number(btn.dataset.aiIndex);
      if (action === "promote") promoteAiExtract(kind, idx);
      else if (action === "dismiss") dismissAiExtract(kind, idx);
    });
  });
}

function renderExtractActionGroup(kind, items, promoted, dismissed, title, subtitle) {
  if (!items.length) return "";
  const rows = items.map((it, i) => {
    const key = `${kind}:${i}`;
    const isPromoted = promoted.has(key);
    const isDismissed = dismissed.has(key);
    const stateCls = isPromoted ? "is-promoted" : isDismissed ? "is-dismissed" : "";
    const dueHint = it.due_hint ? `<span class="ai-due">${escapeHtml(it.due_hint)}</span>` : "";
    const stateLabel = isPromoted
      ? `<span class="ai-state-label is-done">✓ Task 추가됨</span>`
      : isDismissed
      ? `<span class="ai-state-label is-faint">무시함</span>`
      : `<div class="ai-actions">
           <button class="btn-mini btn-mini-primary" data-ai-action="promote" data-ai-kind="${kind}" data-ai-index="${i}">＋ Task</button>
           <button class="btn-mini btn-mini-ghost" data-ai-action="dismiss" data-ai-kind="${kind}" data-ai-index="${i}">무시</button>
         </div>`;
    return `
      <li class="ai-item ${stateCls}">
        <div class="ai-item-main">
          <span class="ai-item-title">${escapeHtml(it.title || "")}</span>
          ${dueHint}
        </div>
        ${stateLabel}
      </li>
    `;
  }).join("");
  return `
    <div class="ai-group">
      <div class="ai-group-head">
        <h4>${title} <span class="ai-count">${items.length}</span></h4>
        <span class="ai-group-sub">${subtitle}</span>
      </div>
      <ul class="ai-list">${rows}</ul>
    </div>
  `;
}

function renderExtractDecisions(items, dismissed) {
  if (!items.length) return "";
  const rows = items.map((it, i) => {
    const key = `decisions:${i}`;
    const isDismissed = dismissed.has(key);
    return `
      <li class="ai-item ${isDismissed ? "is-dismissed" : ""}">
        <div class="ai-item-main">
          <span class="ai-item-title">${escapeHtml(it.summary || "")}</span>
        </div>
        ${isDismissed
          ? `<span class="ai-state-label is-faint">무시함</span>`
          : `<div class="ai-actions">
               <button class="btn-mini btn-mini-ghost" data-ai-action="dismiss" data-ai-kind="decisions" data-ai-index="${i}">무시</button>
             </div>`}
      </li>
    `;
  }).join("");
  return `
    <div class="ai-group">
      <div class="ai-group-head">
        <h4>💡 회의 결정사항 <span class="ai-count">${items.length}</span></h4>
        <span class="ai-group-sub">나중에 검색용으로 기억해둘 메모</span>
      </div>
      <ul class="ai-list">${rows}</ul>
    </div>
  `;
}

function renderExtractTags(tags) {
  if (!tags.length) return "";
  const chips = tags.map(t => `<span class="ai-tag">#${escapeHtml(t)}</span>`).join("");
  return `
    <div class="ai-group ai-group-tags">
      <div class="ai-group-head"><h4>🏷 주제 태그</h4></div>
      <div class="ai-tags">${chips}</div>
    </div>
  `;
}

async function promoteAiExtract(kind, index) {
  if (!STATE.aiExtract || !STATE.aiExtract.id) return;
  const eid = STATE.aiExtract.id;
  try {
    const data = await api("POST", `/api/me/extracts/${eid}/promote`, {
      kind, index, priority: "medium",
    });
    STATE.aiExtract.promoted = data.promoted || [];
    if (data.task) STATE.tasks.unshift(data.task);
    renderAiExtracts();
    showToast("할 일에 추가됐어요");
  } catch (e) {
    showToast("추가 실패: " + e.message, true);
  }
}

async function dismissAiExtract(kind, index) {
  if (!STATE.aiExtract || !STATE.aiExtract.id) return;
  const eid = STATE.aiExtract.id;
  try {
    const data = await api("POST", `/api/me/extracts/${eid}/dismiss`, { kind, index });
    STATE.aiExtract.dismissed = data.dismissed || [];
    renderAiExtracts();
  } catch (e) {
    showToast("무시 실패: " + e.message, true);
  }
}

// ── 스마트 검색 ──────────────────────────────────────────
async function smartSearch(query) {
  const enabled = await ensureAiStatus();
  if (!enabled) {
    showToast("AI 기능이 비활성 상태입니다 (서버에 ANTHROPIC_API_KEY 미설정)", true);
    return;
  }
  if (STATE.smartSearching) return;
  STATE.smartSearching = true;
  const result = document.getElementById("smartSearchResult");
  const btn = document.getElementById("smartSearchBtn");
  result.hidden = false;
  result.innerHTML = `<div class="ss-loading">하루 로그를 뒤지는 중... (보통 5–10초)</div>`;
  if (btn) btn.disabled = true;
  try {
    const data = await api("POST", "/api/me/search", { query, days: 90 });
    renderSmartSearchResult(data);
  } catch (e) {
    result.innerHTML = `<div class="ss-error">검색 실패: ${escapeHtml(e.message || "")}</div>`;
  } finally {
    STATE.smartSearching = false;
    if (btn) btn.disabled = false;
  }
}

function renderSmartSearchResult(data) {
  const result = document.getElementById("smartSearchResult");
  if (!result) return;
  const answer = (data && data.answer) || "(답변 없음)";
  const sources = (data && data.sources) || [];
  const sourcesHtml = sources.length
    ? `<div class="ss-sources">
         <div class="ss-sources-head">출처</div>
         <ul>
           ${sources.map(s => `
             <li>
               <button class="ss-source-link" data-date="${escapeAttr(s.date)}">${formatDateLong(s.date)}</button>
               <span class="ss-source-snippet">${escapeHtml(s.snippet || "")}</span>
             </li>
           `).join("")}
         </ul>
       </div>`
    : `<div class="ss-sources is-empty">관련된 로그를 찾지 못했어요.</div>`;
  result.innerHTML = `
    <div class="ss-card">
      <div class="ss-header">
        <span class="ai-badge">AI 답변</span>
        <span class="ss-meta">${data.logs_searched || 0}개 로그 검색 · 최근 ${data.days || 90}일</span>
      </div>
      <div class="ss-answer">${escapeHtml(answer)}</div>
      ${sourcesHtml}
    </div>
  `;
  // 출처 클릭 → 그 날짜로 점프
  result.querySelectorAll(".ss-source-link").forEach(btn => {
    btn.addEventListener("click", () => {
      const d = btn.dataset.date;
      if (!d) return;
      STATE.dailyDate = d;
      renderDailyEditor();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// ════════════════════════════════════════════════════════
// 카테고리 관리 모달 (기존)
// ════════════════════════════════════════════════════════
function openCategoryModal() {
  renderCategoryList();
  document.getElementById("categoryModal").hidden = false;
}
function closeCategoryModal() {
  document.getElementById("categoryModal").hidden = true;
}

function renderCategoryList() {
  const ul = document.getElementById("categoryList");
  if (STATE.categories.length === 0) {
    ul.innerHTML = `<li style="color:var(--text-faint);padding:8px 4px;">카테고리가 없습니다.</li>`;
    return;
  }
  ul.innerHTML = STATE.categories.map(c => `
    <li class="cat-item" data-id="${c.id}">
      <label class="cat-color" style="background:${escapeAttr(c.color)}">
        <input type="color" value="${escapeAttr(c.color)}" data-action="color" />
      </label>
      <input class="cat-name" type="text" value="${escapeAttr(c.name)}" data-action="rename" maxlength="30" />
      <button class="cat-delete" data-action="delete" title="삭제">🗑</button>
    </li>
  `).join("");
  ul.querySelectorAll(".cat-item").forEach(li => {
    const id = Number(li.dataset.id);
    li.querySelector('[data-action="color"]').addEventListener("change", async e => {
      const color = e.target.value;
      li.querySelector(".cat-color").style.background = color;
      try {
        await api("PATCH", `/api/me/categories/${id}`, { color });
        const c = STATE.categories.find(c => c.id === id); if (c) c.color = color;
        renderAll();
      } catch (e) { showToast(e.message, true); }
    });
    li.querySelector('[data-action="rename"]').addEventListener("blur", async e => {
      const name = e.target.value.trim();
      const c = STATE.categories.find(c => c.id === id);
      if (!c || !name || name === c.name) return;
      try {
        await api("PATCH", `/api/me/categories/${id}`, { name });
        await refreshAll();
        openCategoryModal();
      } catch (err) {
        e.target.value = c.name;
        showToast(err.message, true);
      }
    });
    li.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      const c = STATE.categories.find(c => c.id === id);
      if (!c) return;
      if (!confirm(`"${c.name}" 카테고리를 삭제할까요?\n이 카테고리의 업무들은 "미분류"로 이동합니다.`)) return;
      try {
        await api("DELETE", `/api/me/categories/${id}`);
        await refreshAll();
        openCategoryModal();
      } catch (e) { showToast(e.message, true); }
    });
  });
}

// ════════════════════════════════════════════════════════
// 이벤트 바인딩
// ════════════════════════════════════════════════════════
function bindEvents() {
  // 큰 네비
  document.querySelectorAll(".nav-tab").forEach(btn => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  // Tasks 안의 list/kanban 토글
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      STATE.view = btn.dataset.view;
      renderTasks();
    });
  });

  document.getElementById("searchInput").addEventListener("input", e => {
    STATE.search = e.target.value;
    renderTasks();
  });
  document.getElementById("sortSelect").addEventListener("change", e => {
    STATE.sort = e.target.value;
    renderTasks();
  });

  // FAB / 카테고리 관리
  document.getElementById("newTaskBtn").addEventListener("click", () => openTaskModal(null));
  document.getElementById("manageCategoriesBtn").addEventListener("click", openCategoryModal);

  // ── Quick capture (Dashboard) ─────────────────────────
  const qcInput = document.getElementById("quickCaptureInput");
  const qcPreview = document.getElementById("quickCapturePreview");

  function refreshQcPreview() {
    if (!qcPreview) return;
    const val = qcInput.value;
    const parsed = parseNL(val);
    if (parsed && parsed.type === "task") {
      qcPreview.hidden = false;
      qcPreview.textContent = `→ 할 일로 인식: ${parsed.preview}`;
      qcPreview.classList.add("is-task");
    } else if (val.trim()) {
      qcPreview.hidden = false;
      qcPreview.textContent = "→ 메모(Inbox)로 저장됩니다";
      qcPreview.classList.remove("is-task");
    } else {
      qcPreview.hidden = true;
    }
  }
  qcInput.addEventListener("input", refreshQcPreview);

  document.getElementById("quickCaptureForm").addEventListener("submit", e => {
    e.preventDefault();
    const val = qcInput.value;
    qcInput.value = "";
    refreshQcPreview();
    const parsed = parseNL(val);
    if (parsed && parsed.type === "task") {
      addTaskFromNL(parsed);
    } else {
      addInbox(val);
    }
  });

  // ── Inbox 입력 ────────────────────────────────────────
  document.getElementById("inboxAddForm").addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById("inboxAddInput");
    const val = input.value;
    input.value = "";
    addInbox(val);
  });
  document.querySelectorAll(".inbox-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      STATE.inboxFilter = btn.dataset.inboxTab;
      refreshInboxOnly();
    });
  });

  // ── Phase 6d: AI Inbox 정리 ───────────────────────────
  const aiBtn = document.getElementById("inboxAiBtn");
  if (aiBtn) aiBtn.addEventListener("click", aiClassifyBulk);

  // ── Project ───────────────────────────────────────────
  document.getElementById("newProjectBtn").addEventListener("click", () => openProjectModal(null));

  document.getElementById("projectForm").addEventListener("submit", async e => {
    e.preventDefault();
    const id = STATE.editingProjectId;
    const progressVal = document.getElementById("projectProgress").value;
    const payload = {
      name: document.getElementById("projectName").value.trim(),
      description: document.getElementById("projectDescription").value,
      status: document.getElementById("projectStatus").value,
      color: document.getElementById("projectColor").value,
      start_date: document.getElementById("projectStartDate").value || null,
      end_date: document.getElementById("projectEndDate").value || null,
      progress_pct: progressVal === "" ? 0 : Number(progressVal),
      notes: document.getElementById("projectNotes").value,
    };
    try {
      if (id) {
        const updated = await api("PATCH", `/api/me/projects/${id}`, payload);
        const idx = STATE.projects.findIndex(p => p.id === id);
        if (idx >= 0) STATE.projects[idx] = updated;
      } else {
        const created = await api("POST", "/api/me/projects", payload);
        STATE.projects.unshift(created);
      }
      closeProjectModal();
      renderAll();
      showToast(id ? "수정 완료" : "프로젝트 생성");
    } catch (e) { showToast(e.message, true); }
  });

  document.getElementById("deleteProjectBtn").addEventListener("click", async () => {
    const id = STATE.editingProjectId;
    if (!id) return;
    if (!confirm("이 프로젝트를 삭제할까요?\n연결된 Tasks 는 유지되지만 프로젝트 연결은 풀립니다.")) return;
    try {
      await api("DELETE", `/api/me/projects/${id}`);
      STATE.projects = STATE.projects.filter(p => p.id !== id);
      // 로컬에서 task.project_id 도 해제
      STATE.tasks.forEach(t => { if (t.project_id === id) t.project_id = null; });
      closeProjectModal();
      renderAll();
      showToast("프로젝트 삭제됨");
    } catch (e) { showToast(e.message, true); }
  });

  // ── Promote 모달 ──────────────────────────────────────
  document.getElementById("promoteForm").addEventListener("submit", e => {
    e.preventDefault();
    submitPromote();
  });

  // ── Calendar ──────────────────────────────────────────
  document.getElementById("calPrevBtn").addEventListener("click", () => {
    STATE.calCursor = new Date(STATE.calCursor.getFullYear(), STATE.calCursor.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById("calNextBtn").addEventListener("click", () => {
    STATE.calCursor = new Date(STATE.calCursor.getFullYear(), STATE.calCursor.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById("calTodayBtn").addEventListener("click", () => {
    STATE.calCursor = startOfMonth(new Date());
    renderCalendar();
  });

  // ── Gantt ─────────────────────────────────────────────
  document.getElementById("ganttZoom").addEventListener("change", e => {
    STATE.ganttCellW = Number(e.target.value);
    renderGantt();
  });
  document.getElementById("ganttJumpToday").addEventListener("click", renderGantt);

  // ── Daily Log ─────────────────────────────────────────
  document.getElementById("dailyDateInput").addEventListener("change", e => {
    STATE.dailyDate = e.target.value;
    renderDailyEditor();
  });
  const dailyContent = document.getElementById("dailyContent");
  dailyContent.addEventListener("input", () => {
    STATE.dailyDirty = true;
    setDailyStatus("dirty", "변경사항 있음 — Ctrl/⌘+S 또는 저장 버튼");
  });
  // Ctrl/Cmd + S
  dailyContent.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveDailyLog();
    }
  });
  // 자동 저장 (blur 시)
  dailyContent.addEventListener("blur", () => {
    if (STATE.dailyDirty) saveDailyLog();
  });
  document.getElementById("dailySaveBtn").addEventListener("click", () => saveDailyLog());
  document.getElementById("dailySearchInput").addEventListener("input", e => {
    STATE.dailySearch = e.target.value;
    renderDailyList();
  });

  // ── AI (Phase 5) ─────────────────────────────────────
  const dailyAnalyzeBtn = document.getElementById("dailyAnalyzeBtn");
  if (dailyAnalyzeBtn) dailyAnalyzeBtn.addEventListener("click", () => analyzeDailyLogNow());
  const aiRefresh = document.getElementById("aiExtractsRefresh");
  if (aiRefresh) aiRefresh.addEventListener("click", () => analyzeDailyLogNow());

  const smartForm = document.getElementById("smartSearchForm");
  if (smartForm) {
    smartForm.addEventListener("submit", e => {
      e.preventDefault();
      const input = document.getElementById("smartSearchInput");
      const q = (input.value || "").trim();
      if (!q) return;
      smartSearch(q);
    });
  }

  // ── 모달 닫기/배경 클릭 ───────────────────────────────
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.close;
      if (target === "task") closeTaskModal();
      else if (target === "category") closeCategoryModal();
      else if (target === "project") closeProjectModal();
      else if (target === "promote") closePromoteModal();
    });
  });
  document.querySelectorAll(".modal-backdrop").forEach(bd => {
    bd.addEventListener("click", e => {
      if (e.target === bd) bd.hidden = true;
    });
  });

  // ── Task 모달 ─────────────────────────────────────────
  document.getElementById("taskForm").addEventListener("submit", async e => {
    e.preventDefault();
    const id = STATE.editingTaskId;
    const payload = {
      title: document.getElementById("taskTitle").value.trim(),
      category: document.getElementById("taskCategory").value || null,
      project_id: parseIntOrNull(document.getElementById("taskProject").value),
      status: document.getElementById("taskStatus").value,
      priority: document.getElementById("taskPriority").value,
      due_date: document.getElementById("taskDueDate").value || null,
      tags: document.getElementById("taskTags").value
        .split(",").map(s => s.trim()).filter(Boolean),
      notes: document.getElementById("taskNotes").value,
    };
    try {
      if (id) {
        const updated = await api("PATCH", `/api/me/tasks/${id}`, payload);
        const idx = STATE.tasks.findIndex(t => t.id === id);
        if (idx >= 0) STATE.tasks[idx] = updated;
      } else {
        const created = await api("POST", "/api/me/tasks", payload);
        STATE.tasks.unshift(created);
      }
      closeTaskModal();
      // 프로젝트 진행률 갱신
      refreshProjectsOnly();
      renderAll();
      showToast(id ? "수정 완료" : "추가 완료");
    } catch (err) { showToast(err.message, true); }
  });

  document.getElementById("deleteTaskBtn").addEventListener("click", async () => {
    const id = STATE.editingTaskId;
    if (!id) return;
    if (!confirm("이 업무를 삭제할까요?")) return;
    try {
      await api("DELETE", `/api/me/tasks/${id}`);
      STATE.tasks = STATE.tasks.filter(t => t.id !== id);
      closeTaskModal();
      refreshProjectsOnly();
      renderAll();
      showToast("삭제됨");
    } catch (err) { showToast(err.message, true); }
  });

  // ── 카테고리 추가 ─────────────────────────────────────
  document.getElementById("categoryAddForm").addEventListener("submit", async e => {
    e.preventDefault();
    const name = document.getElementById("newCategoryName").value.trim();
    const color = document.getElementById("newCategoryColor").value;
    if (!name) return;
    try {
      const created = await api("POST", "/api/me/categories", {
        name, color, sort_order: STATE.categories.length + 1,
      });
      STATE.categories.push(created);
      document.getElementById("newCategoryName").value = "";
      renderCategoryList();
      renderAll();
    } catch (err) { showToast(err.message, true); }
  });
}

// ════════════════════════════════════════════════════════
// 유틸
// ════════════════════════════════════════════════════════
function escapeAttr(s) { return String(s ?? "").replace(/"/g, "&quot;"); }
function hexToBg(hex) {
  if (!hex || hex[0] !== "#" || hex.length !== 7) return "rgba(99,102,241,0.15)";
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},0.15)`;
}
function parseIntOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function startOfDay(d) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function dateOnly(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayStr() { return dateOnly(new Date()); }
function formatDateLong(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const wd = ["일","월","화","수","목","금","토"][d.getDay()];
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${wd})`;
}
function relativeTime(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

let toastTimer;
function showToast(msg, isError) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.toggle("is-error", !!isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

// ════════════════════════════════════════════════════════
// Command Palette (Cmd/Ctrl + K)  — Phase 6b
// ════════════════════════════════════════════════════════
const CMDK = {
  open: false,
  results: [],
  activeIndex: 0,
};

function openCmdk() {
  if (CMDK.open) return;
  CMDK.open = true;
  const bd = document.getElementById("cmdkBackdrop");
  const input = document.getElementById("cmdkInput");
  bd.hidden = false;
  input.value = "";
  CMDK.activeIndex = 0;
  refreshCmdk("");
  setTimeout(() => input.focus(), 10);
}

function closeCmdk() {
  if (!CMDK.open) return;
  CMDK.open = false;
  document.getElementById("cmdkBackdrop").hidden = true;
}

function fuzzyMatch(text, q) {
  if (!q) return true;
  return (text || "").toLowerCase().includes(q.toLowerCase());
}

function buildCmdkResults(query) {
  const q = (query || "").trim();

  // Quick commands first
  if (q.startsWith("/") || q.startsWith(":")) {
    const cmd = q[1];
    const rest = q.slice(2).trim();
    const cmdMap = {
      t: { title: "새 할 일", icon: "📋", sub: rest || "제목을 입력하세요" },
      p: { title: "새 프로젝트", icon: "📁", sub: rest || "이름을 입력하세요" },
      m: { title: "메모(Inbox)에 담기", icon: "📥", sub: rest || "내용을 입력하세요" },
      d: { title: "오늘 하루로그에 추가", icon: "📓", sub: rest || "내용을 입력하세요" },
    };
    if (cmdMap[cmd]) {
      const def = cmdMap[cmd];
      return [{
        section: "빠른 명령",
        kind: "command",
        cmd,
        text: rest,
        title: def.title,
        sub: def.sub,
        icon: def.icon,
        tag: rest ? "Enter로 실행" : "내용 입력 필요",
      }];
    }
  }

  // Navigation entries (always visible when no query)
  const navItems = [
    { kind: "nav", tab: "dashboard", title: "대시보드로 이동", icon: "🏠", sub: "위젯 모음 + 빠른 입력" },
    { kind: "nav", tab: "inbox",     title: "받은 메모로 이동", icon: "📥", sub: "Inbox 모음" },
    { kind: "nav", tab: "tasks",     title: "할 일로 이동",     icon: "✓", sub: "리스트 / 칸반" },
    { kind: "nav", tab: "projects",  title: "프로젝트로 이동",  icon: "📁", sub: "프로젝트 카드" },
    { kind: "nav", tab: "calendar",  title: "달력으로 이동",    icon: "📅", sub: "월간 보기" },
    { kind: "nav", tab: "gantt",     title: "간트로 이동",      icon: "📊", sub: "365일 일단위" },
    { kind: "nav", tab: "daily",     title: "하루 로그로 이동", icon: "📓", sub: "오늘 작성" },
  ];

  const results = [];

  if (!q) {
    navItems.forEach(n => results.push({ section: "이동", ...n }));
  }

  // Tasks
  const tasks = (STATE.tasks || []).filter(t =>
    fuzzyMatch(t.title, q) || fuzzyMatch(t.notes, q) ||
    (t.tags || []).some(tg => fuzzyMatch(tg, q))
  ).slice(0, 8);
  tasks.forEach(t => results.push({
    section: "할 일",
    kind: "task",
    id: t.id,
    title: t.title,
    sub: [t.category, t.due_date].filter(Boolean).join(" · ") || STATUS_LABEL[t.status],
    icon: t.status === "done" ? "✅" : (t.priority === "high" ? "🔥" : "📋"),
    tag: t.status !== "done" && t.due_date ? dueDisplay(t.due_date).label : null,
  }));

  // Projects
  const projects = (STATE.projects || []).filter(p =>
    fuzzyMatch(p.name, q) || fuzzyMatch(p.description, q)
  ).slice(0, 5);
  projects.forEach(p => results.push({
    section: "프로젝트",
    kind: "project",
    id: p.id,
    title: p.name,
    sub: p.description || PROJECT_STATUS_LABEL[p.status],
    icon: "📁",
    tag: p.end_date ? (dDayInfo(p.end_date)?.label || null) : null,
  }));

  // Inbox
  const inboxItems = (STATE.inbox || []).filter(i => fuzzyMatch(i.content, q)).slice(0, 5);
  inboxItems.forEach(i => results.push({
    section: "받은 메모",
    kind: "inbox",
    id: i.id,
    title: i.content.slice(0, 80),
    sub: relativeTime(i.created_at),
    icon: "📥",
  }));

  // Daily logs
  if (q) {
    const logs = (STATE.dailyLogs || []).filter(l => fuzzyMatch(l.content, q)).slice(0, 5);
    logs.forEach(l => results.push({
      section: "하루 로그",
      kind: "daily",
      date: l.log_date,
      title: formatDateLong(l.log_date),
      sub: (l.content || "").slice(0, 80),
      icon: "📓",
    }));
  }

  // Nav (when query exists) — match tab names
  if (q) {
    const matched = navItems.filter(n => fuzzyMatch(n.title, q));
    matched.forEach(n => results.push({ section: "이동", ...n }));
  }

  return results;
}

function refreshCmdk(query) {
  CMDK.results = buildCmdkResults(query);
  if (CMDK.activeIndex >= CMDK.results.length) CMDK.activeIndex = 0;
  renderCmdkList();
}

function renderCmdkList() {
  const list = document.getElementById("cmdkList");
  if (!CMDK.results.length) {
    list.innerHTML = `<div class="cmdk-empty">결과가 없습니다.<br><small>"/t 회의" 처럼 입력해 바로 만들어 보세요.</small></div>`;
    return;
  }
  // Group by section
  let html = "";
  let lastSection = null;
  CMDK.results.forEach((r, idx) => {
    if (r.section !== lastSection) {
      if (lastSection !== null) html += "";
      html += `<div class="cmdk-section-title">${escapeHtml(r.section)}</div>`;
      lastSection = r.section;
    }
    const active = idx === CMDK.activeIndex ? "is-active" : "";
    const tagHtml = r.tag ? `<span class="cmdk-item-tag">${escapeHtml(r.tag)}</span>` : "";
    html += `<div class="cmdk-item ${active}" data-idx="${idx}">
      <span class="cmdk-item-icon">${r.icon || "•"}</span>
      <div class="cmdk-item-main">
        <div class="cmdk-item-title">${escapeHtml(r.title)}</div>
        ${r.sub ? `<div class="cmdk-item-sub">${escapeHtml(r.sub)}</div>` : ""}
      </div>
      ${tagHtml}
    </div>`;
  });
  list.innerHTML = html;
  list.querySelectorAll(".cmdk-item").forEach(el => {
    el.addEventListener("mouseenter", () => {
      CMDK.activeIndex = Number(el.dataset.idx);
      renderCmdkList();
    });
    el.addEventListener("click", () => {
      CMDK.activeIndex = Number(el.dataset.idx);
      executeCmdk();
    });
  });
  // Scroll active into view
  const activeEl = list.querySelector(".cmdk-item.is-active");
  if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
}

async function executeCmdk() {
  const r = CMDK.results[CMDK.activeIndex];
  if (!r) return;

  if (r.kind === "command") {
    const text = (r.text || "").trim();
    if (!text) { showToast("내용을 입력해주세요", true); return; }
    if (r.cmd === "t") {
      try {
        const created = await api("POST", "/api/me/tasks", {
          title: text, status: "todo", priority: "medium",
          category: null, project_id: null, tags: [], notes: "", due_date: null,
        });
        STATE.tasks.unshift(created);
        closeCmdk();
        setTab("tasks");
        showToast("할 일 추가됨");
      } catch (e) { showToast(e.message, true); }
    } else if (r.cmd === "p") {
      closeCmdk();
      setTab("projects");
      setTimeout(() => {
        openProjectModal(null);
        document.getElementById("projectName").value = text;
      }, 60);
    } else if (r.cmd === "m") {
      try {
        await addInbox(text);
        closeCmdk();
      } catch (e) { showToast(e.message, true); }
    } else if (r.cmd === "d") {
      closeCmdk();
      STATE.dailyDate = todayStr();
      setTab("daily");
      setTimeout(async () => {
        const ta = document.getElementById("dailyContent");
        const stamp = new Date().toTimeString().slice(0, 5);
        const append = `${ta.value ? ta.value.replace(/\s+$/, "") + "\n" : ""}- ${stamp} ${text}`;
        ta.value = append;
        STATE.dailyDirty = true;
        await saveDailyLog();
      }, 80);
    }
    return;
  }

  if (r.kind === "nav") {
    closeCmdk();
    setTab(r.tab);
    return;
  }

  if (r.kind === "task") {
    closeCmdk();
    setTab("tasks");
    setTimeout(() => openTaskModal(r.id), 60);
    return;
  }

  if (r.kind === "project") {
    closeCmdk();
    setTab("projects");
    setTimeout(() => openProjectModal(r.id), 60);
    return;
  }

  if (r.kind === "inbox") {
    closeCmdk();
    setTab("inbox");
    return;
  }

  if (r.kind === "daily") {
    closeCmdk();
    STATE.dailyDate = r.date;
    setTab("daily");
    return;
  }
}

function bindCmdk() {
  // Open: Cmd/Ctrl + K
  window.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      if (CMDK.open) closeCmdk();
      else openCmdk();
      return;
    }
    if (!CMDK.open) return;
    if (e.key === "Escape") { e.preventDefault(); closeCmdk(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (CMDK.results.length) {
        CMDK.activeIndex = (CMDK.activeIndex + 1) % CMDK.results.length;
        renderCmdkList();
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (CMDK.results.length) {
        CMDK.activeIndex = (CMDK.activeIndex - 1 + CMDK.results.length) % CMDK.results.length;
        renderCmdkList();
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      executeCmdk();
      return;
    }
  });

  // Input handler
  const input = document.getElementById("cmdkInput");
  if (input) {
    input.addEventListener("input", () => {
      CMDK.activeIndex = 0;
      refreshCmdk(input.value);
    });
  }

  // Backdrop click to close
  const bd = document.getElementById("cmdkBackdrop");
  if (bd) {
    bd.addEventListener("click", e => {
      if (e.target === bd) closeCmdk();
    });
  }

  // Topbar trigger button
  const trigger = document.getElementById("cmdkTrigger");
  if (trigger) trigger.addEventListener("click", openCmdk);
}
