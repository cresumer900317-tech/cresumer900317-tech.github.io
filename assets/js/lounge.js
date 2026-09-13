/* Personal shortcuts use this browser's storage; checking a task never claims game activity. */
function mountReturnHub(members) {
  const root=document.getElementById('returnHub'); if(!root)return;
  let prefs=readLoungePrefs();
  const user=getUser();
  const today=kstDateKey();
  const tasks=[['growth','전적 확인','./profile'],['notice','길드 공지 읽기','./notice'],['checkin','라운지 출석','./points']];
  let checks={};try{const saved=JSON.parse(localStorage.getItem('friends.lounge.tasks')||'{}');if(saved.date===today)checks=saved.checks||{};}catch{}
  const card=name=>{
    const member=members.find(m=>m.name.normalize('NFC')===name.normalize('NFC'));
    return `<a class="watch-card" href="./profile?n=${encodeURIComponent(name)}">${characterAvatarHtml(member||{name})}<div><strong>${escapeHtml(name)}</strong><span>${member?escapeHtml(member.job)+' · Lv.'+member.level:'전적을 열어 확인'}</span><b>${member?fmtPowerShort(member.power):'캐릭터 보기 →'}</b></div></a>`;
  };
  function render(){
    const primary=user?.character_name||prefs.primary;
    document.body.classList.toggle('returning-visitor',!!primary);
    const names=[...new Set([primary,...prefs.favorites].filter(Boolean))].slice(0,5);
    root.innerHTML=`<div class="hub-heading"><div><span class="eyebrow">MY LOUNGE</span><h2>다시 만나서 반가워요${primary?', '+escapeHtml(primary)+'님':''}</h2></div><a href="./points" class="hub-checkin">오늘 출석하기 →</a></div>
      <div class="hub-grid"><div class="hub-card"><div class="hub-card-head"><h3>내 캐릭터와 관심 캐릭터</h3><a href="./profile">찾아보기 →</a></div>
      ${names.length?`<div class="watch-grid">${names.map(card).join('')}</div>`:'<p class="hub-description">캐릭터를 등록하면 홈에서 바로 전적을 확인할 수 있어요.</p>'}
      ${!user?`<form id="primaryCharacter" class="primary-form"><label for="primaryName">내 캐릭터</label><input id="primaryName" name="name" value="${escapeHtml(prefs.primary)}" placeholder="캐릭터명 입력" maxlength="40" required><button type="submit">저장</button></form>`:''}
      <p class="local-note">관심 캐릭터는 전적 페이지에서 ☆로 등록 · 이 브라우저에 저장</p><p id="hubStatus" role="status"></p></div>
      <div class="hub-card"><div class="hub-card-head"><h3>오늘의 라운지</h3><span>${today.slice(5).replace('-',' / ')}</span></div>
      <div class="daily-tasks">${tasks.map(([key,label,url])=>`<div><label><input type="checkbox" data-task="${key}" ${checks[key]?'checked':''}><span>${label}</span></label><a href="${key==='growth'&&primary?'./profile?n='+encodeURIComponent(primary):url}" aria-label="${label} 열기">열기 ↗</a></div>`).join('')}</div>
      <p class="local-note">직접 체크하는 메모 · 매일 한국 시간 0시 초기화<br>게임 내 참여 여부와 연동되지 않습니다.</p></div></div><div id="homeSource" class="source-info">MGF 원본 기준일을 확인하고 있어요…</div>`;
    root.querySelector('#primaryCharacter')?.addEventListener('submit',e=>{e.preventDefault();prefs.primary=new FormData(e.target).get('name').normalize('NFC').trim();const ok=writeLoungePrefs(prefs);render();root.querySelector('#hubStatus').textContent=ok?'내 캐릭터를 저장했어요.':'브라우저 저장 공간을 사용할 수 없어요.';});
    root.querySelectorAll('[data-task]').forEach(input=>input.addEventListener('change',()=>{checks[input.dataset.task]=input.checked;try{localStorage.setItem('friends.lounge.tasks',JSON.stringify({date:today,checks}));}catch{root.querySelector('#hubStatus').textContent='체크 상태를 저장하지 못했어요.';}}));
    loadSource();
  }
  function loadSource(){
  const selected=members.find(m=>m.name===(user?.character_name||prefs.primary))?.guild||'친구들';
  requestJson('/api/guild-source?guild='+encodeURIComponent(selected)).then(d=>{
    const el=document.getElementById('homeSource');if(!el)return;
    el.innerHTML=`<b>${escapeHtml(selected)} · MGF 원본 ${escapeHtml(d.sourceDate||'기준일 미제공')}</b><span> 토벌전 ${d.bossScore==null?'점수 미제공':formatCompactPower(d.bossScore)}${d.stale?' · 마지막 성공 기록':''}</span><a href="./sources" style="margin-left:16px">길드별 수집 현황 →</a>`;
  }).catch(()=>{const el=document.getElementById('homeSource');if(el)el.innerHTML='MGF 원본 조회가 지연되고 있어요. <a href="./sources">수집 현황 확인 →</a>';});
  }
  render();
}
