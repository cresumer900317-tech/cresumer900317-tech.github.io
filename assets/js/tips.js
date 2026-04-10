document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();

  const POSTS_PER_PAGE = 15;
  let currentPage = 1;
  let currentCat = "전체";

  try {
    const res = await fetch(`${API_BASE}/api/tips`, { cache: "no-store" });
    const tips = await res.json();

    const catConfig = {
      "공략": { color: "#ea580c", bg: "#fff7ed", icon: "⚔️" },
      "성장": { color: "#2563eb", bg: "#eff6ff", icon: "📈" },
      "캐릭터": { color: "#0891b2", bg: "#ecfeff", icon: "🧙" },
      "아이템": { color: "#7c3aed", bg: "#f5f3ff", icon: "🎒" },
      "기타": { color: "#6b7280", bg: "#f9fafb", icon: "📝" },
    };

    function getCat(cat) {
      return catConfig[cat] || catConfig["기타"];
    }

    function getFiltered() {
      return currentCat === "전체" ? tips : tips.filter(t => t.category === currentCat);
    }

    // 인기글 (좋아요 + 조회수 기준 상위 3개)
    function getHotPosts() {
      return [...tips]
        .sort((a, b) => ((b.likes || 0) * 3 + (b.views || 0)) - ((a.likes || 0) * 3 + (a.views || 0)))
        .slice(0, 3)
        .filter(t => (t.likes || 0) > 0 || (t.views || 0) > 0);
    }

    function renderHotSection() {
      const hot = getHotPosts();
      if (hot.length === 0) return "";
      const medals = ["🥇", "🥈", "🥉"];
      return `
        <div class="tips-hot-section">
          <div class="tips-hot-title">🔥 인기 꿀팁</div>
          <div class="tips-hot-grid">
            ${hot.map((t, i) => {
              const c = getCat(t.category);
              return `
                <a class="tips-hot-card" href="./tips-view?id=${t.id}" style="text-decoration:none;">
                  <div class="tips-hot-rank">${medals[i]} ${i + 1}위</div>
                  <div class="tips-hot-card-title">${escapeHtml(t.title)}</div>
                  <div class="tips-hot-card-meta">
                    <span class="board-cat" style="color:${c.color};background:${c.bg};font-size:0.68rem;padding:2px 8px;">${c.icon} ${t.category || "기타"}</span>
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

    function stripHtml(html) {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || "";
    }

    function getPreview(content) {
      const text = stripHtml(content || "");
      return text.length > 50 ? text.substring(0, 50) + "…" : text;
    }

    function renderList(list) {
      if (!list.length) return `
        <div class="board-empty">
          <div class="board-empty-icon">💡</div>
          등록된 꿀팁이 없습니다<br><small>첫 번째 꿀팁을 공유해보세요!</small>
        </div>`;
      return list.map(t => {
        const c = getCat(t.category);
        return `
        <a class="board-row" href="./tips-view?id=${t.id}" style="text-decoration:none;color:inherit;">
          <div class="board-row-left">
            <span class="board-cat" style="color:${c.color};background:${c.bg};">${c.icon} ${t.category||"기타"}</span>
            <span class="board-ttl">${escapeHtml(t.title)}</span>
          </div>
          <div class="board-row-right">
            <span class="board-stats">
              ${t.likes > 0 ? `<span class="stat-likes">❤️ ${t.likes}</span>` : ""}
              <span class="stat-views">👁 ${t.views || 0}</span>
            </span>
            <span class="board-auth">${escapeHtml(t.author||"-")}</span>
            <span class="board-dt">${new Date(t.created_at).toLocaleDateString("ko-KR")}</span>
          </div>
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
      const filtered = getFiltered();
      const start = (currentPage - 1) * POSTS_PER_PAGE;
      const pageItems = filtered.slice(start, start + POSTS_PER_PAGE);
      document.getElementById("tipList").innerHTML = renderList(pageItems);
      document.getElementById("tipPagination").innerHTML = renderPagination(filtered.length);
      document.getElementById("totalCount").textContent = `총 ${filtered.length}건`;
    }

    const catButtons = ["전체","공략","성장","캐릭터","아이템","기타"].map(c => {
      const cfg = catConfig[c];
      const icon = cfg ? cfg.icon + " " : "";
      return `<button class="cat-btn${c==="전체"?" active":""}" data-cat="${c}">${c === "전체" ? "📋 " : icon}${c}</button>`;
    }).join("");

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

          <!-- 인기글 섹션 -->
          <div id="hotSection">${renderHotSection()}</div>

          <!-- 카테고리 필터 -->
          <div id="catFilter" style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
            ${catButtons}
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
