#!/usr/bin/env python3
"""skills.xlsx → skills.json 변환.

원본은 skills.xlsx (사람이 Excel로 편집). 계산기는 skills.json만 읽는다.
엑셀은 바이너리라 git 병합이 안 되므로 편집은 한 번에 한 기기에서만.

사용:  python3 docs/maple-idle/build-skills-json.py
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

HERE = Path(__file__).parent
SRC = HERE / "skills.xlsx"
DST = HERE / "skills.json"

# 05-직업-스킬데이터.md 의 확정 매핑
STATS = {
    "히어로": ("STR", "DEX"), "팔라딘": ("STR", "DEX"), "다크나이트": ("STR", "DEX"),
    "바이퍼": ("STR", "DEX"), "캡틴": ("STR", "DEX"),
    "보우마스터": ("DEX", "STR"), "신궁": ("DEX", "STR"), "윈드브레이커": ("DEX", "STR"),
    "불독": ("INT", "LUK"), "썬콜": ("INT", "LUK"), "비숍": ("INT", "LUK"),
    "나이트로드": ("LUK", "DEX"), "섀도어": ("LUK", "DEX"), "나이트워커": ("LUK", "DEX"),
}

COLS = ["계열", "직업", "스킬명", "차수", "구분", "쿨타임", "지속시간", "지속시간2",
        "계수", "타수", "대상수", "마스터리", "세부내용"]


def num(v):
    """숫자면 float, 아니면 None."""
    return float(v) if isinstance(v, (int, float)) else None


def parse_coef(v):
    """계수 → (값, 원문). '330%, 740%' 처럼 다단 계수는 리스트로."""
    if v is None:
        return None, None
    if isinstance(v, (int, float)):
        return float(v), None
    s = str(v).strip()
    # "330%, 740%" → [3.3, 7.4]  (% 표기는 100으로 나눠 배율로 통일)
    parts = re.findall(r"(\d+(?:\.\d+)?)\s*%", s)
    if parts:
        return [round(float(p) / 100, 4) for p in parts], s
    return None, s


def main():
    if not SRC.exists():
        sys.exit(f"원본 없음: {SRC}")

    ws = openpyxl.load_workbook(SRC, data_only=True)["스킬데이터"]
    rows = [r for r in ws.iter_rows(min_row=2, values_only=True) if r and r[1]]

    jobs, warnings = {}, []
    for r in rows:
        d = dict(zip(COLS, list(r) + [None] * (len(COLS) - len(r))))
        job = str(d["직업"]).strip()
        if job not in STATS:
            warnings.append(f"미등록 직업: {job}")
            continue

        coef, coef_raw = parse_coef(d["계수"])
        skill = {
            "name": str(d["스킬명"]).strip(),
            "tier": d["차수"],
            "type": d["구분"],          # 기본공격 / 액티브 / 패시브
            "cooldown": num(d["쿨타임"]),
            "duration": num(d["지속시간"]),
            "duration2": num(d["지속시간2"]),
            "coef": coef,               # 1레벨 기준 배율
            "hits": num(d["타수"]),
            "targets": num(d["대상수"]),
            "mastery": (str(d["마스터리"]).strip() or None) if d["마스터리"] else None,
            "detail": (str(d["세부내용"]).strip() or None) if d["세부내용"] else None,
        }
        if coef_raw:
            skill["coef_raw"] = coef_raw

        # 기본공격은 쿨타임이 없다 — 공격속도에 맞춰 반복 시전되는 액티브
        if skill["type"] == "기본공격" and skill["cooldown"]:
            warnings.append(f"{job} {skill['name']}: 기본공격에 쿨타임이 들어있음")

        if job not in jobs:
            main_s, sub_s = STATS[job]
            jobs[job] = {"branch": d["계열"], "mainStat": main_s, "subStat": sub_s, "skills": []}
        jobs[job]["skills"].append(skill)

    # 직업별 채움 현황 — 남은 수집 분량을 한눈에
    for job, v in jobs.items():
        sk = v["skills"]
        act = [s for s in sk if s["type"] in ("액티브", "기본공격")]
        v["coverage"] = {
            "skills": len(sk),
            "active": len(act),
            "cooldownFilled": sum(1 for s in act if s["cooldown"] is not None),
            "coefFilled": sum(1 for s in sk if s["coef"] is not None),
            "masteryFilled": sum(1 for s in sk if s["mastery"]),
            "complete": all(s["cooldown"] is not None for s in act if s["type"] == "액티브"),
        }

    out = {
        "_source": "docs/maple-idle/skills.xlsx (원본, Excel로 편집)",
        "_generatedBy": "docs/maple-idle/build-skills-json.py",
        "_note": [
            "계수는 전 스킬 1레벨 기준 배율 (직업 간 비교·밸런스 랭킹용).",
            "사용자 본인 딜 계산에는 본인 계수를 입력받는다 — 이 값으로 대체 금지.",
            "기본공격은 쿨타임이 없다. 공격속도에 맞춰 반복 시전되는 액티브 스킬.",
            "전직업 공통 마스터리 7종은 스탯창 기적용이므로 시트에 없음 (이중 계산 방지).",
        ],
        "_baseAttack": {
            "note": "기본공격은 14직업 전부 동일 스펙. 스킬명만 다름.",
            "tier": "4차", "coef": 2.9, "hits": 5, "targets": 6, "cooldown": None,
            "mastery": ["피해량 75% 증가", "보스 몬스터 데미지 20% 추가 적용", "적 타격 횟수 1 증가"],
        },
        "jobs": jobs,
    }
    DST.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    done = [j for j, v in jobs.items() if v["coverage"]["complete"]]
    todo = [j for j, v in jobs.items() if not v["coverage"]["complete"]]
    print(f"{DST.name}  ({DST.stat().st_size:,} bytes)")
    print(f"직업 {len(jobs)} / 스킬 {sum(len(v['skills']) for v in jobs.values())}")
    print(f"쿨타임 완료 {len(done)}: {', '.join(done)}")
    print(f"미완료   {len(todo)}: {', '.join(todo)}")
    for w in warnings:
        print(f"  ⚠️  {w}")


if __name__ == "__main__":
    main()
