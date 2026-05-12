// 개인 업무 관리 페이지
// API_BASE 는 ../assets/js/common.js 에서 정의됨

const STATE = {
  tasks: [],
  categories: [],
  view: "list",
  filterCategory: null, // null = 전체, "__none__" = 카테고리 없음
  search: "",
  sort: "created_desc",
  editingId: null,
};

const STATUS_LABEL = {
  todo: "할 일",
  in_progress: "진행 중",
  waiting: "대기",
  done: "완료",
};

const PRIORITY_LABEL = { high: "높음", medium: "보통", low: "낮음" };
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

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
  bindEvents();
  refreshAll();
});

// ── 통신 ──────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: authHeaders(),
  };
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
    const [cats, tasks] = await Promise.all([
      api("GET", "/api/me/categories"),
      api("GET", "/api/me/tasks"),
    ]);
    STATE.categories = cats;
    STATE.tasks = tasks;
    renderAll();
  } catch (e) {
    showToast(e.message, true);
  }
}

// ── 렌더 ──────────────────────────────────────────────────
function renderAll() {
  renderCategoryChips();
  renderCategoryOptions();
  if (STATE.view === "list") renderList();
  else renderKanban();
}

function getCategoryColor(name) {
  const c = STATE.categories.find(c => c.name === name);
  return c?.color || COLOR_FALLBACK;
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
      renderAll();
    });
  });
}

function renderCategoryOptions() {
  const sel = document.getElementById("taskCategory");
  const current = sel.value;
  sel.innerHTML = `<option value="">(없음)</option>` +
    STATE.categories.map(c => `<option value="${escapeAttr(c.name)}">${escapeHtml(c.name)}</option>`).join("");
  if (current) sel.value = current;
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

function listRowHtml(t) {
  const cat = t.category || null;
  const catColor = cat ? getCategoryColor(cat) : "#475569";
  const due = dueDisplay(t.due_date);
  const dueClass = due.urgency ? `is-${due.urgency}` : "";
  return `
    <div class="list-row ${t.status === "done" ? "is-done" : ""}" data-id="${t.id}">
      <button class="row-check ${t.status === "done" ? "is-checked" : ""}">✓</button>
      <div class="row-main">
        <div class="row-title">${escapeHtml(t.title)}</div>
        <div class="row-meta">
          ${t.status !== "todo" && t.status !== "done" ? `<span>${STATUS_LABEL[t.status]}</span>` : ""}
          ${(t.tags || []).map(tag => `<span class="row-tag">#${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      ${cat ? `<span class="row-category" style="background:${hexToBg(catColor)};color:${catColor}">${escapeHtml(cat)}</span>` : `<span></span>`}
      <span class="row-priority priority-${t.priority}">${PRIORITY_LABEL[t.priority]}</span>
      <span class="row-due ${dueClass}">${due.label}</span>
    </div>
  `;
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
  return `
    <div class="kanban-card" draggable="true" data-id="${t.id}">
      <div class="card-title">${escapeHtml(t.title)}</div>
      <div class="card-meta">
        ${cat ? `<span class="row-category" style="background:${hexToBg(catColor)};color:${catColor}">${escapeHtml(cat)}</span>` : ""}
        <span class="row-priority priority-${t.priority}">${PRIORITY_LABEL[t.priority]}</span>
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
    list.addEventListener("dragover", e => {
      e.preventDefault();
      list.classList.add("is-dragover");
    });
    list.addEventListener("dragleave", () => list.classList.remove("is-dragover"));
    list.addEventListener("drop", async e => {
      e.preventDefault();
      list.classList.remove("is-dragover");
      if (!draggingId) return;
      const newStatus = list.dataset.drop;
      const task = STATE.tasks.find(t => t.id === draggingId);
      if (!task || task.status === newStatus) return;
      try {
        const updated = await api("PATCH", `/api/me/tasks/${draggingId}`, { status: newStatus });
        Object.assign(task, updated);
        renderKanban();
      } catch (e) { showToast(e.message, true); }
    });
  });
}

// ── 모달 ──────────────────────────────────────────────────
function openTaskModal(taskId) {
  STATE.editingId = taskId || null;
  const t = taskId ? STATE.tasks.find(x => x.id === taskId) : null;
  document.getElementById("taskModalTitle").textContent = t ? "업무 편집" : "새 업무";
  document.getElementById("taskId").value = t?.id || "";
  document.getElementById("taskTitle").value = t?.title || "";
  document.getElementById("taskCategory").value = t?.category || "";
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
  STATE.editingId = null;
}

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

// ── 이벤트 바인딩 ──────────────────────────────────────────
function bindEvents() {
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      STATE.view = btn.dataset.view;
      renderAll();
    });
  });

  document.getElementById("searchInput").addEventListener("input", e => {
    STATE.search = e.target.value;
    renderAll();
  });
  document.getElementById("sortSelect").addEventListener("change", e => {
    STATE.sort = e.target.value;
    renderAll();
  });

  document.getElementById("newTaskBtn").addEventListener("click", () => openTaskModal(null));
  document.getElementById("manageCategoriesBtn").addEventListener("click", openCategoryModal);

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.close === "task") closeTaskModal();
      else if (btn.dataset.close === "category") closeCategoryModal();
    });
  });
  document.querySelectorAll(".modal-backdrop").forEach(bd => {
    bd.addEventListener("click", e => {
      if (e.target === bd) bd.hidden = true;
    });
  });

  document.getElementById("taskForm").addEventListener("submit", async e => {
    e.preventDefault();
    const id = STATE.editingId;
    const payload = {
      title: document.getElementById("taskTitle").value.trim(),
      category: document.getElementById("taskCategory").value || null,
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
      renderAll();
      showToast(id ? "수정 완료" : "추가 완료");
    } catch (err) { showToast(err.message, true); }
  });

  document.getElementById("deleteTaskBtn").addEventListener("click", async () => {
    const id = STATE.editingId;
    if (!id) return;
    if (!confirm("이 업무를 삭제할까요?")) return;
    try {
      await api("DELETE", `/api/me/tasks/${id}`);
      STATE.tasks = STATE.tasks.filter(t => t.id !== id);
      closeTaskModal();
      renderAll();
      showToast("삭제됨");
    } catch (err) { showToast(err.message, true); }
  });

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

// ── 유틸 ──────────────────────────────────────────────────
function escapeAttr(s) { return String(s ?? "").replace(/"/g, "&quot;"); }
function hexToBg(hex) {
  if (!hex || hex[0] !== "#" || hex.length !== 7) return "rgba(99,102,241,0.15)";
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},0.15)`;
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
