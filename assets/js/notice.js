document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();
  const isAdmin = user?.role === "admin";

  try {
    const res = await fetch(`${API_BASE}/api/notices`, { cache: "no-store" });
    const notices = await res.json();

    function categoryColor(cat) {
      const map = { "공지": "#f59e0b", "이벤트": "#3b82f6", "길드": "#22c55e", "운영": "#8b5cf6" };
      return map[cat] || "#6b7280";
    }

    function renderList(list) {
      if (!list.length) return `<div class="board-empty">등록된 공지가 없습니다</div>`;
      return list.map(n => `
        <div class="board-row${n.is_pinned ? " board-row-pinned" : ""}" data-notice-id="${n.id}" style="cursor:pointer;">
          <div class="board-row-left">
            ${n.is_pinned ? `<span class="board-pin">📌</span>` : `<span class="board-num">${n.id}</span>`}
            <span class="board-cat" style="color:${categoryColor(n.category)};background:${categoryColor(n.category)}15;">${n.category||"공지"}</span>
            <span class="board-ttl">${escapeHtml(n.title)}</span>
          </div>
          <div class="board-row-right">
            <span class="board-auth">${escapeHtml(n.author||"운영진")}</span>
            <span class="board-dt">${new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
          </div>
        </div>
      `).join("");
    }

    function openPost(id) {
      const post = notices.find(n => n.id === id);
      if (!post) return;
      document.getElementById("postContent").innerHTML = `
        <div style="padding:28px 28px 24px;">
          <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap;">
            <span class="board-cat" style="font-size:0.82rem;">${post.category||"공지"}</span>
            ${post.is_pinned ? `<span style="font-size:0.78rem;color:#f59e0b;font-weight:700;">📌 고정</span>` : ""}
          </div>
          <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:10px;line-height:1.4;">${escapeHtml(post.title)}</h2>
          <div style="font-size:0.8rem;color:#9ca3af;margin-bottom:20px;display:flex;gap:16px;">
            <span>${escapeHtml(post.author||"운영진")}</span>
            <span>${new Date(post.created_at).toLocaleString("ko-KR")}</span>
          </div>
          <div style="font-size:0.92rem;line-height:1.9;white-space:pre-wrap;color:#374151;border-top:1px solid #f3f4f6;padding-top:20px;">${escapeHtml(post.content)}</div>
          <div style="margin-top:24px;display:flex;justify-content:space-between;">
            <button id="noticeBackBtn" class="board-cancel-btn">← 목록</button>
            ${isAdmin ? `<button id="noticeDeleteBtn" data-id="${post.id}" class="board-delete-btn">🗑️ 삭제</button>` : ""}
          </div>
        </div>
      `;
      document.getElementById("postModal").style.display = "flex";
      document.body.style.overflow = "hidden";

      document.getElementById("noticeBackBtn").addEventListener("click", closeModal);
      const delBtn = document.getElementById("noticeDeleteBtn");
      if (delBtn) delBtn.addEventListener("click", () => deleteNotice(Number(delBtn.dataset.id)));
    }

    function closeModal() {
      document.getElementById("postModal").style.display = "none";
      document.body.style.overflow = "";
    }

    async function submitNotice() {
      const title = document.getElementById("nTitle").value.trim();
      const content = document.getElementById("nContent").value.trim();
      const category = document.getElementById("nCat").value;
      const is_pinned = document.getElementById("nPin").checked;
      if (!title || !content) { alert("제목과 내용을 입력해주세요"); return; }
      const res = await fetch(`${API_BASE}/api/notices`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category, is_pinned, author: user?.character_name||"운영진", author_guild: user?.guild||"" }),
      });
      if (res.ok) location.reload();
      else alert("등록 실패");
    }

    async function deleteNotice(id) {
      if (!confirm("삭제할까요?")) return;
      await fetch(`${API_BASE}/api/notices/${id}`, { method: "DELETE" });
      closeModal(); location.reload();
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:28px 0 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0 0 4px;">📢 공지사항</h1>
              <p style="font-size:0.85rem;color:var(--text-soft);margin:0;">길드 운영 관련 공지를 확인하세요</p>
            </div>
            ${isAdmin ? `<button id="showWriteBtn" class="board-write-btn">✏️ 공지 작성</button>` : ""}
          </div>

          <!-- 작성 폼 -->
          <div id="writeForm" class="board-write-form" style="display:none;">
            <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center;">
              <select id="nCat" class="board-select"><option>공지</option><option>이벤트</option><option>길드</option><option>운영</option></select>
              <label style="display:flex;align-items:center;gap:5px;font-size:0.82rem;cursor:pointer;">
                <input type="checkbox" id="nPin" /> 상단 고정
              </label>
            </div>
            <input type="text" id="nTitle" placeholder="제목" class="board-input" style="margin-bottom:8px;" />
            <textarea id="nContent" placeholder="내용" class="board-textarea"></textarea>
            <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">
              <button id="hideWriteBtn" class="board-cancel-btn">취소</button>
              <button id="submitNoticeBtn" class="board-submit-btn">등록</button>
            </div>
          </div>

          <!-- 목록 -->
          <div class="board-table">
            <div class="board-table-header">
              <span>번호</span><span>제목</span><span>작성자</span><span>날짜</span>
            </div>
            <div id="noticeList">${renderList(notices)}</div>
          </div>
        </div>
      </div>

      <!-- 모달 -->
      <div id="postModal" class="board-modal-bg" style="display:none;">
        <div class="board-modal-box">
          <div id="postContent"></div>
        </div>
      </div>
    `;

    // 이벤트 바인딩
    const showWriteBtn = document.getElementById("showWriteBtn");
    if (showWriteBtn) showWriteBtn.addEventListener("click", () => document.getElementById("writeForm").style.display = "block");
    document.getElementById("hideWriteBtn").addEventListener("click", () => document.getElementById("writeForm").style.display = "none");
    document.getElementById("submitNoticeBtn").addEventListener("click", submitNotice);

    document.getElementById("noticeList").addEventListener("click", (e) => {
      const row = e.target.closest("[data-notice-id]");
      if (row) openPost(Number(row.dataset.noticeId));
    });

    document.getElementById("postModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("postModal")) closeModal();
    });

  } catch(e) {
    renderError(null, e);
  }
});
