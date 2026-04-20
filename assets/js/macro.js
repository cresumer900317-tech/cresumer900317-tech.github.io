document.addEventListener("DOMContentLoaded", () => {
  renderShell();

  const user = getUser();
  if (!user) {
    location.href = "./login?redirect=./macro";
    return;
  }

  const MACRO_VERSION = "v3.1";
  const ZIP_NAME = "ZakumMacro_" + MACRO_VERSION + ".zip";

  document.querySelector("main").innerHTML = `
    <section class="macro-hero">
      <div class="container">
        <div class="macro-hero-inner">
          <div class="macro-hero-icon">🤖</div>
          <h1 class="macro-hero-title">자쿰 인기도 매크로</h1>
          <p class="macro-hero-desc">자쿰 보스레이드를 자동으로 반복하여 인기도를 올려주는 매크로입니다.<br>START 한 번이면 매칭부터 채팅, 복구까지 모두 자동으로 처리됩니다.</p>
          <span class="macro-version-badge">${MACRO_VERSION}</span>
        </div>
      </div>
    </section>

    <div class="container macro-content">
      <div class="macro-grid">

        <!-- 다운로드 카드 -->
        <div class="macro-card macro-download-card">
          <h2 class="macro-card-title">다운로드</h2>
          <p class="macro-card-desc">길드원 전용 매크로입니다. 로그인 후 사용 가능합니다.</p>
          <button class="macro-download-btn" id="downloadBtn">
            <span class="macro-download-icon">⬇</span>
            <span>
              <strong>ZakumMacro ${MACRO_VERSION}</strong>
              <small>Windows 전용 (.zip)</small>
            </span>
          </button>
          <p id="downloadMsg" style="font-size:0.8rem;margin-top:8px;text-align:center;"></p>
          <div class="macro-req">
            <h3>요구사항</h3>
            <ul>
              <li>Windows 10 / 11 (64비트)</li>
              <li>LDPlayer 9 <strong>v9.5.6.0</strong> 권장</li>
              <li>해상도: 960x540 (기본값)</li>
              <li>길드 홈페이지 계정 (승인된 활성 계정)</li>
            </ul>
          </div>
        </div>

        <!-- 사전 준비 카드 -->
        <div class="macro-card">
          <h2 class="macro-card-title">사전 준비</h2>
          <p class="macro-card-desc">매크로를 사용하기 전에 아래 환경을 먼저 세팅해주세요.</p>
          <div class="macro-setup-list">
            <div class="macro-setup-item">
              <span class="macro-setup-num">1</span>
              <div>
                <strong>LDPlayer 9 설치</strong>
                <p><strong>v9.5.6.0</strong> 버전을 권장합니다. 다른 버전에서는 화면 인식이 안 될 수 있습니다.</p>
              </div>
            </div>
            <div class="macro-setup-item">
              <span class="macro-setup-num">2</span>
              <div>
                <strong>해상도 설정</strong>
                <p>LDPlayer 설정 > 디스플레이 > 해상도를 <strong>960 x 540</strong>으로 설정해주세요. (기본값이면 OK)</p>
              </div>
            </div>
            <div class="macro-setup-item">
              <span class="macro-setup-num">3</span>
              <div>
                <strong>ADB 디버그 활성화</strong>
                <p>LDPlayer 설정 > <strong>기타 설정</strong> > <strong>ADB 디버그 열기</strong>를 켜주세요. 이 설정이 꺼져있으면 매크로가 앱플레이어를 제어할 수 없습니다.</p>
              </div>
            </div>
            <div class="macro-setup-item">
              <span class="macro-setup-num">4</span>
              <div>
                <strong>메이플스토리 키우기 실행</strong>
                <p>LDPlayer에서 메이플스토리 키우기를 실행하고 <strong>마을 화면</strong>까지 진입해주세요.</p>
              </div>
            </div>
            <div class="macro-setup-item">
              <span class="macro-setup-num">5</span>
              <div>
                <strong>길드 홈페이지 계정</strong>
                <p>매크로 실행 시 길드 홈페이지 계정으로 로그인이 필요합니다. 계정이 없다면 먼저 가입 후 승인을 받아주세요.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 사용법 카드 -->
        <div class="macro-card">
          <h2 class="macro-card-title">사용 방법</h2>
          <ol class="macro-steps">
            <li><strong>ZakumMacro.exe</strong> 실행</li>
            <li>길드 홈페이지 계정으로 <strong>로그인</strong> (최초 1회, 이후 자동 로그인)</li>
            <li>에뮬레이터 인스턴스 선택 (자동 스캔, 감지 안 되면 <strong>Scan</strong> 클릭)</li>
            <li>난이도 선택 (쉬움 / 보통 / 어려움 / 카오스)</li>
            <li>채팅 메시지 입력 및 전송 횟수 설정 (1~20회)</li>
            <li><strong>START</strong> 클릭하면 모든 것이 자동으로 진행됩니다</li>
          </ol>
          <p class="macro-hint" style="margin-top:10px;">💡 앱플레이어 창을 최소화해도 매크로는 정상 동작합니다.</p>
        </div>

        <!-- 전체 기능 카드 -->
        <div class="macro-card">
          <h2 class="macro-card-title">전체 기능</h2>
          <div class="macro-features">
            <div class="macro-feature">
              <span class="macro-feature-icon">🔄</span>
              <div>
                <strong>자동 레이드 반복</strong>
                <p>자쿰 보스레이드를 자동으로 매칭 → 수락 → 전투 → 나가기 → 반복합니다. START 한 번이면 끝.</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">⚔️</span>
              <div>
                <strong>난이도 자동 선택</strong>
                <p>쉬움 / 보통 / 어려움 / 카오스 중 원하는 난이도를 설정하면 매번 자동으로 선택합니다.</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">💬</span>
              <div>
                <strong>자동 채팅 전송</strong>
                <p>전투 입장 후 파티 채팅으로 인기도 요청 메시지를 자동 전송합니다. 메시지 내용과 전송 횟수(1~20회)를 자유롭게 설정할 수 있습니다.</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">🧪</span>
              <div>
                <strong>채팅 테스트</strong>
                <p>전투에 들어가지 않고도 Test 버튼으로 채팅이 정상 입력되는지 미리 확인할 수 있습니다.</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">🎯</span>
              <div>
                <strong>도전모드 자동 처리</strong>
                <p>도전모드를 자동 감지하고, 60초 타임아웃 내에 처리되지 않으면 자동으로 탈출하여 다음 레이드로 넘어갑니다.</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">📊</span>
              <div>
                <strong>인기도 자동 체크 + 디스코드 알림</strong>
                <p>100회 레이드마다 인기도 영역을 스크린샷으로 캡처하고, 디스코드 웹훅으로 자동 전송합니다. 인기도 변화를 실시간으로 확인하세요.</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">🔧</span>
              <div>
                <strong>자동 복구 시스템</strong>
                <p>파티 끊김, 팝업 알림, 화면 이탈 등 예외 상황을 자동으로 감지하고 복구합니다. 15회 연속 화면 인식 실패 시 게임을 자동 재시작합니다.</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">📱</span>
              <div>
                <strong>멀티 인스턴스 지원</strong>
                <p>LDPlayer를 여러 개 실행하고 각각 다른 인스턴스를 선택하여 동시에 매크로를 돌릴 수 있습니다. 커스텀 이름의 앱플레이어도 지원합니다.</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">🔍</span>
              <div>
                <strong>앱플레이어 자동 탐지</strong>
                <p>레지스트리, 실행 중인 프로세스, 설치 경로를 종합적으로 탐색하여 LDPlayer를 자동으로 찾아냅니다. Windows 11 환경도 완벽 지원합니다.</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">🛡️</span>
              <div>
                <strong>안티 감지 시스템</strong>
                <p>터치 좌표 랜덤 흔들림(±3px), 터치 지속시간 변화(50~150ms), 루프 간격 랜덤화(±30%)로 자연스러운 조작을 시뮬레이션합니다.</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">📋</span>
              <div>
                <strong>실시간 상태 모니터링</strong>
                <p>현재 매크로 상태(로비/대기/전투/나가기), 누적 레이드 횟수, 채팅 전송 현황을 GUI에서 실시간으로 확인할 수 있습니다.</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">🔒</span>
              <div>
                <strong>길드원 전용 인증</strong>
                <p>길드 홈페이지 계정으로 인증된 길드원만 사용 가능합니다. 토큰 저장으로 매번 로그인할 필요 없이 자동 로그인됩니다.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 동작 흐름 카드 -->
        <div class="macro-card">
          <h2 class="macro-card-title">동작 흐름</h2>
          <div class="macro-flow">
            <div class="macro-flow-step">마을</div>
            <span class="macro-flow-arrow">→</span>
            <div class="macro-flow-step">메뉴</div>
            <span class="macro-flow-arrow">→</span>
            <div class="macro-flow-step">보스레이드</div>
            <span class="macro-flow-arrow">→</span>
            <div class="macro-flow-step">자쿰</div>
            <span class="macro-flow-arrow">→</span>
            <div class="macro-flow-step">난이도 선택</div>
            <span class="macro-flow-arrow">→</span>
            <div class="macro-flow-step">파티 생성</div>
            <span class="macro-flow-arrow">→</span>
            <div class="macro-flow-step">자동매칭</div>
            <span class="macro-flow-arrow">→</span>
            <div class="macro-flow-step">수락</div>
            <span class="macro-flow-arrow">→</span>
            <div class="macro-flow-step macro-flow-accent">전투 (채팅)</div>
            <span class="macro-flow-arrow">→</span>
            <div class="macro-flow-step">나가기</div>
            <span class="macro-flow-arrow">→</span>
            <div class="macro-flow-step macro-flow-loop">반복</div>
          </div>
        </div>

        <!-- 주의사항 카드 -->
        <div class="macro-card">
          <h2 class="macro-card-title">주의사항</h2>
          <ul class="macro-steps" style="list-style:none;padding:0;">
            <li style="padding-left:0;"><strong>⚠️ LDPlayer 버전</strong> — v9.5.6.0 이외 버전에서는 화면 인식 오류가 발생할 수 있습니다.</li>
            <li style="padding-left:0;"><strong>⚠️ ADB 디버그</strong> — 반드시 켜져 있어야 합니다. 꺼져있으면 인스턴스 연결이 불가합니다.</li>
            <li style="padding-left:0;"><strong>⚠️ 해상도</strong> — 960x540이 아니면 이미지 매칭이 실패합니다. 반드시 확인해주세요.</li>
            <li style="padding-left:0;"><strong>💡 최소화 가능</strong> — 매크로 실행 중 LDPlayer 창을 최소화해도 정상 동작합니다.</li>
            <li style="padding-left:0;"><strong>💡 문제 발생 시</strong> — STOP 후 다시 START 해주세요. 대부분의 문제가 해결됩니다.</li>
          </ul>
        </div>

        <!-- 업데이트 내역 카드 -->
        <div class="macro-card">
          <h2 class="macro-card-title">업데이트 내역</h2>
          <div class="macro-changelog">
            <div class="macro-changelog-item">
              <div class="macro-changelog-ver">
                <span class="macro-ver-tag">v3.1</span>
                <span class="macro-ver-date">2026.04.16</span>
              </div>
              <ul>
                <li>커스텀 이름 앱플레이어 채팅 입력 수정</li>
                <li>기본 이름이 아닌 앱플레이어(예: 호떡)에서 채팅이 안 써지던 문제 해결</li>
                <li>창 탐색 시 인스턴스 이름도 키워드로 검색하도록 개선</li>
              </ul>
            </div>
            <div class="macro-changelog-item">
              <div class="macro-changelog-ver">
                <span class="macro-ver-tag">v3.0</span>
                <span class="macro-ver-date">2026.04.16</span>
              </div>
              <ul>
                <li>64비트 Windows 호환성 전면 수정 (채팅·클립보드 오류 해결)</li>
                <li>채팅 입력 WM_CHAR 기반으로 안정화</li>
                <li>Win32 API 타입 안전성 강화</li>
                <li>권장 환경: LDPlayer 9 v9.5.6.0</li>
              </ul>
            </div>
            <div class="macro-changelog-item">
              <div class="macro-changelog-ver">
                <span class="macro-ver-tag">v2.8</span>
                <span class="macro-ver-date">2026.04.15</span>
              </div>
              <ul>
                <li>LD플레이어 자동 탐지 대폭 개선</li>
                <li>Windows 11 환경 대응</li>
              </ul>
            </div>
            <div class="macro-changelog-item">
              <div class="macro-changelog-ver">
                <span class="macro-ver-tag">v2.6</span>
                <span class="macro-ver-date">2026.04.14</span>
              </div>
              <ul>
                <li>난이도 선택 버그 수정</li>
                <li>채팅 테스트 기능 개선</li>
              </ul>
            </div>
            <div class="macro-changelog-item">
              <div class="macro-changelog-ver">
                <span class="macro-ver-tag">v2.5</span>
              </div>
              <ul>
                <li>길드원 인증 로그인 필수화</li>
                <li>인기도 체크 주기 변경 (100회)</li>
              </ul>
            </div>
            <div class="macro-changelog-item">
              <div class="macro-changelog-ver">
                <span class="macro-ver-tag">v2.4</span>
              </div>
              <ul>
                <li>카오스 난이도 추가</li>
                <li>길드원 전용 인증 시스템 추가</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 피드백 댓글 카드 -->
        <div class="macro-card">
          <h2 class="macro-card-title">피드백 / 건의사항</h2>
          <p class="macro-card-desc">매크로 사용 중 불편한 점이나 개선 아이디어를 남겨주세요.</p>
          <div class="macro-comment-form">
            <textarea id="commentInput" class="macro-comment-input" placeholder="피드백을 작성해주세요 (최대 500자)" maxlength="500"></textarea>
            <div class="macro-comment-form-footer">
              <span id="commentCharCount" class="macro-comment-char">0 / 500</span>
              <button id="commentSubmitBtn" class="macro-comment-submit">등록</button>
            </div>
          </div>
          <div id="commentList" class="macro-comment-list">
            <p style="color:var(--text-faint);font-size:0.84rem;text-align:center;padding:20px 0;">불러오는 중...</p>
          </div>
        </div>

      </div>
    </div>
  `;

  // ── 다운로드 기능 ──
  const API_BASE = window.API_BASE || "";
  const token = getToken();

  document.getElementById("downloadBtn").addEventListener("click", async () => {
    const msg = document.getElementById("downloadMsg");
    const btn = document.getElementById("downloadBtn");
    btn.disabled = true;
    msg.textContent = "다운로드 준비 중...";
    msg.style.color = "var(--text-soft)";
    try {
      const res = await fetch(API_BASE + "/api/macro/download", {
        headers: { "Authorization": "Bearer " + token }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "다운로드 실패");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = ZIP_NAME;
      a.click();
      URL.revokeObjectURL(a.href);
      msg.style.color = "var(--green, #16a34a)";
      msg.textContent = "✅ 다운로드가 시작됩니다!";
    } catch (e) {
      msg.style.color = "#dc2626";
      msg.textContent = "❌ " + e.message;
    } finally {
      btn.disabled = false;
    }
  });

  // ── 댓글 기능 ──
  const commentInput = document.getElementById("commentInput");
  const commentCharCount = document.getElementById("commentCharCount");
  const commentSubmitBtn = document.getElementById("commentSubmitBtn");
  const commentList = document.getElementById("commentList");

  commentInput.addEventListener("input", () => {
    commentCharCount.textContent = commentInput.value.length + " / 500";
  });

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "방금 전";
    if (m < 60) return m + "분 전";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "시간 전";
    const d = Math.floor(h / 24);
    if (d < 30) return d + "일 전";
    return new Date(dateStr).toLocaleDateString("ko-KR");
  }

  function renderComments(comments) {
    if (!comments.length) {
      commentList.innerHTML = '<p style="color:var(--text-faint);font-size:0.84rem;text-align:center;padding:20px 0;">아직 피드백이 없습니다. 첫 번째로 의견을 남겨보세요!</p>';
      return;
    }
    commentList.innerHTML = comments.map(c => `
      <div class="macro-comment-item" data-id="${c.id}">
        <div class="macro-comment-header">
          <span class="macro-comment-author">${c.author}${c.author_guild ? ' <span class="macro-comment-guild">' + c.author_guild + '</span>' : ''}</span>
          <span class="macro-comment-time">${timeAgo(c.created_at)}</span>
        </div>
        <p class="macro-comment-body">${c.content.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")}</p>
        ${c.author === user.character_name || user.role === "admin" || user.role === "superadmin"
          ? '<button class="macro-comment-del" data-id="' + c.id + '">삭제</button>' : ''}
      </div>
    `).join("");
    commentList.querySelectorAll(".macro-comment-del").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("댓글을 삭제하시겠습니까?")) return;
        await fetch(API_BASE + "/api/macro/comments/" + btn.dataset.id, {
          method: "DELETE", headers: { "Authorization": "Bearer " + token }
        });
        loadComments();
      });
    });
  }

  async function loadComments() {
    try {
      const res = await fetch(API_BASE + "/api/macro/comments");
      const data = await res.json();
      renderComments(data);
    } catch { commentList.innerHTML = '<p style="color:var(--text-faint);font-size:0.84rem;text-align:center;">댓글을 불러올 수 없습니다.</p>'; }
  }

  commentSubmitBtn.addEventListener("click", async () => {
    const content = commentInput.value.trim();
    if (!content) return alert("내용을 입력해주세요");
    commentSubmitBtn.disabled = true;
    commentSubmitBtn.textContent = "등록 중...";
    try {
      const res = await fetch(API_BASE + "/api/macro/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ content, author: user.character_name, author_guild: user.guild || "" })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "등록 실패"); }
      commentInput.value = "";
      commentCharCount.textContent = "0 / 500";
      loadComments();
    } catch (e) { alert(e.message); }
    finally { commentSubmitBtn.disabled = false; commentSubmitBtn.textContent = "등록"; }
  });

  loadComments();
});
