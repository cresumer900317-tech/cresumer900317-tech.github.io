document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();

  const POSTS_PER_PAGE = 15;
  let currentPage = 1;

  try {
    const [res, blocks] = await Promise.all([
      fetch(`${API_BASE}/api/free`, { cache: "no-store" }),
      getMyBlocks(),
    ]);
    const allPosts = await res.json();
    const blockedSet = new Set(blocks);
    const posts = (Array.isArray(allPosts) ? allPosts : []).filter(p => !blockedSet.has(p.author));

    // 인기글 (좋아요 + 조회수 기준 상위 3개)
    function getHotPosts() {
      return [...posts]
        .sort((a, b) => ((b.likes || 0) * 3 + (b.views || 0)) - ((a.likes || 0) * 3 + (a.views || 0)))
        .slice(0, 3)
        .filter(t => (t.likes || 0) > 0 || (t.views || 0) > 0);
    }

    function renderHotSection() {
      const hot = getHotPosts();
      if (hot.length === 0) return "";
      const medals = ["&#x1f947;", "&#x1f948;", "&#x1f949;"];
      return `
        <div class="tips-hot-section">
          <div class="tips-hot-title">&#x1f525; &#xc778;&#xae30; &#xae00;</div>
          <div class="tips-hot-grid">
            ${hot.map((t, i) => {
              return `
                <a class="tips-hot-card" href="./free-view?id=${t.id}" style="text-decoration:none;">
                  <div class="tips-hot-rank">${medals[i]} ${i + 1}위</div>
                  <div class="tips-hot-card-title">${escapeHtml(t.title)}</div>
                  <div class="tips-hot-card-meta">
                    <span>❤️ ${t.likes || 0}</span>
                    <span>👁 ${t.views || 0}</span>
                    <span>${escapeHtml(t.author || "-")}</span>
                  </div>
                </a>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }

    function renderList(list) {
      if (!list.length) return `
        <div class="board-empty">
          <div class="board-empty-icon">💬</div>
          등록된 게시글이 없습니다<br><small>첫 번째 글을 작성해보세요!</small>
        </div>`;
      const start = (currentPage - 1) * POSTS_PER_PAGE;
      return list.map((t, i) => {
        const num = posts.length - start - i;
        return `
        <a class="board-row" href="./free-view?id=${t.id}" style="text-decoration:none;color:inherit;">
          <span class="board-row-num">${num}</span>
          <div class="board-row-title">
            <span class="board-ttl">${escapeHtml(t.title)}</span>
            <span class="board-stats">
              ${t.likes > 0 ? `<span class="stat-likes">❤️ ${t.likes}</span>` : ""}
              <span class="stat-views">👁 ${t.views || 0}</span>
            </span>
          </div>
          <span class="board-row-author">${escapeHtml(t.author||"-")}</span>
          <span class="board-row-date">${new Date(t.created_at).toLocaleDateString("ko-KR")}</span>
        </a>
      `;
      }).join("");
    }

    function renderPagination(total) {
      const totalPages = Math.ceil(total / POSTS_PER_PAGE);
      if (totalPages <= 1) return "";
      let html = `<div class="board-pagination">`;
      html += `<button ${currentPage <= 1 ? "disabled" : ""} data-page="${currentPage - 1}">&laquo;</button>`;
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
      }
      html += `<button ${currentPage >= totalPages ? "disabled" : ""} data-page="${currentPage + 1}">&raquo;</button>`;
      html += `</div>`;
      return html;
    }

    function render() {
      const start = (currentPage - 1) * POSTS_PER_PAGE;
      const pageItems = posts.slice(start, start + POSTS_PER_PAGE);
      document.getElementById("freeList").innerHTML = renderList(pageItems);
      document.getElementById("freePagination").innerHTML = renderPagination(posts.length);
      document.getElementById("totalCount").textContent = `총 ${posts.length}건`;
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:28px 0 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0 0 4px;">💬 자유게시판</h1>
              <p style="font-size:0.85rem;color:var(--text-soft);margin:0;">자유롭게 이야기를 나눠요</p>
            </div>
            <a href="./free-write" class="board-write-btn" style="text-decoration:none;">✏️ 글쓰기</a>
          </div>

          <!-- 인기글 섹션 -->
          <div id="hotSection">${renderHotSection()}</div>

          <div class="board-total-count" id="totalCount"></div>

          <div class="board-table">
            <div class="board-table-header">
              <span>번호</span><span>제목</span><span>작성자</span><span>날짜</span>
            </div>
            <div id="freeList"></div>
          </div>

          <div id="freePagination"></div>
        </div>
      </div>
    `;

    render();

    document.getElementById("freePagination").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (btn && !btn.disabled) {
        currentPage = Number(btn.dataset.page);
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

  } catch(e) {
    renderError(null, e);
  }
});
