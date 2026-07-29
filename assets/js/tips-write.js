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
          <a href="./tips" style="font-size:0.82rem;color:var(--text-soft);text-decoration:none;">&larr; 공략 게시판 목록</a>
        </div>

        <h1 style="font-size:1.3rem;font-weight:800;color:var(--text);margin:0 0 20px;">📖 공략 작성</h1>

        <div class="board-write-page">
          <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
            <select id="tContent" class="board-select">
              <option value="">컨텐츠 선택</option>
              <option>토벌전</option><option>대항전</option><option>길드수련장</option><option>월드아레나</option><option>월드보스</option><option>콜로세움</option><option>세팅</option>
            </select>
            <select id="tJob" class="board-select">
              <option value="">직업 공통</option>
              <option>전사</option><option>마법사</option><option>궁수</option><option>도적</option><option>해적</option>
            </select>
          </div>
          <input type="text" id="tTitle" placeholder="제목을 입력하세요 — 앞에 [컨텐츠][직업] 헤더가 자동으로 붙어요" class="board-input" />
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
    placeholder: "공략 내용을 자세히 작성해주세요...",
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
    let title = document.getElementById("tTitle").value.trim();
    const content = quill.root.innerHTML;
    const textOnly = quill.getText().trim();
    const contentTag = document.getElementById("tContent").value;
    const jobTag = document.getElementById("tJob").value;

    if (!title || !textOnly) { alert("제목과 내용을 입력해주세요"); return; }
    if (!contentTag) { alert("컨텐츠를 선택해주세요"); return; }

    // 제목 헤더 자동 부착: [토벌전][전사] 제목 (직접 입력한 중복 헤더는 제거)
    title = title.replace(/^(\s*\[[^\[\]]{1,12}\])+\s*/, "").trim() || title;
    title = `[${contentTag}]` + (jobTag ? `[${jobTag}]` : "") + " " + title;

    const res = await fetch(`${API_BASE}/api/tips`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({
        title, content, category: "공략",
        author: user.character_name,
        author_guild: user.guild || "",
      }),
    });

    if (res.ok) location.href = "./tips";
    else alert("등록 실패");
  });
});
