document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const POSTS_PER_PAGE = 15;
  let currentPage = 1;

  try {
    const res = await fetch(`${API_BASE}/api/notices?summary=true`, { cache: "no-store" });
    const notices = await res.json();

    function categoryColor(cat) {
      const map = { "공지": "#f59e0b", "이벤트": "#3b82f6", "길드": "#22c55e", "운영": "#8b5cf6" };
      return map[cat] || "#6b7280";
    }

    function renderList(list) {
      if (!list.length) return `<div class="board-empty">등록된 공지가 없습니다</div>`;
      return list.map(n => `
        <a class="board-row${n.is_pinned ? " board-row-pinned" : ""}" href="./notice-view?id=${n.id}" style="text-decoration:none;color:inherit;">
          <div class="board-row-left">
            ${n.is_pinned ? `<span class="board-pin">📌</span>` : `<span class="board-num">${n.id}</span>`}
            <span class="board-cat" style="color:${categoryColor(n.category)};background:${categoryColor(n.category)}15;">${n.category||"공지"}</span>
            <span class="board-ttl">${escapeHtml(n.title)}</span>
          </div>
          <div class="board-row-right">
            <span class="board-auth">${escapeHtml(n.author||"운영진")}</span>
            <span class="board-dt">${new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
          </div>
        </a>
      `).join("");
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

    function paginate(list) {
      // 고정글은 항상 맨 위에 표시
      const pinned = list.filter(n => n.is_pinned);
      const normal = list.filter(n => !n.is_pinned);
      const start = (currentPage - 1) * POSTS_PER_PAGE;
      const pageNormal = normal.slice(start, start + POSTS_PER_PAGE);
      return currentPage === 1 ? [...pinned, ...pageNormal] : pageNormal;
    }

    function render() {
      const normalCount = notices.filter(n => !n.is_pinned).length;
      document.getElementById("noticeList").innerHTML = renderList(paginate(notices));
      document.getElementById("noticePagination").innerHTML = renderPagination(normalCount);
      document.getElementById("totalCount").textContent = `총 ${notices.length}건`;
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:28px 0 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <span class="page-eyebrow">GUILD NOTICE</span>
              <h1 class="page-title">공지사항</h1>
              <p class="page-desc">길드 운영 관련 공지를 확인하세요</p>
            </div>
            ${isAdmin ? `<a href="./notice-write" class="board-write-btn" style="text-decoration:none;">✏️ 공지 작성</a>` : ""}
          </div>

          <div class="board-total-count" id="totalCount"></div>

          <div class="board-table">
            <div class="board-table-header">
              <span>번호</span><span>제목</span><span>작성자</span><span>날짜</span>
            </div>
            <div id="noticeList"></div>
          </div>

          <div id="noticePagination"></div>
        </div>
      </div>
    `;

    render();

    document.getElementById("noticePagination").addEventListener("click", (e) => {
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
