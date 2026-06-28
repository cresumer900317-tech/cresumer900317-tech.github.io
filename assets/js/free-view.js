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
                ${user && !isOwner ? `<button id="reportPostBtn" class="board-report-btn">🚩 신고</button><button id="blockAuthorBtn" class="board-report-btn">🚫 차단</button>` : ""}
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
                <button id="commentSubmitBtn" class="macro-comment-submit" disabled>등록</button>
              </div>
              <p id="commentToast" style="font-size:0.8rem;margin-top:6px;min-height:1.2em;transition:opacity 0.3s;"></p>
            </div>
            ` : `<p style="font-size:0.84rem;color:var(--text-faint);margin-bottom:14px;">로그인 후 댓글을 작성할 수 있습니다.</p>`}
            <div id="commentList" class="macro-comment-list">
              <p style="color:var(--text-faint);font-size:0.84rem;text-align:center;padding:20px 0;">불러오는 중...</p>
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

    // 신고 / 차단 (글)
    const reportPostBtn = document.getElementById("reportPostBtn");
    if (reportPostBtn) reportPostBtn.addEventListener("click", () => reportContent("post", "free", post.id));
    const blockAuthorBtn = document.getElementById("blockAuthorBtn");
    if (blockAuthorBtn) blockAuthorBtn.addEventListener("click", async () => {
      if (await blockUser(post.author)) location.href = "./free";
    });

    // ── 댓글 기능 (tips-view와 동일, 경로만 free) ──
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

    const isMe = (author) => user && user.character_name === author;
    const canManage = (author) => user && (isMe(author) || user.role === "admin" || user.role === "superadmin");

    function showToast(msg, color) {
      const t = document.getElementById("commentToast");
      if (!t) return;
      t.textContent = msg;
      t.style.color = color;
      t.style.opacity = "1";
      setTimeout(() => { t.style.opacity = "0"; }, 2500);
    }

    function renderOneComment(c, isReply) {
      return `
        <div class="macro-comment-item${isMe(c.author) ? ' tip-comment-mine' : ''}${isReply ? ' tip-comment-reply' : ''}" data-id="${c.id}">
          ${isReply ? '<span class="tip-reply-indicator">↳</span>' : ''}
          <div class="tip-comment-content-wrap">
            <div class="macro-comment-header">
              <span class="macro-comment-author">${escapeHtml(c.author)}${isMe(c.author) ? ' <span class="tip-comment-me-badge">나</span>' : ''}${c.author_guild ? ' <span class="macro-comment-guild">' + escapeHtml(c.author_guild) + '</span>' : ''}</span>
              <span class="macro-comment-time">${timeAgo(c.created_at)}</span>
              <div class="tip-comment-actions">
                ${user && !isReply ? '<button class="tip-comment-reply-btn" data-id="' + c.id + '" data-author="' + escapeHtml(c.author) + '">답글</button>' : ''}
                ${canManage(c.author) ? (isMe(c.author) ? '<button class="tip-comment-edit-btn" data-id="' + c.id + '" data-content="' + c.content.replace(/"/g,"&quot;") + '">수정</button>' : '') + '<button class="macro-comment-del" data-id="' + c.id + '">삭제</button>' : ''}
                ${user && !isMe(c.author) ? '<button class="cmt-report-btn" data-id="' + c.id + '">신고</button><button class="cmt-block-btn" data-author="' + escapeHtml(c.author) + '">차단</button>' : ''}
              </div>
            </div>
            <p class="macro-comment-body" id="comment-body-${c.id}">${c.content.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")}</p>
          </div>
        </div>`;
    }

    function renderComments(comments) {
      if (!comments.length) {
        commentList.innerHTML = '<p style="color:var(--text-faint);font-size:0.84rem;text-align:center;padding:20px 0;">아직 댓글이 없습니다. 첫 번째로 댓글을 남겨보세요!</p>';
        return;
      }
      const parents = comments.filter(c => !c.parent_id);
      const childMap = {};
      comments.filter(c => c.parent_id).forEach(c => {
        if (!childMap[c.parent_id]) childMap[c.parent_id] = [];
        childMap[c.parent_id].push(c);
      });
      let html = "";
      parents.forEach(p => {
        html += renderOneComment(p, false);
        if (childMap[p.id]) childMap[p.id].forEach(r => { html += renderOneComment(r, true); });
      });
      commentList.innerHTML = html;

      commentList.querySelectorAll(".macro-comment-del").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (!confirm("댓글을 삭제하시겠습니까?")) return;
          await fetch(`${API_BASE}/api/free/comments/${btn.dataset.id}`, {
            method: "DELETE", headers: { "Authorization": "Bearer " + token }
          });
          loadComments();
        });
      });

      commentList.querySelectorAll(".cmt-report-btn").forEach(btn =>
        btn.addEventListener("click", () => reportContent("comment", "free", btn.dataset.id)));
      commentList.querySelectorAll(".cmt-block-btn").forEach(btn =>
        btn.addEventListener("click", async () => { if (await blockUser(btn.dataset.author)) loadComments(); }));

      commentList.querySelectorAll(".tip-comment-edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const cId = btn.dataset.id;
          const bodyEl = document.getElementById("comment-body-" + cId);
          const original = btn.dataset.content;
          const item = bodyEl.closest(".macro-comment-item");
          if (item.querySelector(".tip-comment-edit-area")) return;
          bodyEl.style.display = "none";
          const editArea = document.createElement("div");
          editArea.className = "tip-comment-edit-area";
          editArea.innerHTML = `
            <textarea class="macro-comment-input" style="min-height:60px;margin-bottom:8px;" maxlength="500">${original.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</textarea>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
              <button class="tip-comment-cancel-btn">취소</button>
              <button class="macro-comment-submit" style="padding:6px 14px;font-size:0.8rem;">저장</button>
            </div>
          `;
          bodyEl.parentNode.insertBefore(editArea, bodyEl.nextSibling);
          editArea.querySelector(".tip-comment-cancel-btn").addEventListener("click", () => {
            editArea.remove();
            bodyEl.style.display = "";
          });
          editArea.querySelector(".macro-comment-submit").addEventListener("click", async function() {
            const newContent = editArea.querySelector("textarea").value.trim();
            if (!newContent) return alert("내용을 입력해주세요");
            this.disabled = true;
            this.textContent = "저장 중...";
            try {
              const res = await fetch(`${API_BASE}/api/free/comments/${cId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
                body: JSON.stringify({ content: newContent })
              });
              if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "수정 실패"); }
              loadComments();
            } catch(e) { alert(e.message); this.disabled = false; this.textContent = "저장"; }
          });
        });
      });

      commentList.querySelectorAll(".tip-comment-reply-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const parentId = btn.dataset.id;
          const parentAuthor = btn.dataset.author;
          const item = btn.closest(".macro-comment-item");
          const existing = item.parentNode.querySelector('.tip-reply-form[data-parent="' + parentId + '"]');
          if (existing) { existing.remove(); return; }
          commentList.querySelectorAll(".tip-reply-form").forEach(f => f.remove());
          const replyForm = document.createElement("div");
          replyForm.className = "tip-reply-form";
          replyForm.dataset.parent = parentId;
          replyForm.innerHTML = `
            <div class="tip-reply-form-inner">
              <span class="tip-reply-indicator">↳</span>
              <div style="flex:1;">
                <textarea class="macro-comment-input tip-reply-input" placeholder="@${parentAuthor} 에게 답글 (최대 500자)" maxlength="500"></textarea>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px;">
                  <button class="tip-comment-cancel-btn tip-reply-cancel">취소</button>
                  <button class="macro-comment-submit tip-reply-submit" style="padding:6px 14px;font-size:0.8rem;" disabled>답글 등록</button>
                </div>
              </div>
            </div>
          `;
          let insertAfter = item;
          let next = item.nextElementSibling;
          while (next && next.classList.contains("tip-comment-reply")) {
            insertAfter = next;
            next = next.nextElementSibling;
          }
          insertAfter.after(replyForm);
          const textarea = replyForm.querySelector("textarea");
          const submitBtn = replyForm.querySelector(".tip-reply-submit");
          textarea.focus();
          textarea.addEventListener("input", () => { submitBtn.disabled = !textarea.value.trim(); });
          replyForm.querySelector(".tip-reply-cancel").addEventListener("click", () => replyForm.remove());
          submitBtn.addEventListener("click", async () => {
            const content = textarea.value.trim();
            if (!content) return;
            submitBtn.disabled = true;
            submitBtn.textContent = "등록 중...";
            try {
              const res = await fetch(`${API_BASE}/api/free/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
                body: JSON.stringify({ content, author: user.character_name, author_guild: user.guild || "", parent_id: Number(parentId) })
              });
              if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "등록 실패"); }
              showToast("답글이 등록되었습니다.", "var(--green, #16a34a)");
              loadComments();
            } catch(e) { alert(e.message); submitBtn.disabled = false; submitBtn.textContent = "답글 등록"; }
          });
        });
      });
    }

    async function loadComments() {
      try {
        const [res, blocks] = await Promise.all([
          fetch(`${API_BASE}/api/free/${postId}/comments`),
          getMyBlocks(),
        ]);
        const data = await res.json();
        const blockedSet = new Set(blocks);
        renderComments((Array.isArray(data) ? data : []).filter(c => !blockedSet.has(c.author)));
      } catch { commentList.innerHTML = '<p style="color:var(--text-faint);font-size:0.84rem;text-align:center;">댓글을 불러올 수 없습니다.</p>'; }
    }

    if (user) {
      const commentInput = document.getElementById("commentInput");
      const commentCharCount = document.getElementById("commentCharCount");
      const commentSubmitBtn = document.getElementById("commentSubmitBtn");
      commentInput.addEventListener("input", () => {
        commentCharCount.textContent = commentInput.value.length + " / 500";
        commentSubmitBtn.disabled = !commentInput.value.trim();
      });
      commentSubmitBtn.addEventListener("click", async () => {
        const content = commentInput.value.trim();
        if (!content) return;
        commentSubmitBtn.disabled = true;
        commentSubmitBtn.textContent = "등록 중...";
        try {
          const res = await fetch(`${API_BASE}/api/free/${postId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ content, author: user.character_name, author_guild: user.guild || "" })
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "등록 실패"); }
          commentInput.value = "";
          commentCharCount.textContent = "0 / 500";
          showToast("댓글이 등록되었습니다.", "var(--green, #16a34a)");
          loadComments();
        } catch (e) { showToast(e.message, "#dc2626"); }
        finally { commentSubmitBtn.disabled = true; commentSubmitBtn.textContent = "등록"; }
      });
    }

    loadComments();

  } catch(e) {
    renderError(null, e);
  }
});
