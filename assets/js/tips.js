document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();

  try {
    const res = await fetch(`${API_BASE}/api/tips`, { cache: "no-store" });
    const tips = await res.json();

    function categoryColor(cat) {
      const map = { "공략": "#f59e0b", "성장": "#22c55e", "캐릭터": "#3b82f6", "아이템": "#8b5cf6", "기타": "#6b7280" };
      return map[cat] || "#6b7280";
    }

    function renderList(list) {
      if (!list.length) return `<div class="board-empty">등록된 꿀팁이 없습니다<br><small>첫 번째 꿀팁을 공유해보세요!</small></div>`;
      return list.map(t => `
        <div class="board-row" data-tip-id="${t.id}" style="cursor:pointer;">
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
        </div>
      `).join("");
    }

    let currentCat = "전체";
    function filterAndRender(cat) {
      currentCat = cat;
      document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
      const filtered = cat === "전체" ? tips : tips.filter(t => t.category === cat);
      document.getElementById("tipList").innerHTML = renderList(filtered);
    }

    function openTip(id) {
      const tip = tips.find(t => t.id === id);
      if (!tip) return;

      const isOwner = user?.character_name === tip.author;
      const isAdmin = user?.role === "admin";

      document.getElementById("tipContent").innerHTML = `
        <div style="padding:28px 28px 24px;">
          <div style="margin-bottom:10px;">
            <span class="board-cat" style="font-size:0.82rem;">${tip.category||"기타"}</span>
          </div>
          <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:10px;line-height:1.4;">${escapeHtml(tip.title)}</h2>
          <div style="font-size:0.8rem;color:#9ca3af;margin-bottom:20px;display:flex;gap:16px;flex-wrap:wrap;">
            <span>${escapeHtml(tip.author||"-")}</span>
            ${tip.author_guild ? `<span>${escapeHtml(tip.author_guild)}</span>` : ""}
            <span>${new Date(tip.created_at).toLocaleString("ko-KR")}</span>
          </div>
          <div style="font-size:0.92rem;line-height:1.9;white-space:pre-wrap;color:#374151;border-top:1px solid #f3f4f6;padding-top:20px;">${escapeHtml(tip.content)}</div>
          <div style="margin-top:20px;display:flex;align-items:center;gap:8px;">
            <button id="tipLikeBtn" data-id="${tip.id}" style="padding:7px 16px;background:#fff;border:1px solid #fca5a5;border-radius:999px;color:#ef4444;font-weight:700;font-size:0.85rem;cursor:pointer;">
              ❤️ ${tip.likes||0}
            </button>
          </div>
          <div style="margin-top:16px;display:flex;justify-content:space-between;">
            <button id="tipBackBtn" class="board-cancel-btn">← 목록</button>
            ${(isOwner || isAdmin) ? `<button id="tipDeleteBtn" data-id="${tip.id}" class="board-delete-btn">🗑️ 삭제</button>` : ""}
          </div>
        </div>
      `;
      document.getElementById("tipModal").style.display = "flex";
      document.body.style.overflow = "hidden";

      document.getElementById("tipBackBtn").addEventListener("click", closeTipModal);
      document.getElementById("tipLikeBtn").addEventListener("click", () => likeTip(tip.id));
      const delBtn = document.getElementById("tipDeleteBtn");
      if (delBtn) delBtn.addEventListener("click", () => deleteTip(Number(delBtn.dataset.id)));
    }

    function closeTipModal() {
      document.getElementById("tipModal").style.display = "none";
      document.body.style.overflow = "";
    }

    async function submitTip() {
      const title = document.getElementById("tTitle").value.trim();
      const content = document.getElementById("tContent").value.trim();
      const category = document.getElementById("tCat").value;
      if (!title || !content) { alert("제목과 내용을 입력해주세요"); return; }
      if (!user) { alert("로그인이 필요합니다"); return; }
      const res = await fetch(`${API_BASE}/api/tips`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category, author: user.character_name, author_guild: user.guild||"" }),
      });
      if (res.ok) location.reload();
      else alert("등록 실패");
    }

    async function likeTip(id) {
      const res = await fetch(`${API_BASE}/api/tips/${id}/like`, { method: "POST" });
      const data = await res.json();
      const btn = document.getElementById("tipLikeBtn");
      if (btn) btn.innerHTML = `❤️ ${data.likes}`;
    }

    async function deleteTip(id) {
      if (!confirm("삭제할까요?")) return;
      await fetch(`${API_BASE}/api/tips/${id}`, { method: "DELETE" });
      closeTipModal(); location.reload();
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:28px 0 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0 0 4px;">💡 꿀팁 게시판</h1>
              <p style="font-size:0.85rem;color:var(--text-soft);margin:0;">길드원들의 꿀팁을 공유해요</p>
            </div>
            <button id="showWriteBtn" class="board-write-btn">✏️ 꿀팁 등록</button>
          </div>

          <!-- 카테고리 필터 -->
          <div id="catFilter" style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
            ${["전체","공략","성장","캐릭터","아이템","기타"].map(c => `
              <button class="cat-btn${c==="전체"?" active":""}" data-cat="${c}">${c}</button>
            `).join("")}
          </div>

          <!-- 작성 폼 -->
          <div id="writeForm" class="board-write-form" style="display:none;">
            <div style="display:flex;gap:8px;margin-bottom:10px;">
              <select id="tCat" class="board-select">
                <option>공략</option><option>성장</option><option>캐릭터</option><option>아이템</option><option>기타</option>
              </select>
            </div>
            <input type="text" id="tTitle" placeholder="제목" class="board-input" style="margin-bottom:8px;" />
            <textarea id="tContent" placeholder="꿀팁 내용을 자세히 작성해주세요" class="board-textarea"></textarea>
            <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">
              <button id="hideWriteBtn" class="board-cancel-btn">취소</button>
              <button id="submitTipBtn" class="board-submit-btn">등록</button>
            </div>
          </div>

          <!-- 목록 -->
          <div class="board-table">
            <div class="board-table-header">
              <span>번호</span><span>제목</span><span>작성자</span><span>날짜</span>
            </div>
            <div id="tipList">${renderList(tips)}</div>
          </div>
        </div>
      </div>

      <!-- 모달 -->
      <div id="tipModal" class="board-modal-bg" style="display:none;">
        <div class="board-modal-box">
          <div id="tipContent"></div>
        </div>
      </div>
    `;

    // 이벤트 바인딩
    document.getElementById("showWriteBtn").addEventListener("click", () => document.getElementById("writeForm").style.display = "block");
    document.getElementById("hideWriteBtn").addEventListener("click", () => document.getElementById("writeForm").style.display = "none");
    document.getElementById("submitTipBtn").addEventListener("click", submitTip);

    document.getElementById("catFilter").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cat]");
      if (btn) filterAndRender(btn.dataset.cat);
    });

    document.getElementById("tipList").addEventListener("click", (e) => {
      const row = e.target.closest("[data-tip-id]");
      if (row) openTip(Number(row.dataset.tipId));
    });

    document.getElementById("tipModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("tipModal")) closeTipModal();
    });

  } catch(e) {
    renderError(null, e);
  }
});
