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

  // 좋아요 중복 방지 (localStorage)
  function hasLiked(tipId) {
    const liked = JSON.parse(localStorage.getItem("tip_likes") || "[]");
    return liked.includes(tipId);
  }
  function markLiked(tipId) {
    const liked = JSON.parse(localStorage.getItem("tip_likes") || "[]");
    if (!liked.includes(tipId)) {
      liked.push(tipId);
      localStorage.setItem("tip_likes", JSON.stringify(liked));
    }
  }

  try {
    const params = new URLSearchParams(location.search);
    const postId = Number(params.get("id"));
    if (!postId) { location.href = "./tips"; return; }

    // 단건 조회 + 인접글 + 조회수 증가를 병렬로 요청
    const [tipRes, adjRes, viewRes] = await Promise.all([
      fetch(`${API_BASE}/api/tips/${postId}`, { cache: "no-store" }),
      fetch(`${API_BASE}/api/tips/${postId}/adjacent`, { cache: "no-store" }),
      fetch(`${API_BASE}/api/tips/${postId}/view`, { method: "POST" }),
    ]);

    if (!tipRes.ok) {
      document.querySelector("main").innerHTML = `
        <div class="page-card"><div class="container" style="padding:60px 20px;text-align:center;">
          <p style="font-size:1rem;color:var(--text-soft);">존재하지 않는 게시글입니다.</p>
          <a href="./tips" class="board-cancel-btn" style="display:inline-block;margin-top:16px;text-decoration:none;">목록으로</a>
        </div></div>`;
      return;
    }

    const tip = await tipRes.json();
    const adjacent = await adjRes.json();
    const viewData = await viewRes.json();

    const prevPost = adjacent.prev;
    const nextPost = adjacent.next;

    const isOwner = user?.character_name === tip.author;
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";
    const canDelete = isOwner || isAdmin;

    const isHtml = tip.content && (tip.content.includes("<") && tip.content.includes(">"));
    const contentHtml = isHtml ? sanitize(tip.content) : `<p style="white-space:pre-wrap;">${escapeHtml(tip.content)}</p>`;
    const cat = tip.category || "기타";
    const catCfg = categoryColor(cat);

    const alreadyLiked = hasLiked(postId);

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
                <span>👁 <span id="viewCount">${viewData.views || (tip.views || 0) + 1}</span></span>
                <span>❤️ ${tip.likes || 0}</span>
              </div>
            </div>

            <div class="board-view-body notice-content-body">${contentHtml}</div>

            <div class="board-view-footer">
              <div style="display:flex;align-items:center;gap:12px;">
                <a href="./tips" class="board-cancel-btn" style="text-decoration:none;">&larr; 목록</a>
                <button id="likeBtn" class="board-view-like${alreadyLiked ? " liked" : ""}">❤️ ${tip.likes || 0}</button>
              </div>
              <div class="board-view-actions">
                ${canDelete ? `<button id="deleteBtn" class="board-delete-btn">🗑️ 삭제</button>` : ""}
              </div>
            </div>
          </div>

          <!-- 댓글 -->
          <div class="board-comments-section" style="margin-top:28px;border-top:1px solid var(--border);padding-top:24px;">
            <h3 style="font-size:0.95rem;font-weight:700;color:var(--text);margin-bottom:14px;">💬 댓글</h3>
            ${user ? `
            <div class="macro-comment-form">
              <textarea id="commentInput" class="macro-comment-input" placeholder="댓글을 작성해주세요 (최대 500자)" maxlength="500"></textarea>
              <div class="macro-comment-form-footer">
                <span id="commentCharCount" class="macro-comment-char">0 / 500</span>
                <button id="commentSubmitBtn" class="macro-comment-submit">등록</button>
              </div>
            </div>
            ` : `<p style="font-size:0.84rem;color:var(--text-faint);margin-bottom:14px;">로그인 후 댓글을 작성할 수 있습니다.</p>`}
            <div id="commentList" class="macro-comment-list">
              <p style="color:var(--text-faint);font-size:0.84rem;text-align:center;padding:20px 0;">불러오는 중...</p>
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
      if (hasLiked(postId)) {
        alert("이미 좋아요를 누르셨습니다.");
        return;
      }
      const r = await fetch(`${API_BASE}/api/tips/${tip.id}/like`, { method: "POST", headers: authHeaders() });
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
        await fetch(`${API_BASE}/api/tips/${tip.id}`, { method: "DELETE", headers: authHeaders() });
        location.href = "./tips";
      });
    }

    // ── 댓글 기능 ──
    const token = getToken();
    const commentList = document.getElementById("commentList");

    function timeAgo(dateStr) {
      const diff = Date.now() - new Date(dateStr).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return "방금 전";
      if (m < 60) return m + "분 전";
      const h = Math.floor(m / 60);
      if (h < 24) return h + "시간 전";
      const d = Math.floor(h / 24);
      if (d < 30) return d + "일 전";
      return new Date(dateStr).toLocaleDateString("ko-KR");
    }

    function renderComments(comments) {
      if (!comments.length) {
        commentList.innerHTML = '<p style="color:var(--text-faint);font-size:0.84rem;text-align:center;padding:20px 0;">아직 댓글이 없습니다. 첫 번째로 댓글을 남겨보세요!</p>';
        return;
      }
      commentList.innerHTML = comments.map(c => `
        <div class="macro-comment-item" data-id="${c.id}">
          <div class="macro-comment-header">
            <span class="macro-comment-author">${escapeHtml(c.author)}${c.author_guild ? ' <span class="macro-comment-guild">' + escapeHtml(c.author_guild) + '</span>' : ''}</span>
            <span class="macro-comment-time">${timeAgo(c.created_at)}</span>
          </div>
          <p class="macro-comment-body">${c.content.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")}</p>
          ${(user && (c.author === user.character_name || user.role === "admin" || user.role === "superadmin"))
            ? '<button class="macro-comment-del" data-id="' + c.id + '">삭제</button>' : ''}
        </div>
      `).join("");
      commentList.querySelectorAll(".macro-comment-del").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (!confirm("댓글을 삭제하시겠습니까?")) return;
          await fetch(`${API_BASE}/api/tips/comments/${btn.dataset.id}`, {
            method: "DELETE", headers: { "Authorization": "Bearer " + token }
          });
          loadComments();
        });
      });
    }

    async function loadComments() {
      try {
        const res = await fetch(`${API_BASE}/api/tips/${postId}/comments`);
        const data = await res.json();
        renderComments(data);
      } catch { commentList.innerHTML = '<p style="color:var(--text-faint);font-size:0.84rem;text-align:center;">댓글을 불러올 수 없습니다.</p>'; }
    }

    if (user) {
      const commentInput = document.getElementById("commentInput");
      const commentCharCount = document.getElementById("commentCharCount");
      const commentSubmitBtn = document.getElementById("commentSubmitBtn");

      commentInput.addEventListener("input", () => {
        commentCharCount.textContent = commentInput.value.length + " / 500";
      });

      commentSubmitBtn.addEventListener("click", async () => {
        const content = commentInput.value.trim();
        if (!content) return alert("내용을 입력해주세요");
        commentSubmitBtn.disabled = true;
        commentSubmitBtn.textContent = "등록 중...";
        try {
          const res = await fetch(`${API_BASE}/api/tips/${postId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ content, author: user.character_name, author_guild: user.guild || "" })
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "등록 실패"); }
          commentInput.value = "";
          commentCharCount.textContent = "0 / 500";
          loadComments();
        } catch (e) { alert(e.message); }
        finally { commentSubmitBtn.disabled = false; commentSubmitBtn.textContent = "등록"; }
      });
    }

    loadComments();

  } catch(e) {
    renderError(null, e);
  }
});
