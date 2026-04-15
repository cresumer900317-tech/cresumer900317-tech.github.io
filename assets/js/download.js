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

        <div style="background:#fef2f2;border:1px solid #fecaca;
                    border-radius:var(--radius-md);padding:16px 20px;margin-bottom:16px;">
          <h3 style="font-size:0.95rem;color:#dc2626;margin-bottom:4px;">🚨 필독! 사용 전 반드시 읽어주세요</h3>
          <p style="font-size:0.82rem;color:#991b1b;">
            압축 파일 안에 <strong>README_필독.md</strong> 파일이 포함되어 있습니다.<br>
            매크로 사용법, 요구사항, 주의사항이 안내되어 있으니 <strong>반드시 먼저 확인</strong>해주세요.
          </p>
        </div>

        <div style="background:var(--yellow-bg);border:1px solid var(--yellow-border);
                    border-radius:var(--radius-md);padding:20px;margin-bottom:20px;">
          <h3 style="font-size:0.95rem;color:var(--amber-dark);margin-bottom:12px;">📋 빠른 사용 가이드</h3>
          <ol style="padding-left:20px;color:var(--text);font-size:0.88rem;line-height:1.8;">
            <li><strong>LDPlayer 9</strong> 에뮬레이터 실행 (해상도 960x540)</li>
            <li>메이플스토리 키우기 접속</li>
            <li>아래 버튼으로 매크로 다운로드 → 압축 해제</li>
            <li><strong>ZakumMacro.exe</strong> 실행</li>
            <li>길드 홈페이지 계정으로 <strong>로그인</strong></li>
            <li>에뮬레이터 인스턴스 선택 → 난이도 설정 → <strong>START</strong></li>
          </ol>
        </div>

        <div style="background:var(--surface);border:1px solid var(--border);
                    border-radius:var(--radius-md);padding:20px;display:flex;
                    align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <p style="font-weight:700;font-size:0.95rem;color:var(--text);">🔥 ZakumMacro v2.9</p>
            <p style="font-size:0.8rem;color:var(--text-soft);margin-top:4px;">
              자쿰 인기도 자동 매크로 · LDPlayer 전용 · 쉬움/보통/어려움/카오스
            </p>
          </div>
          <button id="downloadBtn" class="board-submit-btn"
                  style="padding:10px 28px;font-size:0.9rem;cursor:pointer;">
            ⬇️ 다운로드
          </button>
        </div>

        <p id="downloadMsg" style="font-size:0.8rem;color:var(--text-soft);margin-top:12px;text-align:center;"></p>

        <div style="margin-top:28px;border-top:1px solid var(--border);padding-top:24px;">
          <h2 style="font-size:1.05rem;font-weight:800;color:var(--text);margin-bottom:16px;">📝 업데이트 내역</h2>

          <div style="margin-bottom:16px;">
            <h3 style="font-size:0.9rem;font-weight:700;color:var(--amber-dark);">v2.9 (2026-04-16)</h3>
            <ul style="padding-left:20px;color:var(--text);font-size:0.84rem;line-height:1.8;margin-top:6px;">
              <li><strong>채팅 입력 방식 개선</strong> — 일부 환경에서 채팅이 안 써지던 문제 해결 (클립보드+붙여넣기 방식)</li>
              <li><strong>LD플레이어 창 탐색 강화</strong> — 클래스명/RenderWindow 기반 탐색 추가</li>
              <li><strong>난이도 선택 버그 수정</strong> — 쉬움/보통 설정해도 카오스로 파티 생성되던 문제 해결</li>
              <li><strong>보안 인증 감지 완화</strong> — 터치 좌표 랜덤화, 터치 지속시간 추가, 루프 간격 랜덤화</li>
            </ul>
          </div>

          <div style="margin-bottom:16px;">
            <h3 style="font-size:0.9rem;font-weight:700;color:var(--amber-dark);">v2.8 (2026-04-15)</h3>
            <ul style="padding-left:20px;color:var(--text);font-size:0.84rem;line-height:1.8;margin-top:6px;">
              <li><strong>LD플레이어 탐지 대폭 개선</strong> — 탐지 실패 시 원인을 GUI 로그에 단계별로 표시</li>
              <li><strong>Windows 11 호환성</strong> — WMIC 제거된 환경에서 PowerShell 폴백 탐지</li>
              <li><strong>64비트 레지스트리 지원</strong> — WOW6432Node 추가 탐색</li>
              <li><strong>탐색 범위 확장</strong> — 드라이브 C~J, 추가 설치 경로 패턴 지원</li>
            </ul>
          </div>

          <div style="margin-bottom:16px;">
            <h3 style="font-size:0.9rem;font-weight:700;color:var(--amber-dark);">v2.7 (2026-04-14)</h3>
            <ul style="padding-left:20px;color:var(--text);font-size:0.84rem;line-height:1.8;margin-top:6px;">
              <li><strong>LDPlayer 자동 탐지</strong> — 설치 경로를 자동으로 찾아 어떤 PC에서든 바로 실행 가능</li>
            </ul>
          </div>

          <div style="margin-bottom:16px;">
            <h3 style="font-size:0.9rem;font-weight:700;color:var(--amber-dark);">v2.6 (2026-04-14)</h3>
            <ul style="padding-left:20px;color:var(--text);font-size:0.84rem;line-height:1.8;margin-top:6px;">
              <li><strong>난이도 선택 버그 수정</strong> — 설정한 난이도가 무시되고 다른 난이도로 파티가 생성되던 문제 해결</li>
              <li><strong>채팅 테스트 개선</strong> — 전투 중이 아닌 상태에서도 Test 버튼 정상 동작</li>
              <li><strong>로그 정리</strong> — 불필요한 탭 좌표 출력 제거</li>
            </ul>
          </div>

          <div style="margin-bottom:16px;">
            <h3 style="font-size:0.9rem;font-weight:700;color:var(--amber-dark);">v2.5</h3>
            <ul style="padding-left:20px;color:var(--text);font-size:0.84rem;line-height:1.8;margin-top:6px;">
              <li><strong>길드원 전용 인증</strong> — 매 실행 시 길드 홈페이지 계정 로그인 필수</li>
              <li><strong>인기도 체크 안정화</strong> — 100회 레이드마다 자동 캡처 후 디스코드 전송</li>
              <li><strong>파티 탈퇴 → 마을 복귀 로직 개선</strong> — 파티 끊김/팝업 자동 처리</li>
              <li><strong>카오스 난이도 추가</strong> — 쉬움/보통/어려움/카오스 4단계 지원</li>
              <li><strong>GUI 버전 표시</strong> — 실행 시 현재 버전 확인 가능</li>
            </ul>
          </div>

          <div style="margin-bottom:16px;">
            <h3 style="font-size:0.9rem;font-weight:700;color:var(--amber-dark);">v2.1 (이전 버전)</h3>
            <ul style="padding-left:20px;color:var(--text);font-size:0.84rem;line-height:1.8;margin-top:6px;">
              <li>자쿰 보스 레이드 자동 매칭/수락/나가기</li>
              <li>도전모드 자동 체크 및 파티 채팅 전송</li>
              <li>디스코드 웹훅 알림</li>
              <li>화면 이탈 시 자동 복구</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("downloadBtn").addEventListener("click", () => {
    const msg = document.getElementById("downloadMsg");
    const a = document.createElement("a");
    a.href = "./assets/ZakumMacro_v2.9.zip";
    a.download = "ZakumMacro_v2.9.zip";
    a.click();
    msg.style.color = "var(--green, #16a34a)";
    msg.textContent = "✅ 다운로드가 시작됩니다!";
  });
});
