document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();

  function sanitize(html) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["b","i","u","s","em","strong","p","br","ul","ol","li","h1","h2","h3",
        "span","a","img","blockquote","pre","code","sub","sup","hr"],
      ALLOWED_ATTR: ["href","src","alt","style","target","class","width","height"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|data):)/i,
    });
  }

  function categoryColor(cat) {
    const map = {
      "공략": { color: "#ea580c", bg: "#fff7ed", icon: "⚔️" },
      "성장": { color: "#2563eb", bg: "#eff6ff", icon: "📈" },
      "캐릭터": { color: "#0891b2", bg: "#ecfeff", icon: "🧙" },
      "아이템": { color: "#7c3aed", bg: "#f5f3ff", icon: "🎒" },
      "기타": { color: "#6b7280", bg: "#f9fafb", icon: "📝" },
    };
    return map[cat] || map["기타"];
  }

  try {
    const params = new URLSearchParams(location.search);
    const postId = Number(params.get("id"));
    if (!postId) { location.href = "./tips"; return; }

    const res = await fetch(`${API_BASE}/api/tips`, { cache: "no-store" });
    const tips = await res.json();
    const tip = tips.find(t => t.id === postId);

    if (!tip) {
      document.querySelector("main").innerHTML = `
        <div class="page-card"><div class="container" style="padding:60px 20px;text-align:center;">
          <p style="font-size:1rem;color:var(--text-soft);">존재하지 않는 게시글입니다.</p>
          <a href="./tips" class="board-cancel-btn" style="display:inline-block;margin-top:16px;text-decoration:none;">목록으로</a>
        </div></div>`;
      return;
    }

    // 조회수 증가
    fetch(`${API_BASE}/api/tips/${tip.id}/view`, { method: "POST" })
      .then(r => r.json())
      .then(data => {
        const el = document.getElementById("viewCount");
        if (el) el.textContent = data.views;
      })
      .catch(() => {});

    const isOwner = user?.character_name === tip.author;
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";
    const canDelete = isOwner || isAdmin;

    // 이전/다음 글
    const idx = tips.indexOf(tip);
    const prevPost = idx < tips.length - 1 ? tips[idx + 1] : null;
    const nextPost = idx > 0 ? tips[idx - 1] : null;

    const isHtml = tip.content && (tip.content.includes("<") && tip.content.includes(">"));
    const contentHtml = isHtml ? sanitize(tip.content) : `<p style="white-space:pre-wrap;">${escapeHtml(tip.content)}</p>`;
    const cat = tip.category || "기타";
    const catCfg = categoryColor(cat);

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container" style="padding-bottom:32px;">
          <div style="padding:20px 0 16px;">
            <a href="./tips" style="font-size:0.82rem;color:var(--text-soft);text-decoration:none;">&larr; 꿀팁 게시판 목록</a>
          </div>

          <div class="board-view-page">
            <div class="board-view-header">
              <div class="board-view-meta">
                <span class="board-cat" style="color:${catCfg.color};background:${catCfg.bg};">${catCfg.icon} ${cat}</span>
              </div>
              <h1 class="board-view-title">${escapeHtml(tip.title)}</h1>
              <div class="board-view-info">
                <span>✍️ ${escapeHtml(tip.author || "-")}</span>
                ${tip.author_guild ? `<span>🏰 ${escapeHtml(tip.author_guild)}</span>` : ""}
                <span>📅 ${new Date(tip.created_at).toLocaleString("ko-KR")}</span>
                <span>👁 <span id="viewCount">${(tip.views || 0) + 1}</span></span>
                <span>❤️ ${tip.likes || 0}</span>
              </div>
            </div>

            <div class="board-view-body notice-content-body">${contentHtml}</div>

            <div class="board-view-footer">
              <div style="display:flex;align-items:center;gap:12px;">
                <a href="./tips" class="board-cancel-btn" style="text-decoration:none;">&larr; 목록</a>
                <button id="likeBtn" class="board-view-like">❤️ ${tip.likes || 0}</button>
              </div>
              <div class="board-view-actions">
                ${canDelete ? `<button id="deleteBtn" class="board-delete-btn">🗑️ 삭제</button>` : ""}
              </div>
            </div>
          </div>

          <!-- 이전/다음 글 -->
          <div class="board-post-nav">
            ${nextPost ? `
              <a class="board-post-nav-row" href="./tips-view?id=${nextPost.id}">
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
              <a class="board-post-nav-row" href="./tips-view?id=${prevPost.id}">
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

    // 좋아요 버튼
    document.getElementById("likeBtn").addEventListener("click", async () => {
      const r = await fetch(`${API_BASE}/api/tips/${tip.id}/like`, { method: "POST", headers: authHeaders() });
      const data = await r.json();
      document.getElementById("likeBtn").innerHTML = `❤️ ${data.likes}`;
    });

    // 삭제 버튼
    const deleteBtn = document.getElementById("deleteBtn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("삭제할까요?")) return;
        await fetch(`${API_BASE}/api/tips/${tip.id}`, { method: "DELETE", headers: authHeaders() });
        location.href = "./tips";
      });
    }

  } catch(e) {
    renderError(null, e);
  }
});
