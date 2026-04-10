document.addEventListener("DOMContentLoaded", () => {
  renderShell();

  const user = getUser();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  if (!isAdmin) {
    document.querySelector("main").innerHTML = `
      <div class="page-card"><div class="container" style="padding:60px 20px;text-align:center;">
        <p style="font-size:1rem;color:var(--text-soft);">관리자만 공지를 작성할 수 있습니다.</p>
        <a href="./notice" class="board-cancel-btn" style="display:inline-block;margin-top:16px;text-decoration:none;">목록으로</a>
      </div></div>`;
    return;
  }

  document.querySelector("main").innerHTML = `
    <div class="page-card">
      <div class="container" style="padding-bottom:32px;">
        <div style="padding:20px 0 16px;">
          <a href="./notice" style="font-size:0.82rem;color:var(--text-soft);text-decoration:none;">&larr; 공지사항 목록</a>
        </div>

        <h1 style="font-size:1.3rem;font-weight:800;color:var(--text);margin:0 0 20px;">📢 공지 작성</h1>

        <div class="board-write-page">
          <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">
            <select id="nCat" class="board-select">
              <option>공지</option><option>이벤트</option><option>길드</option><option>운영</option>
            </select>
            <label style="display:flex;align-items:center;gap:5px;font-size:0.85rem;cursor:pointer;">
              <input type="checkbox" id="nPin" /> 상단 고정
            </label>
          </div>
          <input type="text" id="nTitle" placeholder="제목을 입력하세요" class="board-input" />
          <div id="editorWrap">
            <div id="nEditor"></div>
          </div>
          <div class="board-write-actions">
            <a href="./notice" class="board-cancel-btn" style="text-decoration:none;">취소</a>
            <button id="submitBtn" class="board-submit-btn">등록</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const quill = new Quill("#nEditor", {
    theme: "snow",
    placeholder: "내용을 입력하세요...",
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

  document.getElementById("submitBtn").addEventListener("click", async () => {
    const title = document.getElementById("nTitle").value.trim();
    const content = quill.root.innerHTML;
    const textOnly = quill.getText().trim();
    const category = document.getElementById("nCat").value;
    const is_pinned = document.getElementById("nPin").checked;

    if (!title || !textOnly) { alert("제목과 내용을 입력해주세요"); return; }

    const res = await fetch(`${API_BASE}/api/notices`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({
        title, content, category, is_pinned,
        author: user?.character_name || "운영진",
        author_guild: user?.guild || "",
      }),
    });

    if (res.ok) location.href = "./notice";
    else alert("등록 실패");
  });
});
