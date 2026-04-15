document.addEventListener("DOMContentLoaded", () => {
  renderShell();

  const user = getUser();
  if (!user) {
    location.href = "./login?redirect=./macro";
    return;
  }

  const DOWNLOAD_URL = "./assets/ZakumMacro_v2.8.zip";
  const MACRO_VERSION = "v2.8";

  document.querySelector("main").innerHTML = `
    <section class="macro-hero">
      <div class="container">
        <div class="macro-hero-inner">
          <div class="macro-hero-icon">🤖</div>
          <h1 class="macro-hero-title">자쿰 인기도 매크로</h1>
          <p class="macro-hero-desc">자쿰 보스레이드를 자동으로 반복하여 인기도를 올려주는 매크로입니다.</p>
          <span class="macro-version-badge">v2.8</span>
        </div>
      </div>
    </section>

    <div class="container macro-content">
      <div class="macro-grid">

        <!-- 다운로드 카드 -->
        <div class="macro-card macro-download-card">
          <h2 class="macro-card-title">다운로드</h2>
          <p class="macro-card-desc">길드원 전용 매크로입니다. 로그인 후 사용 가능합니다.</p>
          <a href="${DOWNLOAD_URL}" class="macro-download-btn" id="downloadBtn">
            <span class="macro-download-icon">⬇</span>
            <span>
              <strong>ZakumMacro v2.8</strong>
              <small>Windows 전용 (.zip)</small>
            </span>
          </a>
          <div class="macro-req">
            <h3>요구사항</h3>
            <ul>
              <li>Windows 10 / 11</li>
              <li>LDPlayer 9</li>
              <li>해상도: 960x540 (기본값)</li>
              <li>길드 홈페이지 계정 (승인된 활성 계정)</li>
            </ul>
          </div>
        </div>

        <!-- 사용법 카드 -->
        <div class="macro-card">
          <h2 class="macro-card-title">사용 방법</h2>
          <ol class="macro-steps">
            <li>LDPlayer 실행 후 메이플스토리 키우기 접속</li>
            <li>LDPlayer 설정에서 <strong>ADB 디버그 활성화</strong>
              <br><span class="macro-hint">설정 > 기타 설정 > ADB 디버그 열기</span></li>
            <li><strong>ZakumMacro.exe</strong> 실행</li>
            <li>길드 홈페이지 계정으로 <strong>로그인</strong></li>
            <li>에뮬레이터 인스턴스 선택 (자동 스캔)</li>
            <li>난이도 / 채팅 메시지 설정</li>
            <li><strong>START</strong> 클릭</li>
          </ol>
        </div>

        <!-- 기능 카드 -->
        <div class="macro-card">
          <h2 class="macro-card-title">주요 기능</h2>
          <div class="macro-features">
            <div class="macro-feature">
              <span class="macro-feature-icon">🔄</span>
              <div>
                <strong>자동 매칭/수락/나가기</strong>
                <p>자쿰 보스 레이드 자동 반복</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">⚔️</span>
              <div>
                <strong>난이도 선택</strong>
                <p>쉬움 / 보통 / 어려움 / 카오스</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">💬</span>
              <div>
                <strong>자동 채팅</strong>
                <p>레이드 입장 후 인기도 요청 자동 전송</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">📊</span>
              <div>
                <strong>디스코드 알림</strong>
                <p>100회 레이드마다 인기도 캡처 전송</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">🔧</span>
              <div>
                <strong>자동 복구</strong>
                <p>파티 끊김, 화면 이탈 시 자동 복귀</p>
              </div>
            </div>
            <div class="macro-feature">
              <span class="macro-feature-icon">🔒</span>
              <div>
                <strong>길드원 전용</strong>
                <p>길드 홈페이지 계정 인증 필수</p>
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

        <!-- 업데이트 내역 카드 -->
        <div class="macro-card">
          <h2 class="macro-card-title">업데이트 내역</h2>
          <div class="macro-changelog">
            <div class="macro-changelog-item">
              <div class="macro-changelog-ver">
                <span class="macro-ver-tag">v2.8</span>
                <span class="macro-ver-date">2026.04.15</span>
              </div>
              <ul>
                <li>LD플레이어 자동 탐지 대폭 개선 (탐지 실패 시 원인 로그 표시)</li>
                <li>Windows 11 WMIC 제거 환경 대응 (PowerShell 폴백)</li>
                <li>64비트 Windows 레지스트리 추가 탐색</li>
                <li>탐색 드라이브 범위 및 설치 경로 패턴 확장</li>
              </ul>
            </div>
            <div class="macro-changelog-item">
              <div class="macro-changelog-ver">
                <span class="macro-ver-tag">v2.6</span>
                <span class="macro-ver-date">2026.04.14</span>
              </div>
              <ul>
                <li>난이도 선택이 무시되고 다른 난이도로 파티가 생성되던 버그 수정</li>
                <li>채팅 테스트 기능 개선 (전투 중이 아닌 상태에서도 정상 동작)</li>
                <li>로그에서 불필요한 탭 좌표 출력 제거</li>
              </ul>
            </div>
            <div class="macro-changelog-item">
              <div class="macro-changelog-ver">
                <span class="macro-ver-tag">v2.5</span>
              </div>
              <ul>
                <li>매 실행 시 길드 홈페이지 계정 로그인 필수</li>
                <li>인기도 체크를 100회 레이드마다로 변경</li>
                <li>파티 탈퇴 / 마을 복귀 로직 개선</li>
                <li>GUI에 버전 표시 추가</li>
              </ul>
            </div>
            <div class="macro-changelog-item">
              <div class="macro-changelog-ver">
                <span class="macro-ver-tag">v2.4</span>
              </div>
              <ul>
                <li>카오스 난이도 추가</li>
                <li>난이도 선택 화면 인식 개선</li>
                <li>인기도 체크 안정화</li>
                <li>길드원 전용 인증 시스템 추가</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
});
