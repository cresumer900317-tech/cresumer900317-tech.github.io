document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();

  const POSTS_PER_PAGE = 15;
  let currentPage = 1;
  let currentTag = "전체";

  try {
    const [res, blocks, noticesRes] = await Promise.all([
      fetch(`${API_BASE}/api/tips?summary=true`, { cache: "no-store", headers: authHeaders() }),
      getMyBlocks(),
      fetch(`${API_BASE}/api/notices?summary=true`, { cache: "no-store" }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]);
    const allTips = await res.json();
    // 최신 공지 1건 (API가 고정글 우선·최신순 정렬) — 게시판 상단 배너
    const topNotice = Array.isArray(noticesRes) && noticesRes.length ? noticesRes[0] : null;
    const blockedSet = new Set(blocks);
    const tips = (Array.isArray(allTips) ? allTips : []).filter(t => !blockedSet.has(t.author));

    // 컨텐츠 태그 — 제목 앞 [토벌전][전사] 헤더에서 파싱. 컨텐츠 태그만 필터 대상, 직업 등 나머지는 회색 배지.
    const TAG_CONFIG = {
      "토벌전": { color: "#ea580c", bg: "#fff7ed", icon: "⚔️" },
      "대항전": { color: "#dc2626", bg: "#fef2f2", icon: "🚩" },
      "길드수련장": { color: "#2563eb", bg: "#eff6ff", icon: "🥋" },
      "월드아레나": { color: "#7c3aed", bg: "#f5f3ff", icon: "🏟️" },
      "월드보스": { color: "#16a34a", bg: "#f0fdf4", icon: "🐲" },
      "콜로세움": { color: "#b45309", bg: "#fffbeb", icon: "🏛️" },
      "세팅": { color: "#0891b2", bg: "#ecfeff", icon: "🧰" },
    };
    const CONTENT_TAGS = Object.keys(TAG_CONFIG);
    const NEUTRAL = { color: "#6b7280", bg: "#f3f4f6", icon: "" };

    function parseTitle(title) {
      const tags = [];
      let rest = String(title || "");
      let m;
      while ((m = rest.match(/^\s*\[([^\[\]]{1,12})\]/))) {
        tags.push(m[1].trim());
        rest = rest.slice(m[0].length);
      }
      return { tags, text: rest.trim() || String(title || "") };
    }

    function tagBadges(tags) {
      return tags.map(tag => {
        const c = TAG_CONFIG[tag] || NEUTRAL;
        return `<span class="board-cat" style="color:${c.color};background:${c.bg};">${c.icon ? c.icon + " " : ""}${escapeHtml(tag)}</span>`;
      }).join("");
    }

    function getFiltered() {
      if (currentTag === "전체") return tips;
      return tips.filter(t => {
        const { tags } = parseTitle(t.title);
        if (currentTag === "기타") return !tags.some(tag => CONTENT_TAGS.includes(tag));
        return tags.includes(currentTag);
      });
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
          <div class="tips-hot-title">🔥 인기 공략</div>
          <div class="tips-hot-grid">
            ${hot.map((t, i) => {
              const p = parseTitle(t.title);
              return `
                <a class="tips-hot-card" href="./tips-view?id=${t.id}" style="text-decoration:none;">
                  <div class="tips-hot-rank">${medals[i]} ${i + 1}위</div>
                  <div class="tips-hot-card-title">${escapeHtml(p.text)}</div>
                  <div class="tips-hot-card-meta">
                    ${t.members_only ? `<span class="board-cat" style="color:#475569;background:#f1f5f9;font-size:0.68rem;padding:2px 8px;">🔒 길드원</span>` : ""}${tagBadges(p.tags)}
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
          <div class="board-empty-icon">📖</div>
          등록된 공략이 없습니다<br><small>첫 번째 공략을 공유해보세요!</small>
        </div>`;
      const filtered = getFiltered();
      const start = (currentPage - 1) * POSTS_PER_PAGE;
      return list.map((t, i) => {
        const p = parseTitle(t.title);
        const num = filtered.length - start - i;
        return `
        <a class="board-row" href="./tips-view?id=${t.id}" style="text-decoration:none;color:inherit;">
          <span class="board-row-num">${num}</span>
          <div class="board-row-title">
            ${t.members_only ? `<span class="board-cat" style="color:#475569;background:#f1f5f9;">🔒 길드원</span>` : ""}${tagBadges(p.tags)}
            <span class="board-ttl">${escapeHtml(p.text)}</span>
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
      const filtered = getFiltered();
      const start = (currentPage - 1) * POSTS_PER_PAGE;
      const pageItems = filtered.slice(start, start + POSTS_PER_PAGE);
      document.getElementById("tipList").innerHTML = renderList(pageItems);
      document.getElementById("tipPagination").innerHTML = renderPagination(filtered.length);
      document.getElementById("totalCount").textContent = `총 ${filtered.length}건`;
    }

    const tagButtons = ["전체", ...CONTENT_TAGS, "기타"].map(tag => {
      const cfg = TAG_CONFIG[tag];
      const icon = tag === "전체" ? "📋 " : cfg ? cfg.icon + " " : "📝 ";
      return `<button class="cat-btn${tag==="전체"?" active":""}" data-cat="${tag}">${icon}${tag}</button>`;
    }).join("");

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:28px 0 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <span class="page-eyebrow">COMMUNITY</span>
              <h1 class="page-title">공략 게시판</h1>
              <p class="page-desc">길드 컨텐츠 공략과 세팅을 공유해요</p>
            </div>
            <a href="./tips-write" class="board-write-btn" style="text-decoration:none;">✏️ 공략 등록</a>
          </div>

          ${topNotice ? `
          <a href="./notice-view?id=${topNotice.id}" style="display:flex;align-items:center;gap:10px;padding:12px 16px;margin-bottom:16px;background:var(--amber-tint);border:1px solid var(--amber-line);border-radius:12px;text-decoration:none;">
            <span style="flex-shrink:0;font-size:0.72rem;font-weight:700;color:var(--amber);background:var(--white);border:1px solid var(--amber-line);padding:3px 10px;border-radius:999px;">📢 공지</span>
            <span style="flex:1;min-width:0;font-size:0.88rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(topNotice.title)}</span>
            <span style="flex-shrink:0;font-size:0.78rem;color:var(--text-soft);">보기 →</span>
          </a>` : ""}

          <!-- 인기글 섹션 -->
          <div id="hotSection">${renderHotSection()}</div>

          <!-- 컨텐츠 태그 필터 -->
          <div id="catFilter" style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
            ${tagButtons}
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
        currentTag = btn.dataset.cat;
        currentPage = 1;
        document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === currentTag));
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
