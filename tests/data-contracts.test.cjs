const test=require('node:test'), assert=require('node:assert/strict'), vm=require('node:vm'), fs=require('node:fs');
const ctx=vm.createContext({document:{addEventListener(){}},window:{},console,Intl,Date,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync('assets/js/common.js','utf8'),ctx);
const evaluate=code=>vm.runInContext(code,ctx);
test('7 days uses calendar dates, not 7 sparse records',()=>{
  assert.equal(evaluate(`historyInDays([{date:'2026-08-01'},{date:'2026-09-07'},{date:'2026-09-08'},{date:'2026-09-14'}],7,'2026-09-14').length`),2);
  assert.equal(evaluate(`elapsedHistoryDays([{date:'2026-08-01'},{date:'2026-09-01'}])`),31);
});
test('shared health scoring preserves unavailable growth',()=>{
  assert.equal(evaluate(`guildHealthScore({medianPower:1e12,memberSampled:30,effContributors:10,activeRatio:1,growthRatio:0,growthSampled:0}).growth`),null);
  assert.equal(evaluate(`guildHealthScore({medianPower:1e12,memberSampled:30,effContributors:10,activeRatio:1,growthRatio:0,growthSampled:30}).growth`),0);
});
test('latest stats do not invent a new server rank',()=>{
  const value=evaluate(`mergeServerMembers([{nickname:'A',power:100,serverRank:3,capturedAt:'2026-09-13T00:00:00Z'}],[{name:'A',power:90,level:2,capturedAt:'2026-09-14T00:00:00Z'}])[0]`);
  assert.equal(value.power,90);assert.equal(value.serverRank,3);assert.equal(value.rankCapturedAt,'2026-09-13T00:00:00Z');
});
test('timestamp interpreted in UTC, then displayed in Korea time',()=>{
 assert.equal(evaluate(`observationDate('2026-09-13T16:00:00').toISOString()`),'2026-09-13T16:00:00.000Z');
 assert.equal(evaluate(`kstDateKey('2026-09-13T16:00:00Z')`),'2026-09-14');
});
test('zero is a real value and invalid input is not zero',()=>{
 assert.equal(evaluate('formatCompactPower(0)'),'0');
 assert.equal(evaluate(`formatCompactPower('bad')`),'-');
});

test('current power never reassigns an old server rank to a new date',()=>{
 const data=vm.runInContext(`historyWithCurrent([{date:'2026-09-04',power:80,serverRank:2}],{power:173,serverRank:2,capturedAt:'2026-09-14T01:00:00+09:00',rankCapturedAt:'2026-09-04T09:00:00+09:00'})`,ctx);
 assert.equal(data.length,2);assert.equal(data[1].power,173);assert.equal(data[1].serverRank,null);
});
