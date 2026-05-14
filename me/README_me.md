# /me — 개인 업무 관리 페이지

친구들.com/me — 외부 두뇌 / 개인 비서 시스템.

## 구조

- `me/index.html` — 페이지 마크업
- `me/me.css` — 스타일 (다크모드, Apple/Linear/Notion 톤)
- `me/me.js` — 클라이언트 로직 (vanilla JS)
- `me/README_me.md` — 이 문서

백엔드는 별도 레포 `guild_backend` (FastAPI + Supabase). Railway 배포.

## 기능

| 영역 | 설명 |
|---|---|
| Dashboard | 첫 화면. "무엇을 기억할까요?" 단일 입력창 + 위젯 (오늘/이번주/마감임박/Inbox/최근로그) |
| Inbox | 즉흥 메모 보관함. 미처리 항목 → Task 로 승격 가능 |
| Tasks | 리스트 / 칸반 (할 일/진행 중/대기/완료) |
| Projects | 결혼준비/쿠팡/신혼집/개인개발 등. Tasks 연결, 진행률 자동 계산 |
| Daily Log | 그날 뭐 했는지. 단일 textarea, 검색 가능 |
| Calendar | 월간/주간. Tasks 마감일 + Project 기간 |
| Gantt | **365일 일단위** 가로스크롤. Project 별 막대 + 오늘 빨간 세로선 |
| AI 정리 | Inbox 자동 분류, Daily Log 주간 요약, 오늘 브리핑 |

## 배포

### 프론트엔드 (GitHub Pages 자동)

```bash
git push origin main
```

`cresumer900317-tech/cresumer900317-tech.github.io` 에 push 하면
1~2분 내로 친구들.com/me 에 반영.

### 백엔드 (Railway 자동)

```bash
cd ../../guild_backend
git push origin main
```

Railway 가 main 브랜치 push 감지 → 자동 재배포.
배포 URL: https://guild-backend-production-75a6.up.railway.app

### Supabase 스키마 마이그레이션

새 테이블/컬럼 추가 시 SQL Editor 에서 한 번만 실행:

- `guild_backend/sql/personal_tasks.sql` — 기본 테이블 (categories, tasks)
- `guild_backend/sql/personal_extras.sql` — 확장 (projects, inbox, daily_logs, ai_summaries)

### 환경변수 (Railway)

| 키 | 용도 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_KEY` | service_role 키 |
| `JWT_SECRET` | 로그인 토큰 서명 |
| `ANTHROPIC_API_KEY` | AI 정리 기능 (Phase 5; 미설정 시 AI 비활성, `claude-haiku-4-5`) |

## API 엔드포인트 (개인 업무 관련)

전부 `Authorization: Bearer <token>` 필요. owner = 본인 character_name.

### Categories

- `GET /api/me/categories`
- `POST /api/me/categories` — `{name, color, sort_order}`
- `PATCH /api/me/categories/{id}`
- `DELETE /api/me/categories/{id}`

### Tasks

- `GET /api/me/tasks?status=&category=`
- `POST /api/me/tasks` — `{title, category, project_id, status, priority, due_date, tags, notes}`
- `PATCH /api/me/tasks/{id}`
- `DELETE /api/me/tasks/{id}`

### Projects

- `GET /api/me/projects` — `task_count, done_count, computed_progress` 자동 계산 포함
- `POST /api/me/projects` — `{name, description, status, start_date, end_date, progress_pct, color, notes}`
- `PATCH /api/me/projects/{id}`
- `DELETE /api/me/projects/{id}` — task 의 project_id 는 자동 NULL

### Inbox

- `GET /api/me/inbox?processed=true|false`
- `POST /api/me/inbox` — `{content}`
- `PATCH /api/me/inbox/{id}` — `{content?, processed?}`
- `DELETE /api/me/inbox/{id}`
- `POST /api/me/inbox/{id}/promote` — `{title?, category?, project_id?, priority?, due_date?}` → 새 Task 생성 + inbox 처리됨 표시

### Daily Logs

- `GET /api/me/daily-logs?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `GET /api/me/daily-logs/{YYYY-MM-DD}` — 없으면 빈 객체
- `PUT /api/me/daily-logs` — `{log_date?, content}` upsert
- `DELETE /api/me/daily-logs/{YYYY-MM-DD}`

### Dashboard 한 번에

- `GET /api/me/dashboard` — `{tasks, projects, inbox, daily_logs, categories}`

### AI 정리 (Phase 5 — Claude haiku)

전부 `ANTHROPIC_API_KEY` 가 Railway 환경변수에 있어야 작동. 없으면 503 응답.

- `GET /api/me/ai/status` — `{enabled: bool, model: "claude-haiku-4-5-..."}`
- `POST /api/me/daily-logs/{YYYY-MM-DD}/analyze` — 그 날 로그를 분석해 `{tasks, future, decisions, tags}` 추출.
  동일 내용은 `personal_ai_summaries(kind=daily_log_extract, source_hash)` 캐시에서 재사용 (API 호출 없음).
- `GET /api/me/daily-logs/{YYYY-MM-DD}/extracts` — 캐시된 추출 결과만 조회 (없으면 `{id: null, extract: null}`). API 호출 없음.
- `POST /api/me/extracts/{eid}/promote` — `{kind:"tasks"|"future", index, category?, project_id?, priority?, due_date?}` → 새 personal_tasks 행 생성 + payload.promoted 에 마킹.
- `POST /api/me/extracts/{eid}/dismiss` — `{kind:"tasks"|"future"|"decisions", index}` → payload.dismissed 마킹 (체크리스트에서 비활성).
- `POST /api/me/search` — `{query, days?}` → 최근 `days(기본 90, 7~365)` 일치 하루 로그를 컨텍스트로 자연어 질의응답. `{answer, sources:[{date,snippet}], logs_searched, days}` 반환.
