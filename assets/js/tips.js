document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();

  const POSTS_PER_PAGE = 15;
  let currentPage = 1;
  let currentCat = "전체";

  try {
    const res = await fetch(`${API_BASE}/api/tips`, { cache: "no-store" });
    const tips = await res.json();

    function categoryColor(cat) {
      const map = { "공략": "#f59e0b", "성장": "#22c55e", "캐릭터": "#3b82f6", "아이템": "#8b5cf6", "기타": "#6b7280" };
      return map[cat] || "#6b7280";
    }

    function getFiltered() {
      return currentCat === "전체" ? tips : tips.filter(t => t.category === currentCat);
    }

    function renderList(list) {
      if (!list.length) return `<div class="board-empty">등록된 꿀팁이 없습니다<br><small>첫 번째 꿀팁을 공유해보세요!</small></div>`;
      return list.map(t => `
        <a class="board-row" href="./tips-view?id=${t.id}" style="text-decoration:none;color:inherit;">
          <div class="board-row-left">
            <span class="board-num">${t.id}</span>
            <span class="board-cat" style="color:${categoryColor(t.category)};background:${categoryColor(t.category)}15;">${t.category||"기타"}</span>
            <span class="board-ttl">${escapeHtml(t.title)}</span>
            ${t.likes > 0 ? `<span style="font-size:0.72rem;color:#ef4444;margin-left:4px;">❤️ ${t.likes}</span>` : ""}
          </div>
          <div class="board-row-right">
            <span class="board-auth">${escapeHtml(t.author||"-")}</span>
            <span class="board-dt">${new Date(t.created_at).toLocaleDateString("ko-KR")}</span>
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

    function render() {
      const filtered = getFiltered();
      const start = (currentPage - 1) * POSTS_PER_PAGE;
      const pageItems = filtered.slice(start, start + POSTS_PER_PAGE);
      document.getElementById("tipList").innerHTML = renderList(pageItems);
      document.getElementById("tipPagination").innerHTML = renderPagination(filtered.length);
      document.getElementById("totalCount").textContent = `총 ${filtered.length}건`;
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:28px 0 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0 0 4px;">💡 꿀팁 게시판</h1>
              <p style="font-size:0.85rem;color:var(--text-soft);margin:0;">길드원들의 꿀팁을 공유해요</p>
            </div>
            <a href="./tips-write" class="board-write-btn" style="text-decoration:none;">✏️ 꿀팁 등록</a>
          </div>

          <!-- 카테고리 필터 -->
          <div id="catFilter" style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
            ${["전체","공략","성장","캐릭터","아이템","기타"].map(c => `
              <button class="cat-btn${c==="전체"?" active":""}" data-cat="${c}">${c}</button>
            `).join("")}
          </div>

          <div class="board-total-count" id="totalCount"></div>

          <div class="board-table">
            <div class="board-table-header">
              <span>번호</span><span>제목</span><span>작성자</span><span>날짜</span>
            </div>
            <div id="tipList"></div>
          </div>

          <div id="tipPagination"></div>
        </div>
      </div>
    `;

    render();

    document.getElementById("catFilter").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cat]");
      if (btn) {
        currentCat = btn.dataset.cat;
        currentPage = 1;
        document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === currentCat));
        render();
      }
    });

    document.getElementById("tipPagination").addEventListener("click", (e) => {
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
