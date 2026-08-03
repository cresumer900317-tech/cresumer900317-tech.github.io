document.addEventListener("DOMContentLoaded", () => {
  renderShell();
  const main = document.querySelector("main");
  const KAKAO = "https://open.kakao.com/o/gagOlyni";

  function formHtml() {
    return `
      <div class="jn-card">
        <form id="joinForm">
          <label class="jn-label" for="jnName">캐릭터명 <b class="jn-req">*</b></label>
          <input id="jnName" class="jn-input" type="text" maxlength="50" placeholder="스카니아11 캐릭터명" required />
          <label class="jn-label" for="jnPower">전투력 <span class="jn-opt">(선택)</span></label>
          <input id="jnPower" class="jn-input" type="text" maxlength="50" placeholder="예: 3200조" />
          <label class="jn-label" for="jnContact">연락처 <span class="jn-opt">(선택 · 오픈카톡 ID 등)</span></label>
          <input id="jnContact" class="jn-input" type="text" maxlength="100" placeholder="연락 받을 방법" />
          <label class="jn-label" for="jnMsg">하고 싶은 말 <span class="jn-opt">(선택)</span></label>
          <textarea id="jnMsg" class="jn-input jn-textarea" maxlength="500" placeholder="활동 시간대, 찾는 길드 분위기 등 자유롭게 남겨주세요"></textarea>
          <button type="submit" class="cta-btn jn-submit">가입 문의 보내기</button>
          <div id="jnErr" class="jn-err"></div>
        </form>
      </div>
      <div class="jn-kakao">
        <div class="jn-kakao-text">빠르게 대화로 문의하고 싶다면</div>
        <a class="cta-btn cta-btn-outline" href="${KAKAO}" target="_blank" rel="noopener noreferrer">💬 카카오 오픈채팅으로 문의</a>
      </div>`;
  }

  function doneHtml(msg) {
    return `
      <div class="jn-card jn-done">
        <div class="jn-done-emoji">📨</div>
        <div class="jn-done-title">가입 문의가 접수됐어요!</div>
        <div class="jn-done-desc">${escapeHtml(msg || "운영진이 확인 후 연락드릴게요.")}</div>
        <div class="jn-done-actions">
          <a class="cta-btn" href="./ranking">서버 랭킹 구경하기</a>
          <a class="cta-btn cta-btn-outline" href="${KAKAO}" target="_blank" rel="noopener noreferrer">💬 오픈채팅 바로가기</a>
        </div>
      </div>`;
  }

  function render(bodyHtml) {
    main.innerHTML = `
      <style>
        .jn-wrap{max-width:560px;margin:0 auto;}
        .jn-intro{font-size:0.95rem;color:#4a5568;line-height:1.7;margin:6px 0 18px;}
        .jn-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:22px;box-shadow:0 4px 14px rgba(0,0,0,0.05);}
        .jn-label{display:block;font-size:0.85rem;font-weight:800;color:#1a202c;margin:14px 0 6px;}
        .jn-label:first-child{margin-top:0;}
        .jn-req{color:#dc2626;}
        .jn-opt{font-weight:600;color:#a0aec0;font-size:0.78rem;}
        .jn-input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:0.95rem;background:#f8fafc;}
        .jn-input:focus{outline:none;border-color:#f59e0b;background:#fff;}
        .jn-textarea{min-height:110px;resize:vertical;font-family:inherit;}
        .jn-submit{width:100%;margin-top:18px;padding:14px;font-size:1rem;}
        .jn-err{text-align:center;color:#dc2626;font-size:0.88rem;font-weight:700;margin-top:10px;min-height:20px;}
        .jn-kakao{text-align:center;margin-top:18px;}
        .jn-kakao-text{font-size:0.85rem;color:#718096;margin-bottom:10px;}
        .jn-done{text-align:center;padding:36px 22px;}
        .jn-done-emoji{font-size:2.4rem;margin-bottom:10px;}
        .jn-done-title{font-size:1.2rem;font-weight:900;color:#1a202c;margin-bottom:8px;}
        .jn-done-desc{font-size:0.92rem;color:#4a5568;margin-bottom:20px;}
        .jn-done-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
      </style>
      <div class="page-card">
        <div class="container">
          <div class="jn-wrap">
            <span class="page-eyebrow">RECRUIT</span>
            <h1 class="rk-page-title">친구패밀리 가입 문의</h1>
            <p class="jn-intro">
              스카니아11에서 같이 성장할 길드를 찾고 있다면 —
              <b>친구들 · 친구둘 · 친구삼 · 친구넷 · 친구닷</b> 5개 길드가 함께하는
              친구패밀리에 문의를 남겨주세요. 운영진이 확인 후 연락드려요.
            </p>
            ${bodyHtml}
          </div>
        </div>
      </div>
      <footer class="site-footer">
        <div class="container footer-inner">
          <div class="footer-brand">메이플키우기 라운지 · 스카니아11 서버</div>
          <div class="footer-copy">&copy; ${new Date().getFullYear()} 메이플키우기 라운지 · 운영 친구패밀리. All rights reserved.</div>
        </div>
      </footer>`;
    bindForm();
  }

  function bindForm() {
    const form = document.getElementById("joinForm");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("jnErr");
      const btn = form.querySelector(".jn-submit");
      const name = document.getElementById("jnName").value.trim();
      if (!name) { err.textContent = "캐릭터명을 입력해주세요"; return; }
      btn.disabled = true;
      btn.textContent = "보내는 중…";
      err.textContent = "";
      try {
        const r = await fetch(`${API_BASE}/api/join-inquiries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterName: name,
            powerText: document.getElementById("jnPower").value.trim() || null,
            contact: document.getElementById("jnContact").value.trim() || null,
            message: document.getElementById("jnMsg").value.trim() || null,
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.detail || "접수에 실패했어요. 잠시 후 다시 시도해주세요");
        render(doneHtml(d.message));
        window.scrollTo(0, 0);
      } catch (e2) {
        btn.disabled = false;
        btn.textContent = "가입 문의 보내기";
        err.textContent = e2.message;
      }
    });
  }

  render(formHtml());
});
