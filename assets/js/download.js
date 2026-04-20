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

  const MACRO_VERSION = "v3.1";
  const ZIP_NAME = "ZakumMacro_v3.1.zip";

  document.querySelector("main").innerHTML = `
    <div class="page-card">
      <div class="container" style="padding-bottom:32px;">
        <h1 style="font-size:1.3rem;font-weight:800;color:var(--text);padding:24px 0 8px;">
          🤖 자쿰 인기도 매크로 <span style="font-size:0.8rem;background:var(--amber);color:#000;padding:2px 8px;border-radius:10px;font-weight:700;vertical-align:middle;">${MACRO_VERSION}</span>
        </h1>
        <p style="color:var(--text-soft);font-size:0.88rem;margin-bottom:24px;">
          자쿰 보스레이드를 자동으로 반복하여 인기도를 올려주는 길드원 전용 매크로입니다.<br>
          START 한 번이면 매칭부터 채팅, 복구까지 모두 자동으로 처리됩니다.
        </p>

        <!-- 다운로드 -->
        <div style="background:var(--surface);border:1px solid var(--border);
                    border-radius:var(--radius-md);padding:20px;display:flex;
                    align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div>
            <p style="font-weight:700;font-size:0.95rem;color:var(--text);">🔥 ZakumMacro ${MACRO_VERSION}</p>
            <p style="font-size:0.8rem;color:var(--text-soft);margin-top:4px;">
              Windows 전용 · LDPlayer 9 · 쉬움/보통/어려움/카오스
            </p>
          </div>
          <button id="downloadBtn" class="board-submit-btn"
                  style="padding:10px 28px;font-size:0.9rem;cursor:pointer;">
            ⬇️ 다운로드
          </button>
        </div>
        <p id="downloadMsg" style="font-size:0.8rem;color:var(--text-soft);margin-top:-8px;margin-bottom:20px;text-align:center;"></p>

        <!-- 사전 준비 -->
        <div style="background:var(--yellow-bg);border:1px solid var(--yellow-border);
                    border-radius:var(--radius-md);padding:20px;margin-bottom:20px;">
          <h3 style="font-size:0.95rem;color:var(--amber-dark);margin-bottom:14px;">📋 사전 준비 (필독)</h3>
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <span style="flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:var(--amber);color:#000;font-weight:800;font-size:0.75rem;border-radius:50%;">1</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">LDPlayer 9 설치</strong>
                <p style="font-size:0.82rem;color:var(--text-soft);margin:2px 0 0;"><strong>v9.5.6.0</strong> 버전 권장. 다른 버전에서는 화면 인식이 안 될 수 있습니다.</p>
              </div>
            </div>
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <span style="flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:var(--amber);color:#000;font-weight:800;font-size:0.75rem;border-radius:50%;">2</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">해상도 설정</strong>
                <p style="font-size:0.82rem;color:var(--text-soft);margin:2px 0 0;">LDPlayer 설정 > 디스플레이 > 해상도를 <strong>960 x 540</strong>으로 설정 (기본값이면 OK)</p>
              </div>
            </div>
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <span style="flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:var(--amber);color:#000;font-weight:800;font-size:0.75rem;border-radius:50%;">3</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">ADB 디버그 활성화</strong>
                <p style="font-size:0.82rem;color:var(--text-soft);margin:2px 0 0;">LDPlayer 설정 > <strong>기타 설정</strong> > <strong>ADB 디버그 열기</strong>를 켜주세요. 이 설정이 꺼져있으면 매크로가 앱플레이어를 제어할 수 없습니다.</p>
              </div>
            </div>
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <span style="flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:var(--amber);color:#000;font-weight:800;font-size:0.75rem;border-radius:50%;">4</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">메이플스토리 키우기 실행</strong>
                <p style="font-size:0.82rem;color:var(--text-soft);margin:2px 0 0;">LDPlayer에서 게임을 실행하고 <strong>마을 화면</strong>까지 진입해주세요.</p>
              </div>
            </div>
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <span style="flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:var(--amber);color:#000;font-weight:800;font-size:0.75rem;border-radius:50%;">5</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">길드 홈페이지 계정</strong>
                <p style="font-size:0.82rem;color:var(--text-soft);margin:2px 0 0;">매크로 실행 시 로그인이 필요합니다. 계정이 없다면 먼저 가입 후 승인을 받아주세요.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 사용 방법 -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;margin-bottom:20px;">
          <h3 style="font-size:0.95rem;color:var(--text);margin-bottom:12px;">🚀 사용 방법</h3>
          <ol style="padding-left:20px;color:var(--text);font-size:0.88rem;line-height:1.8;">
            <li><strong>ZakumMacro.exe</strong> 실행</li>
            <li>길드 홈페이지 계정으로 <strong>로그인</strong> (최초 1회, 이후 자동 로그인)</li>
            <li>에뮬레이터 인스턴스 선택 (자동 스캔, 감지 안 되면 <strong>Scan</strong> 클릭)</li>
            <li>난이도 선택 (쉬움 / 보통 / 어려움 / 카오스)</li>
            <li>채팅 메시지 입력 및 전송 횟수 설정 (1~20회)</li>
            <li><strong>START</strong> 클릭하면 모든 것이 자동으로 진행됩니다</li>
          </ol>
          <p style="font-size:0.8rem;color:var(--text-faint);margin-top:10px;">💡 앱플레이어 창을 최소화해도 매크로는 정상 동작합니다.</p>
        </div>

        <!-- 전체 기능 -->
        <div style="border-top:1px solid var(--border);padding-top:24px;margin-bottom:24px;">
          <h2 style="font-size:1.05rem;font-weight:800;color:var(--text);margin-bottom:16px;">✨ 전체 기능</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">🔄</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">자동 레이드 반복</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">매칭 → 수락 → 전투 → 나가기를 자동으로 반복합니다. START 한 번이면 끝.</p>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">⚔️</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">난이도 자동 선택</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">쉬움 / 보통 / 어려움 / 카오스 중 설정한 난이도를 매번 자동 선택합니다.</p>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">💬</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">자동 채팅 전송</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">전투 입장 후 인기도 요청 메시지를 자동 전송. 메시지 내용과 전송 횟수(1~20회) 설정 가능.</p>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">🧪</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">채팅 테스트</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">전투 밖에서도 Test 버튼으로 채팅이 정상 입력되는지 미리 확인할 수 있습니다.</p>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">🎯</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">도전모드 자동 처리</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">도전모드를 자동 감지하고, 60초 내 미처리 시 자동 탈출하여 다음 레이드로 진행합니다.</p>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">📊</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">인기도 캡처 + 디스코드 알림</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">100회 레이드마다 인기도 스크린샷을 캡처하고 디스코드 웹훅으로 자동 전송합니다.</p>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">🔧</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">자동 복구 시스템</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">파티 끊김, 팝업 알림, 화면 이탈 등을 자동 감지 및 복구. 15회 연속 실패 시 게임 자동 재시작.</p>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">📱</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">멀티 인스턴스 지원</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">LDPlayer를 여러 개 실행하고 각각 매크로를 돌릴 수 있습니다. 커스텀 이름도 지원.</p>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">🔍</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">앱플레이어 자동 탐지</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">레지스트리, 프로세스, 설치 경로를 종합 탐색하여 LDPlayer를 자동으로 찾습니다. Win11 완벽 지원.</p>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">🛡️</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">안티 감지 시스템</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">좌표 랜덤 흔들림(±3px), 터치 시간 변화(50~150ms), 루프 간격 랜덤화(±30%).</p>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">📋</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">실시간 상태 모니터링</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">현재 상태(로비/대기/전투), 누적 레이드 횟수, 채팅 전송 현황을 GUI에서 실시간 확인.</p>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <span style="font-size:1.3rem;">🔒</span>
              <div>
                <strong style="font-size:0.88rem;color:var(--text);">길드원 전용 인증</strong>
                <p style="font-size:0.8rem;color:var(--text-soft);margin:4px 0 0;">길드 홈페이지 계정 인증 필수. 토큰 저장으로 자동 로그인 지원.</p>
              </div>
            </div>

          </div>
        </div>

        <!-- 동작 흐름 -->
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;margin-bottom:20px;">
          <h3 style="font-size:0.95rem;color:var(--text);margin-bottom:14px;">🔄 동작 흐름</h3>
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:0.82rem;color:var(--text);">
            <span style="background:var(--surface-alt,#f3f4f6);padding:6px 12px;border-radius:6px;border:1px solid var(--border);">마을</span>
            <span style="color:var(--text-faint);">→</span>
            <span style="background:var(--surface-alt,#f3f4f6);padding:6px 12px;border-radius:6px;border:1px solid var(--border);">메뉴</span>
            <span style="color:var(--text-faint);">→</span>
            <span style="background:var(--surface-alt,#f3f4f6);padding:6px 12px;border-radius:6px;border:1px solid var(--border);">보스레이드</span>
            <span style="color:var(--text-faint);">→</span>
            <span style="background:var(--surface-alt,#f3f4f6);padding:6px 12px;border-radius:6px;border:1px solid var(--border);">자쿰</span>
            <span style="color:var(--text-faint);">→</span>
            <span style="background:var(--surface-alt,#f3f4f6);padding:6px 12px;border-radius:6px;border:1px solid var(--border);">난이도</span>
            <span style="color:var(--text-faint);">→</span>
            <span style="background:var(--surface-alt,#f3f4f6);padding:6px 12px;border-radius:6px;border:1px solid var(--border);">파티 생성</span>
            <span style="color:var(--text-faint);">→</span>
            <span style="background:var(--surface-alt,#f3f4f6);padding:6px 12px;border-radius:6px;border:1px solid var(--border);">자동매칭</span>
            <span style="color:var(--text-faint);">→</span>
            <span style="background:var(--surface-alt,#f3f4f6);padding:6px 12px;border-radius:6px;border:1px solid var(--border);">수락</span>
            <span style="color:var(--text-faint);">→</span>
            <span style="background:var(--amber);color:#000;font-weight:700;padding:6px 12px;border-radius:6px;">전투 (채팅)</span>
            <span style="color:var(--text-faint);">→</span>
            <span style="background:var(--surface-alt,#f3f4f6);padding:6px 12px;border-radius:6px;border:1px solid var(--border);">나가기</span>
            <span style="color:var(--text-faint);">→</span>
            <span style="background:#dcfce7;color:#166534;font-weight:700;padding:6px 12px;border-radius:6px;">반복 ♻️</span>
          </div>
        </div>

        <!-- 주의사항 -->
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius-md);padding:16px 20px;margin-bottom:20px;">
          <h3 style="font-size:0.95rem;color:#dc2626;margin-bottom:10px;">⚠️ 주의사항</h3>
          <ul style="padding-left:18px;font-size:0.84rem;color:#991b1b;line-height:1.8;">
            <li><strong>LDPlayer 버전</strong> — v9.5.6.0 이외 버전에서는 화면 인식 오류가 발생할 수 있습니다.</li>
            <li><strong>ADB 디버그</strong> — 반드시 켜져 있어야 합니다. 꺼져있으면 인스턴스 연결 불가.</li>
            <li><strong>해상도</strong> — 960x540이 아니면 이미지 매칭이 실패합니다.</li>
            <li><strong>문제 발생 시</strong> — STOP 후 다시 START 해주세요. 대부분 해결됩니다.</li>
          </ul>
        </div>

        <!-- 업데이트 내역 -->
        <div style="border-top:1px solid var(--border);padding-top:24px;">
          <h2 style="font-size:1.05rem;font-weight:800;color:var(--text);margin-bottom:16px;">📝 업데이트 내역</h2>

          <div style="margin-bottom:16px;">
            <h3 style="font-size:0.9rem;font-weight:700;color:var(--amber-dark);">v3.1 (2026-04-16)</h3>
            <ul style="padding-left:20px;color:var(--text);font-size:0.84rem;line-height:1.8;margin-top:6px;">
              <li><strong>커스텀 이름 앱플레이어 채팅 수정</strong> — 기본 이름이 아닌 앱플레이어(예: 호떡)에서 채팅이 안 써지던 문제 해결</li>
              <li><strong>창 탐색 개선</strong> — 인스턴스 이름도 키워드로 검색하도록 개선</li>
            </ul>
          </div>

          <div style="margin-bottom:16px;">
            <h3 style="font-size:0.9rem;font-weight:700;color:var(--amber-dark);">v3.0 (2026-04-16)</h3>
            <ul style="padding-left:20px;color:var(--text);font-size:0.84rem;line-height:1.8;margin-top:6px;">
              <li><strong>64비트 Windows 호환성 전면 수정</strong> — 채팅·클립보드 오류 해결</li>
              <li><strong>채팅 입력 안정화</strong> — WM_CHAR 기반으로 변경</li>
              <li><strong>권장 환경</strong> — LDPlayer 9 v9.5.6.0</li>
            </ul>
          </div>

          <div style="margin-bottom:16px;">
            <h3 style="font-size:0.9rem;font-weight:700;color:var(--amber-dark);">v2.8 (2026-04-15)</h3>
            <ul style="padding-left:20px;color:var(--text);font-size:0.84rem;line-height:1.8;margin-top:6px;">
              <li><strong>LD플레이어 탐지 대폭 개선</strong> — Windows 11 환경 대응</li>
            </ul>
          </div>

          <div style="margin-bottom:16px;">
            <h3 style="font-size:0.9rem;font-weight:700;color:var(--amber-dark);">v2.6 (2026-04-14)</h3>
            <ul style="padding-left:20px;color:var(--text);font-size:0.84rem;line-height:1.8;margin-top:6px;">
              <li>난이도 선택 버그 수정 · 채팅 테스트 기능 개선</li>
            </ul>
          </div>

          <div style="margin-bottom:16px;">
            <h3 style="font-size:0.9rem;font-weight:700;color:var(--amber-dark);">v2.5 이전</h3>
            <ul style="padding-left:20px;color:var(--text);font-size:0.84rem;line-height:1.8;margin-top:6px;">
              <li>길드원 인증 시스템 · 카오스 난이도 · 인기도 자동 체크(100회) · 디스코드 웹훅</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("downloadBtn").addEventListener("click", async () => {
    const msg = document.getElementById("downloadMsg");
    const btn = document.getElementById("downloadBtn");
    btn.disabled = true;
    btn.textContent = "다운로드 중...";
    msg.textContent = "";
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
      btn.textContent = "⬇️ 다운로드";
    }
  });
});
