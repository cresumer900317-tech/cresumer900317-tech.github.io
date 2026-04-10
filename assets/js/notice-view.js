document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  function sanitize(html) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["b","i","u","s","em","strong","p","br","ul","ol","li","h1","h2","h3",
        "span","a","img","blockquote","pre","code","sub","sup","hr"],
      ALLOWED_ATTR: ["href","src","alt","style","target","class","width","height"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|data):)/i,
    });
  }

  function categoryColor(cat) {
    const map = { "공지": "#f59e0b", "이벤트": "#3b82f6", "길드": "#22c55e", "운영": "#8b5cf6" };
    return map[cat] || "#6b7280";
  }

  try {
    const params = new URLSearchParams(location.search);
    const postId = Number(params.get("id"));
    if (!postId) { location.href = "./notice"; return; }

    // 전체 목록과 현재 글을 가져옴 (이전/다음 글 네비게이션용)
    const res = await fetch(`${API_BASE}/api/notices`, { cache: "no-store" });
    const notices = await res.json();
    const post = notices.find(n => n.id === postId);
    if (!post) {
      document.querySelector("main").innerHTML = `
        <div class="page-card"><div class="container" style="padding:60px 20px;text-align:center;">
          <p style="font-size:1rem;color:var(--text-soft);">존재하지 않는 게시글입니다.</p>
          <a href="./notice" class="board-cancel-btn" style="display:inline-block;margin-top:16px;text-decoration:none;">목록으로</a>
        </div></div>`;
      return;
    }

    // 이전/다음 글 찾기
    const idx = notices.indexOf(post);
    const prevPost = idx < notices.length - 1 ? notices[idx + 1] : null;
    const nextPost = idx > 0 ? notices[idx - 1] : null;

    const isHtml = post.content && (post.content.includes("<") && post.content.includes(">"));
    const contentHtml = isHtml ? sanitize(post.content) : `<p style="white-space:pre-wrap;">${escapeHtml(post.content)}</p>`;
    const cat = post.category || "공지";

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container" style="padding-bottom:32px;">
          <div style="padding:20px 0 16px;">
            <a href="./notice" style="font-size:0.82rem;color:var(--text-soft);text-decoration:none;">&larr; 공지사항 목록</a>
          </div>

          <div class="board-view-page">
            <div class="board-view-header">
              <div class="board-view-meta">
                <span class="board-cat" style="color:${categoryColor(cat)};background:${categoryColor(cat)}15;">${cat}</span>
                ${post.is_pinned ? `<span style="font-size:0.78rem;color:#f59e0b;font-weight:700;">📌 고정</span>` : ""}
              </div>
              <h1 class="board-view-title">${escapeHtml(post.title)}</h1>
              <div class="board-view-info">
                <span>${escapeHtml(post.author || "운영진")}</span>
                <span>${new Date(post.created_at).toLocaleString("ko-KR")}</span>
              </div>
            </div>

            <div class="board-view-body notice-content-body">${contentHtml}</div>

            <div class="board-view-footer">
              <a href="./notice" class="board-cancel-btn" style="text-decoration:none;">&larr; 목록</a>
              <div class="board-view-actions">
                ${isAdmin ? `<button id="deleteBtn" class="board-delete-btn">🗑️ 삭제</button>` : ""}
              </div>
            </div>
          </div>

          <!-- 이전/다음 글 -->
          <div class="board-post-nav">
            ${nextPost ? `
              <a class="board-post-nav-row" href="./notice-view?id=${nextPost.id}">
                <span class="board-post-nav-label">▲ 다음글</span>
                <span class="board-post-nav-title">${escapeHtml(nextPost.title)}</span>
              </a>
            ` : `
              <div class="board-post-nav-row" style="color:var(--text-faint);">
                <span class="board-post-nav-label">▲ 다음글</span>
                <span class="board-post-nav-title">다음 글이 없습니다.</span>
              </div>
            `}
            ${prevPost ? `
              <a class="board-post-nav-row" href="./notice-view?id=${prevPost.id}">
                <span class="board-post-nav-label">▼ 이전글</span>
                <span class="board-post-nav-title">${escapeHtml(prevPost.title)}</span>
              </a>
            ` : `
              <div class="board-post-nav-row" style="color:var(--text-faint);">
                <span class="board-post-nav-label">▼ 이전글</span>
                <span class="board-post-nav-title">이전 글이 없습니다.</span>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // 삭제 버튼
    const deleteBtn = document.getElementById("deleteBtn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("삭제할까요?")) return;
        await fetch(`${API_BASE}/api/notices/${post.id}`, { method: "DELETE", headers: authHeaders() });
        location.href = "./notice";
      });
    }

  } catch(e) {
    renderError(null, e);
  }
});
