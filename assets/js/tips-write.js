document.addEventListener("DOMContentLoaded", () => {
  renderShell();

  const user = getUser();

  if (!user) {
    alert("로그인이 필요합니다");
    location.href = "./login?redirect=./tips";
    return;
  }

  document.querySelector("main").innerHTML = `
    <div class="page-card">
      <div class="container" style="padding-bottom:32px;">
        <div style="padding:20px 0 16px;">
          <a href="./tips" style="font-size:0.82rem;color:var(--text-soft);text-decoration:none;">&larr; 꿀팁 게시판 목록</a>
        </div>

        <h1 style="font-size:1.3rem;font-weight:800;color:var(--text);margin:0 0 20px;">💡 꿀팁 작성</h1>

        <div class="board-write-page">
          <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
            <select id="tCat" class="board-select">
              <option>공략</option><option>성장</option><option>캐릭터</option><option>아이템</option><option>기타</option>
            </select>
          </div>
          <input type="text" id="tTitle" placeholder="제목을 입력하세요" class="board-input" />
          <div id="editorWrap">
            <div id="tEditor"></div>
          </div>
          <div class="board-write-actions">
            <a href="./tips" class="board-cancel-btn" style="text-decoration:none;">취소</a>
            <button id="submitBtn" class="board-submit-btn">등록</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const quill = new Quill("#tEditor", {
    theme: "snow",
    placeholder: "꿀팁 내용을 자세히 작성해주세요...",
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
    const title = document.getElementById("tTitle").value.trim();
    const content = quill.root.innerHTML;
    const textOnly = quill.getText().trim();
    const category = document.getElementById("tCat").value;

    if (!title || !textOnly) { alert("제목과 내용을 입력해주세요"); return; }

    const res = await fetch(`${API_BASE}/api/tips`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({
        title, content, category,
        author: user.character_name,
        author_guild: user.guild || "",
      }),
    });

    if (res.ok) location.href = "./tips";
    else alert("등록 실패");
  });
});
