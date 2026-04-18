document.addEventListener("DOMContentLoaded", () => {
  renderShell();

  const user = getUser();

  if (!user) {
    alert("로그인이 필요합니다");
    location.href = "./login?redirect=./free";
    return;
  }

  document.querySelector("main").innerHTML = `
    <div class="page-card">
      <div class="container" style="padding-bottom:32px;">
        <div style="padding:20px 0 16px;">
          <a href="./free" style="font-size:0.82rem;color:var(--text-soft);text-decoration:none;">&larr; 자유게시판 목록</a>
        </div>

        <h1 style="font-size:1.3rem;font-weight:800;color:var(--text);margin:0 0 20px;">💬 자유게시판 글쓰기</h1>

        <div class="board-write-page">
          <input type="text" id="fTitle" placeholder="제목을 입력하세요" class="board-input" />
          <div id="editorWrap">
            <div id="fEditor"></div>
          </div>
          <div class="board-write-actions">
            <a href="./free" class="board-cancel-btn" style="text-decoration:none;">취소</a>
            <button id="submitBtn" class="board-submit-btn">등록</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const quill = new Quill("#fEditor", {
    theme: "snow",
    placeholder: "자유롭게 작성해주세요...",
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
    const title = document.getElementById("fTitle").value.trim();
    const content = quill.root.innerHTML;
    const textOnly = quill.getText().trim();

    if (!title || !textOnly) { alert("제목과 내용을 입력해주세요"); return; }

    const res = await fetch(`${API_BASE}/api/free`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({
        title, content,
        author: user.character_name,
        author_guild: user.guild || "",
      }),
    });

    if (res.ok) location.href = "./free";
    else alert("등록 실패");
  });
});
