document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();

  function normalizeHrefs(html) {
    return html.replace(/href="((?!https?:\/\/|data:)[^"]+)"/gi, (_, url) => {
      return `href="https://${url}"`;
    });
  }

  function linkifyText(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT, null);
    const urlRe = /(?:https?:\/\/|www\.)[^\s<]+/g;
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.parentElement?.closest("a")) continue;
      if (urlRe.test(walker.currentNode.textContent)) nodes.push(walker.currentNode);
      urlRe.lastIndex = 0;
    }
    nodes.forEach(node => {
      const frag = document.createDocumentFragment();
      let last = 0;
      node.textContent.replace(urlRe, (match, offset) => {
        if (offset > last) frag.appendChild(document.createTextNode(node.textContent.slice(last, offset)));
        const a = document.createElement("a");
        a.href = match.startsWith("http") ? match : `https://${match}`;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = match;
        frag.appendChild(a);
        last = offset + match.length;
      });
      if (last < node.textContent.length) frag.appendChild(document.createTextNode(node.textContent.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
    return tmp.innerHTML;
  }

  function sanitize(html) {
    const normalized = normalizeHrefs(html);
    const clean = DOMPurify.sanitize(normalized, {
      ALLOWED_TAGS: ["b","i","u","s","em","strong","p","br","ul","ol","li","h1","h2","h3",
        "span","a","img","blockquote","pre","code","sub","sup","hr"],
      ALLOWED_ATTR: ["href","src","alt","style","target","class","width","height"],
      ADD_ATTR: ["target"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|data):)/i,
    });
    return linkifyText(clean);
  }

  // 좋아요 중복 방지 (localStorage)
  function hasLiked(postId) {
    const liked = JSON.parse(localStorage.getItem("free_likes") || "[]");
    return liked.includes(postId);
  }
  function markLiked(postId) {
    const liked = JSON.parse(localStorage.getItem("free_likes") || "[]");
    if (!liked.includes(postId)) {
      liked.push(postId);
      localStorage.setItem("free_likes", JSON.stringify(liked));
    }
  }

  try {
    const params = new URLSearchParams(location.search);
    const postId = Number(params.get("id"));
    if (!postId) { location.href = "./free"; return; }

    // 단건 조회 + 인접글 + 조회수 증가를 병렬로 요청
    const [postRes, adjRes, viewRes] = await Promise.all([
      fetch(`${API_BASE}/api/free/${postId}`, { cache: "no-store" }),
      fetch(`${API_BASE}/api/free/${postId}/adjacent`, { cache: "no-store" }),
      fetch(`${API_BASE}/api/free/${postId}/view`, { method: "POST" }),
    ]);

    if (!postRes.ok) {
      document.querySelector("main").innerHTML = `
        <div class="page-card"><div class="container" style="padding:60px 20px;text-align:center;">
          <p style="font-size:1rem;color:var(--text-soft);">존재하지 않는 게시글입니다.</p>
          <a href="./free" class="board-cancel-btn" style="display:inline-block;margin-top:16px;text-decoration:none;">목록으로</a>
        </div></div>`;
      return;
    }

    const post = await postRes.json();
    const adjacent = await adjRes.json();
    const viewData = await viewRes.json();

    const prevPost = adjacent.prev;
    const nextPost = adjacent.next;

    const isOwner = user?.character_name === post.author;
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";
    const canDelete = isOwner || isAdmin;

    const isHtml = post.content && (post.content.includes("<") && post.content.includes(">"));
    const contentHtml = isHtml ? sanitize(post.content) : `<p style="white-space:pre-wrap;">${escapeHtml(post.content)}</p>`;

    const alreadyLiked = hasLiked(postId);

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container" style="padding-bottom:32px;">
          <div style="padding:20px 0 16px;">
            <a href="./free" style="font-size:0.82rem;color:var(--text-soft);text-decoration:none;">&larr; 자유게시판 목록</a>
          </div>

          <div class="board-view-page">
            <div class="board-view-header">
              <h1 class="board-view-title">${escapeHtml(post.title)}</h1>
              <div class="board-view-info">
                <span>✍️ ${escapeHtml(post.author || "-")}</span>
                ${post.author_guild ? `<span>🏰 ${escapeHtml(post.author_guild)}</span>` : ""}
                <span>📅 ${new Date(post.created_at).toLocaleString("ko-KR")}</span>
                <span>👁 <span id="viewCount">${viewData.views || (post.views || 0) + 1}</span></span>
                <span>❤️ ${post.likes || 0}</span>
              </div>
            </div>

            <div class="board-view-body notice-content-body">${contentHtml}</div>

            <div class="board-view-footer">
              <div style="display:flex;align-items:center;gap:12px;">
                <a href="./free" class="board-cancel-btn" style="text-decoration:none;">&larr; 목록</a>
                <button id="likeBtn" class="board-view-like${alreadyLiked ? " liked" : ""}">❤️ ${post.likes || 0}</button>
              </div>
              <div class="board-view-actions">
                ${canDelete ? `<button id="deleteBtn" class="board-delete-btn">🗑️ 삭제</button>` : ""}
              </div>
            </div>
          </div>

          <!-- 이전/다음 글 -->
          <div class="board-post-nav">
            ${nextPost ? `
              <a class="board-post-nav-row" href="./free-view?id=${nextPost.id}">
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
              <a class="board-post-nav-row" href="./free-view?id=${prevPost.id}">
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
      if (hasLiked(postId)) {
        alert("이미 좋아요를 누르셨습니다.");
        return;
      }
      const r = await fetch(`${API_BASE}/api/free/${post.id}/like`, { method: "POST", headers: authHeaders() });
      const data = await r.json();
      markLiked(postId);
      const btn = document.getElementById("likeBtn");
      btn.innerHTML = `❤️ ${data.likes}`;
      btn.classList.add("liked");
    });

    // 삭제 버튼
    const deleteBtn = document.getElementById("deleteBtn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("삭제할까요?")) return;
        await fetch(`${API_BASE}/api/free/${post.id}`, { method: "DELETE", headers: authHeaders() });
        location.href = "./free";
      });
    }

  } catch(e) {
    renderError(null, e);
  }
});
