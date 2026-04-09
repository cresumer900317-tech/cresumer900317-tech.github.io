document.addEventListener("DOMContentLoaded", async () => {
  renderShell();

  const user = getUser();
  let quill = null;

  function sanitize(html) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["b","i","u","s","em","strong","p","br","ul","ol","li","h1","h2","h3",
        "span","a","img","blockquote","pre","code","sub","sup","hr"],
      ALLOWED_ATTR: ["href","src","alt","style","target","class","width","height"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|data):)/i,
    });
  }

  try {
    const res = await fetch(`${API_BASE}/api/tips`, { cache: "no-store" });
    const tips = await res.json();

    function categoryColor(cat) {
      const map = { "\uACF5\uB7B5": "#f59e0b", "\uC131\uC7A5": "#22c55e", "\uCE90\uB9AD\uD130": "#3b82f6", "\uC544\uC774\uD15C": "#8b5cf6", "\uAE30\uD0C0": "#6b7280" };
      return map[cat] || "#6b7280";
    }

    function renderList(list) {
      if (!list.length) return `<div class="board-empty">\uB4F1\uB85D\uB41C \uAFC0\uD301\uC774 \uC5C6\uC2B5\uB2C8\uB2E4<br><small>\uCCAB \uBC88\uC9F8 \uAFC0\uD301\uC744 \uACF5\uC720\uD574\uBCF4\uC138\uC694!</small></div>`;
      return list.map(t => `
        <div class="board-row" data-tip-id="${t.id}" style="cursor:pointer;">
          <div class="board-row-left">
            <span class="board-num">${t.id}</span>
            <span class="board-cat" style="color:${categoryColor(t.category)};background:${categoryColor(t.category)}15;">${t.category||"\uAE30\uD0C0"}</span>
            <span class="board-ttl">${escapeHtml(t.title)}</span>
            ${t.likes > 0 ? `<span style="font-size:0.72rem;color:#ef4444;margin-left:4px;">\u2764\uFE0F ${t.likes}</span>` : ""}
          </div>
          <div class="board-row-right">
            <span class="board-auth">${escapeHtml(t.author||"-")}</span>
            <span class="board-dt">${new Date(t.created_at).toLocaleDateString("ko-KR")}</span>
          </div>
        </div>
      `).join("");
    }

    let currentCat = "\uC804\uCCB4";
    function filterAndRender(cat) {
      currentCat = cat;
      document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
      const filtered = cat === "\uC804\uCCB4" ? tips : tips.filter(t => t.category === cat);
      document.getElementById("tipList").innerHTML = renderList(filtered);
    }

    function openTip(id) {
      const tip = tips.find(t => t.id === id);
      if (!tip) return;

      const isOwner = user?.character_name === tip.author;
      const isAdmin = user?.role === "admin" || user?.role === "superadmin";

      const isHtml = tip.content && (tip.content.includes("<") && tip.content.includes(">"));
      const contentHtml = isHtml ? sanitize(tip.content) : `<p style="white-space:pre-wrap;">${escapeHtml(tip.content)}</p>`;

      document.getElementById("tipContent").innerHTML = `
        <div style="padding:28px 28px 24px;">
          <div style="margin-bottom:10px;">
            <span class="board-cat" style="font-size:0.82rem;">${tip.category||"\uAE30\uD0C0"}</span>
          </div>
          <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:10px;line-height:1.4;">${escapeHtml(tip.title)}</h2>
          <div style="font-size:0.8rem;color:#9ca3af;margin-bottom:20px;display:flex;gap:16px;flex-wrap:wrap;">
            <span>${escapeHtml(tip.author||"-")}</span>
            ${tip.author_guild ? `<span>${escapeHtml(tip.author_guild)}</span>` : ""}
            <span>${new Date(tip.created_at).toLocaleString("ko-KR")}</span>
          </div>
          <div class="notice-content-body" style="font-size:0.92rem;line-height:1.9;color:#374151;border-top:1px solid #f3f4f6;padding-top:20px;">${contentHtml}</div>
          <div style="margin-top:20px;display:flex;align-items:center;gap:8px;">
            <button id="tipLikeBtn" data-id="${tip.id}" style="padding:7px 16px;background:#fff;border:1px solid #fca5a5;border-radius:999px;color:#ef4444;font-weight:700;font-size:0.85rem;cursor:pointer;">
              \u2764\uFE0F ${tip.likes||0}
            </button>
          </div>
          <div style="margin-top:16px;display:flex;justify-content:space-between;">
            <button id="tipBackBtn" class="board-cancel-btn">\u2190 \uBAA9\uB85D</button>
            ${(isOwner || isAdmin) ? `<button id="tipDeleteBtn" data-id="${tip.id}" class="board-delete-btn">\uD83D\uDDD1\uFE0F \uC0AD\uC81C</button>` : ""}
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
      const content = quill ? quill.root.innerHTML : "";
      const textOnly = quill ? quill.getText().trim() : "";
      const category = document.getElementById("tCat").value;
      if (!title || !textOnly) { alert("\uC81C\uBAA9\uACFC \uB0B4\uC6A9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694"); return; }
      if (!user) { alert("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4"); return; }
      const res = await fetch(`${API_BASE}/api/tips`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ title, content, category, author: user.character_name, author_guild: user.guild||"" }),
      });
      if (res.ok) location.reload();
      else alert("\uB4F1\uB85D \uC2E4\uD328");
    }

    async function likeTip(id) {
      const res = await fetch(`${API_BASE}/api/tips/${id}/like`, { method: "POST", headers: authHeaders() });
      const data = await res.json();
      const btn = document.getElementById("tipLikeBtn");
      if (btn) btn.innerHTML = `\u2764\uFE0F ${data.likes}`;
    }

    async function deleteTip(id) {
      if (!confirm("\uC0AD\uC81C\uD560\uAE4C\uC694?")) return;
      await fetch(`${API_BASE}/api/tips/${id}`, { method: "DELETE", headers: authHeaders() });
      closeTipModal(); location.reload();
    }

    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container">
          <div style="padding:28px 0 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0 0 4px;">\uD83D\uDCA1 \uAFC0\uD301 \uAC8C\uC2DC\uD310</h1>
              <p style="font-size:0.85rem;color:var(--text-soft);margin:0;">\uAE38\uB4DC\uC6D0\uB4E4\uC758 \uAFC0\uD301\uC744 \uACF5\uC720\uD574\uC694</p>
            </div>
            <button id="showWriteBtn" class="board-write-btn">\u270F\uFE0F \uAFC0\uD301 \uB4F1\uB85D</button>
          </div>

          <!-- 카테고리 필터 -->
          <div id="catFilter" style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
            ${["\uC804\uCCB4","\uACF5\uB7B5","\uC131\uC7A5","\uCE90\uB9AD\uD130","\uC544\uC774\uD15C","\uAE30\uD0C0"].map(c => `
              <button class="cat-btn${c==="\uC804\uCCB4"?" active":""}" data-cat="${c}">${c}</button>
            `).join("")}
          </div>

          <!-- 작성 폼 -->
          <div id="writeForm" class="board-write-form" style="display:none;">
            <div style="display:flex;gap:8px;margin-bottom:10px;">
              <select id="tCat" class="board-select">
                <option>\uACF5\uB7B5</option><option>\uC131\uC7A5</option><option>\uCE90\uB9AD\uD130</option><option>\uC544\uC774\uD15C</option><option>\uAE30\uD0C0</option>
              </select>
            </div>
            <input type="text" id="tTitle" placeholder="\uC81C\uBAA9" class="board-input" style="margin-bottom:8px;" />
            <div id="editorWrap">
              <div id="tEditor"></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">
              <button id="hideWriteBtn" class="board-cancel-btn">\uCDE8\uC18C</button>
              <button id="submitTipBtn" class="board-submit-btn">\uB4F1\uB85D</button>
            </div>
          </div>

          <!-- 목록 -->
          <div class="board-table">
            <div class="board-table-header">
              <span>\uBC88\uD638</span><span>\uC81C\uBAA9</span><span>\uC791\uC131\uC790</span><span>\uB0A0\uC9DC</span>
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

    // Quill 에디터 초기화
    document.getElementById("showWriteBtn").addEventListener("click", () => {
      if (!user) { alert("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4"); return; }
      document.getElementById("writeForm").style.display = "block";
      if (!quill) {
        quill = new Quill("#tEditor", {
          theme: "snow",
          placeholder: "\uAFC0\uD301 \uB0B4\uC6A9\uC744 \uC790\uC138\uD788 \uC791\uC131\uD574\uC8FC\uC138\uC694...",
          modules: {
            toolbar: [
              [{ header: [1, 2, 3, false] }],
              ["bold", "italic", "underline", "strike"],
              [{ color: [] }, { background: [] }],
              [{ size: ["small", false, "large", "huge"] }],
              [{ list: "ordered" }, { list: "bullet" }],
              [{ align: [] }],
              ["blockquote", "code-block"],
              ["link", "image"],
              ["clean"],
            ],
          },
        });
      }
    });

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
