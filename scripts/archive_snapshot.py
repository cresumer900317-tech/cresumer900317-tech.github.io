"""운영 종료 전 백엔드 GET 응답을 archive-data/ 에 정적 JSON으로 박제한다.

common.js 의 archiveFile() 과 같은 규칙으로 파일 이름을 만든다.
실행: python -X utf8 scripts/archive_snapshot.py
"""
import json
import os
import re
import urllib.parse
import urllib.request

API = "https://guild-backend-production-75a6.up.railway.app"
OUT = os.path.join(os.path.dirname(__file__), "..", "archive-data")
FAILED = []
GUILDS = ["친구들", "친구둘", "친구삼", "친구넷", "친구닷"]


def enc(s):
    # JS encodeURIComponent 와 같은 결과
    return urllib.parse.quote(s, safe="-_.!~*'()")


def fnv(s):
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return format(h, "08x")


def archive_file(p):
    path, _, query = p.partition("?")
    name = re.sub(r"[^A-Za-z0-9_-]", "_", path[len("/api/"):])
    return f"{name}--{fnv(p)}.json" if query else f"{name}.json"


def get(p):
    with urllib.request.urlopen(API + p, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def save(p, data=None):
    if data is None:
        try:
            data = get(p)
        except Exception as e:
            print("skip", p, e)
            FAILED.append(p)
            return None
    with open(os.path.join(OUT, archive_file(p)), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    return data


def main():
    os.makedirs(OUT, exist_ok=True)
    for p in [
        "/api/home-summary", "/api/members", "/api/ranking", "/api/weekly", "/api/notices",
        "/api/guild-ranks", "/api/server-ranking?limit=7000", "/api/visitors/stats",
        "/api/notices?summary=true", "/api/tips?summary=true", "/api/server-guild-ranking?limit=30",
        "/api/server-stats", "/api/guild-health?limit=30", "/api/coupons", "/api/home-videos",
        "/api/official-notices", "/api/popular-searches", "/api/guild-dashboard",
        "/api/content-records", "/api/growth-story", "/api/monthly", "/api/content-archive",
    ]:
        save(p)
    for g in GUILDS:
        save("/api/guild-source?guild=" + enc(g))
    for t in get("/api/tips?summary=true"):
        for suffix in ("", "/adjacent", "/comments"):
            save(f"/api/tips/{t['id']}{suffix}")
    for m in get("/api/members"):
        n = enc(str(m.get("name", "")))
        save(f"/api/server-ranking/history?name={n}&days=365")
        save(f"/api/change-log?name={n}")
    print("files:", len(os.listdir(OUT)))
    if FAILED:
        raise SystemExit(f"실패 {len(FAILED)}건: 서버를 내리기 전에 다시 수집하세요")


if __name__ == "__main__":
    main()
