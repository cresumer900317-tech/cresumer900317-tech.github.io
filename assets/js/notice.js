document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  let quill = null;

  function sanitize(html) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["b","i","u","s","em","strong","p","br","ul","ol","li","h1","h2","h3",
        "span","a","img","blockquote","pre","code","sub","sup","hr"],
      ALLOWED_ATTR: ["href","src","alt","style","target","class","width","height"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|data):)/i,
    });
  }

  try {
    const res = await fetch(`${API_BASE}/api/notices`, { cache: "no-store" });
    const notices = await res.json();

    function categoryColor(cat) {
      const map = { "\uACF5\uC9C0": "#f59e0b", "\uC774\uBCA4\uD2B8": "#3b82f6", "\uAE38\uB4DC": "#22c55e", "\uC6B4\uC601": "#8b5cf6" };
      return map[cat] || "#6b7280";
    }

    function renderList(list) {
      if (!list.length) return `<div class="board-empty">\uB4F1\uB85D\uB41C \uACF5\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4</div>`;
      return list.map(n => `
        <div class="board-row${n.is_pinned ? " board-row-pinned" : ""}" data-notice-id="${n.id}" style="cursor:pointer;">
          <div class="board-row-left">
            ${n.is_pinned ? `<span class="board-pin">\uD83D\uDCCC</span>` : `<span class="board-num">${n.id}</span>`}
            <span class="board-cat" style="color:${categoryColor(n.category)};background:${categoryColor(n.category)}15;">${n.category||"\uACF5\uC9C0"}</span>
            <span class="board-ttl">${escapeHtml(n.title)}</span>
          </div>
          <div class="board-row-right">
            <span class="board-auth">${escapeHtml(n.author||"\uC6B4\uC601\uC9C4")}</span>
            <span class="board-dt">${new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
          </div>
        </div>
      `).join("");
    }

    function openPost(id) {
      const post = notices.find(n => n.id === id);
      if (!post) return;
      const isHtml = post.content && (post.content.includes("<") && post.content.includes(">"));
      const contentHtml = isHtml ? sanitize(post.content) : `<p style="white-space:pre-wrap;">${escapeHtml(post.content)}</p>`;
      document.getElementById("postContent").innerHTML = `
        <div style="padding:28px 28px 24px;">
          <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap;">
            <span class="board-cat" style="font-size:0.82rem;">${post.category||"\uACF5\uC9C0"}</span>
            ${post.is_pinned ? `<span style="font-size:0.78rem;color:#f59e0b;font-weight:700;">\uD83D\uDCCC \uACE0\uC815</span>` : ""}
          </div>
          <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:10px;line-height:1.4;">${escapeHtml(post.title)}</h2>
          <div style="font-size:0.8rem;color:#9ca3af;margin-bottom:20px;display:flex;gap:16px;">
            <span>${escapeHtml(post.author||"\uC6B4\uC601\uC9C4")}</span>
            <span>${new Date(post.created_at).toLocaleString("ko-KR")}</span>
          </div>
          <div class="notice-content-body" style="font-size:0.92rem;line-height:1.9;color:#374151;border-top:1px solid #f3f4f6;padding-top:20px;">${contentHtml}</div>
          <div style="margin-top:24px;display:flex;justify-content:space-between;">
            <button id="noticeBackBtn" class="board-cancel-btn">\u2190 \uBAA9\uB85D</button>
            ${isAdmin ? `<button id="noticeDeleteBtn" data-id="${post.id}" class="board-delete-btn">\uD83D\uDDD1\uFE0F \uC0AD\uC81C</button>` : ""}
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
      const content = quill ? quill.root.innerHTML : "";
      const textOnly = quill ? quill.getText().trim() : "";
      const category = document.getElementById("nCat").value;
      const is_pinned = document.getElementById("nPin").checked;
      if (!title || !textOnly) { alert("\uC81C\uBAA9\uACFC \uB0B4\uC6A9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694"); return; }
      const res = await fetch(`${API_BASE}/api/notices`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ title, content, category, is_pinned, author: user?.character_name||"\uC6B4\uC601\uC9C4", author_guild: user?.guild||"" }),
      });
      if (res.ok) location.reload();
      else alert("\uB4F1\uB85D \uC2E4\uD328");
    }

    async function deleteNotice(id) {
      if (!confirm("\uC0AD\uC81C\uD560\uAE4C\uC694?")) return;
      await fetch(`${API_BASE}/api/notices/${id}`, { method: "DELETE", headers: authHeaders() });
      closeModal(); location.reload();
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:28px 0 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0 0 4px;">\uD83D\uDCE2 \uACF5\uC9C0\uC0AC\uD56D</h1>
              <p style="font-size:0.85rem;color:var(--text-soft);margin:0;">\uAE38\uB4DC \uC6B4\uC601 \uAD00\uB828 \uACF5\uC9C0\uB97C \uD655\uC778\uD558\uC138\uC694</p>
            </div>
            ${isAdmin ? `<button id="showWriteBtn" class="board-write-btn">\u270F\uFE0F \uACF5\uC9C0 \uC791\uC131</button>` : ""}
          </div>

          <!-- 작성 폼 -->
          <div id="writeForm" class="board-write-form" style="display:none;">
            <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center;">
              <select id="nCat" class="board-select"><option>\uACF5\uC9C0</option><option>\uC774\uBCA4\uD2B8</option><option>\uAE38\uB4DC</option><option>\uC6B4\uC601</option></select>
              <label style="display:flex;align-items:center;gap:5px;font-size:0.82rem;cursor:pointer;">
                <input type="checkbox" id="nPin" /> \uC0C1\uB2E8 \uACE0\uC815
              </label>
            </div>
            <input type="text" id="nTitle" placeholder="\uC81C\uBAA9" class="board-input" style="margin-bottom:8px;" />
            <div id="editorWrap">
              <div id="nEditor"></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">
              <button id="hideWriteBtn" class="board-cancel-btn">\uCDE8\uC18C</button>
              <button id="submitNoticeBtn" class="board-submit-btn">\uB4F1\uB85D</button>
            </div>
          </div>

          <!-- 목록 -->
          <div class="board-table">
            <div class="board-table-header">
              <span>\uBC88\uD638</span><span>\uC81C\uBAA9</span><span>\uC791\uC131\uC790</span><span>\uB0A0\uC9DC</span>
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

    // Quill 에디터 초기화
    const showWriteBtn = document.getElementById("showWriteBtn");
    if (showWriteBtn) {
      showWriteBtn.addEventListener("click", () => {
        document.getElementById("writeForm").style.display = "block";
        if (!quill) {
          quill = new Quill("#nEditor", {
            theme: "snow",
            placeholder: "\uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694...",
            modules: {
              toolbar: [
                [{ header: [1, 2, 3, false] }],
                ["bold", "italic", "underline", "strike"],
                [{ color: [] }, { background: [] }],
                [{ size: ["small", false, "large", "huge"] }],
                [{ list: "ordered" }, { list: "bullet" }],
                [{ align: [] }],
                ["blockquote", "code-block"],
                ["link", "image"],
                ["clean"],
              ],
            },
          });
        }
      });
    }

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
