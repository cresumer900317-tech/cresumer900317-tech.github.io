document.addEventListener('DOMContentLoaded',()=>{
  renderShell();
  const guilds=['친구들','친구둘','친구삼','친구넷','친구닷'];
  document.querySelector('main').innerHTML=`<section class="container" style="padding-top:28px"><span class="eyebrow">DATA & RECORDS</span><h1>MGF 수집 현황</h1><p>원본에 공개된 길드 전투력과 토벌전 점수를 확인하세요.</p><div class="source-info"><b>원본 기준일과 조회 시각은 달라요.</b><br>원본 기준일은 MGF가 표시한 데이터 날짜, 조회 시각은 라운지가 페이지를 확인한 시간입니다. 점수는 보스 처치·접속 여부를 뜻하지 않습니다. 이 페이지는 MGF 원본 명단을 표시하므로 라운지의 제외 설정이 적용된 명단과 다를 수 있습니다.</div><div class="source-grid">${guilds.map((g,i)=>`<article class="source-card" id="source${i}" aria-live="polite"><h2>${g}</h2><p>원본 확인 중…</p></article>`).join('')}</div><div class="source-info"><b>더 살펴보기</b><p><a href="https://mgf.gg/contents/stage.php" target="_blank" rel="noopener">MGF 스테이지 정보 ↗</a> · <a href="https://mgf.gg/contents/guild.php" target="_blank" rel="noopener">MGF 길드 콘텐츠 ↗</a> · <a href="https://forum.nexon.com/maplestoryidle-kr/" target="_blank" rel="noopener">넥슨 공식 소식 ↗</a></p>원본에 없는 실시간 접속·보스 처치 여부는 표시하지 않습니다.</div></section>`;
  async function load(i){
    const root=document.getElementById('source'+i),guild=guilds[i];
    try{
      const d=await requestJson('/api/guild-source?guild='+encodeURIComponent(guild));
      const dated=d.sourceDate||'원본 날짜 미제공';
      root.classList.toggle('is-error',!!d.stale);
      root.innerHTML=`<h2>${escapeHtml(guild)}</h2><p><b>MGF 기준 ${escapeHtml(dated)}</b>${d.stale?' · 마지막 성공 기록':''}</p>${observationHtml(d.fetchedAt,'페이지 조회',3)}<dl><div><dt>원본 길드원</dt><dd>${d.memberCount}명</dd></div><div><dt>길드 전투력</dt><dd>${d.totalPower==null?'미제공':fmtPowerShort(d.totalPower)}</dd></div><div><dt>길드 토벌전 점수</dt><dd>${d.bossScore==null?'미제공':formatCompactPower(d.bossScore)}</dd></div></dl><details><summary>길드원 토벌전 점수 보기</summary><div class="source-members">${(d.members||[]).map(m=>`<a class="source-member" href="./profile?n=${encodeURIComponent(m.name)}"><span>${escapeHtml(m.name)}<small> · ${escapeHtml(m.job)}</small></span><b>${m.bossScore==null?'미제공':formatCompactPower(m.bossScore)}</b></a>`).join('')}</div></details><p><a href="https://mgf.gg/contents/guild_info.php?g_name=${encodeURIComponent(guild)}" target="_blank" rel="noopener">MGF 원본 보기 ↗</a></p>`;
    }catch{root.classList.add('is-error');root.innerHTML=`<h2>${escapeHtml(guild)}</h2><p>원본을 확인하지 못했어요. 빈 길드나 0점으로 처리하지 않습니다.</p><button class="ghost-btn">다시 확인</button>`;root.querySelector('button').onclick=()=>{root.querySelector('button').disabled=true;load(i);};}
  }
  // At most two source requests at a time. Each server result is cached for an hour.
  let next=0;async function worker(){while(next<guilds.length){const i=next++;await load(i);}}
  Promise.all([worker(),worker()]);
});
