document.addEventListener("DOMContentLoaded", () => {
  renderShell();

  const user = getUser();
  const token = getToken();

  if (!user) {
    document.querySelector("main").innerHTML = `
      <div class="page-card">
        <div class="container" style="padding:60px 20px;text-align:center;">
          <p style="font-size:2.5rem;margin-bottom:12px;">🔒</p>
          <p style="font-size:1rem;color:var(--text-soft);margin-bottom:16px;">로그인 후 이용 가능합니다</p>
          <a href="./login?redirect=./download" class="board-submit-btn"
             style="display:inline-block;text-decoration:none;padding:10px 28px;">로그인</a>
        </div>
      </div>`;
    return;
  }

  document.querySelector("main").innerHTML = `
    <div class="page-card">
      <div class="container" style="padding-bottom:32px;">
        <h1 style="font-size:1.3rem;font-weight:800;color:var(--text);padding:24px 0 8px;">
          ⬇️ 매크로 다운로드
        </h1>
        <p style="color:var(--text-soft);font-size:0.88rem;margin-bottom:24px;">
          길드원 전용 자쿰 인기도 매크로입니다. 로그인된 계정으로만 실행할 수 있습니다.
        </p>

        <div style="background:var(--yellow-bg);border:1px solid var(--yellow-border);
                    border-radius:var(--radius-md);padding:20px;margin-bottom:20px;">
          <h3 style="font-size:0.95rem;color:var(--amber-dark);margin-bottom:12px;">📋 사용 방법</h3>
          <ol style="padding-left:20px;color:var(--text);font-size:0.88rem;line-height:1.8;">
            <li>아래 버튼을 눌러 매크로를 다운로드합니다</li>
            <li>압축을 풀고 매크로를 실행합니다</li>
            <li>길드 홈페이지 계정으로 <strong>로그인</strong>합니다</li>
            <li>인증이 완료되면 매크로를 사용할 수 있습니다</li>
          </ol>
        </div>

        <div style="background:var(--surface);border:1px solid var(--border);
                    border-radius:var(--radius-md);padding:20px;display:flex;
                    align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <p style="font-weight:700;font-size:0.95rem;color:var(--text);">🔥 ZakumMacro v2.1</p>
            <p style="font-size:0.8rem;color:var(--text-soft);margin-top:4px;">
              자쿰 인기도 자동 매크로 · LDPlayer 전용
            </p>
          </div>
          <button id="downloadBtn" class="board-submit-btn"
                  style="padding:10px 28px;font-size:0.9rem;cursor:pointer;">
            ⬇️ 다운로드
          </button>
        </div>

        <p id="downloadMsg" style="font-size:0.8rem;color:var(--text-soft);margin-top:12px;text-align:center;"></p>
      </div>
    </div>
  `;

  document.getElementById("downloadBtn").addEventListener("click", async () => {
    const btn = document.getElementById("downloadBtn");
    const msg = document.getElementById("downloadMsg");
    btn.disabled = true;
    btn.textContent = "다운로드 중...";
    msg.textContent = "";

    try {
      const res = await fetch(`${API_BASE}/api/macro/download`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "다운로드 실패");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ZakumMacro.zip";
      a.click();
      URL.revokeObjectURL(url);
      msg.style.color = "var(--green, #16a34a)";
      msg.textContent = "✅ 다운로드 완료!";
    } catch (e) {
      msg.style.color = "var(--red, #dc2626)";
      msg.textContent = `❌ ${e.message}`;
    } finally {
      btn.disabled = false;
      btn.textContent = "⬇️ 다운로드";
    }
  });
});
