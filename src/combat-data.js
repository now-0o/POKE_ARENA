const move = (name, kind, fx, damage, cooldown, extra = {}) => ({ name, kind, fx, damage, cooldown, windup: .24, recovery: .28, ...extra });
export const FIGHTERS = {
  pikachu: { hp: 225, speed: 225, color: '#ebce59', basic: move('전기쇼크', 'projectile', 0, 12, .76, { speed: 490, range: 370, radius: 8, windup: .15 }), q: move('10만볼트', 'projectile', 0, 31, 4.8, { speed: 670, range: 490, radius: 11, stun: .35, windup: .34, recovery: .36, hint: '빠르고 좁은 전격 · 짧은 경직' }), r: move('번개', 'area', 12, 55, 8, { range: 410, radius: 62, windup: .92, recovery: .44, hint: '지정 위치 낙뢰 · 긴 예고' }) },
  charizard: { hp: 270, speed: 193, color: '#df8e59', basic: move('불꽃세례', 'projectile', 1, 13, .84, { speed: 390, range: 330, radius: 10, windup: .19 }), q: move('화염방사', 'cone', 1, 13, 5.7, { range: 265, halfAngle: .32, burn: 1.6, windup: .4, duration: .78, interval: .26, recovery: .4, hint: '방향 고정 부채꼴 · 유지 공격' }), r: move('불대문자', 'projectile', 13, 43, 8.3, { speed: 280, range: 490, radius: 19, explode: 72, windup: .5, recovery: .55, hint: '느린 불꽃 탄 · 접촉 시 폭발' }) },
  blastoise: { hp: 320, speed: 173, color: '#77b9d1', basic: move('물대포', 'projectile', 2, 14, .9, { speed: 430, range: 360, radius: 10 }), q: move('하이드로펌프', 'twin', 2, 23, 6, { range: 520, speed: 570, radius: 12, knockback: 40, windup: .5, recovery: .55, hint: '두 포신의 직선 물줄기 · 밀치기' }), r: move('소용돌이', 'field', 14, 9, 8, { range: 365, radius: 80, windup: .65, duration: 2.4, interval: .6, slow: .7, recovery: .35, hint: '2.4초 장판 · 접근로 차단' }) },
  venusaur: { hp: 300, speed: 170, color: '#91bd69', basic: move('잎날가르기', 'projectile', 3, 14, .88, { speed: 420, range: 385, radius: 9, returning: true }), q: move('솔라빔', 'beam', 3, 63, 7.5, { range: 660, radius: 16, windup: 1.1, recovery: .65, hint: '긴 충전 · 긴 사거리 · 큰 빈틈' }), r: move('덩굴채찍', 'pull', 3, 25, 5.8, { range: 220, radius: 23, pull: 75, root: .4, windup: .3, recovery: .35, hint: '직선 덩굴 · 적을 끌어오기' }) },
  gengar: { hp: 220, speed: 223, color: '#b28fc4', basic: move('핥기', 'melee', 4, 17, .78, { range: 70, radius: 22, windup: .18 }), q: move('섀도볼', 'projectile', 4, 39, 5.1, { range: 500, speed: 285, radius: 17, explode: 48, curse: true, windup: .36, recovery: .36, hint: '느린 구체 · 좁은 폭발' }), r: move('그림자분신', 'blink', 4, 0, 7, { range: 190, windup: .13, recovery: .15, empower: 16, hint: '짧은 순간이동 · 다음 기본공격 강화' }) },
  machamp: { hp: 320, speed: 194, color: '#c69f79', basic: move('펀치', 'melee', 5, 18, .8, { range: 75, radius: 24, windup: .18 }), q: move('크로스촙', 'combo', 5, 23, 4.7, { range: 100, radius: 26, windup: .3, duration: .17, interval: .17, recovery: .4, hint: '짧은 거리 2연타 · 방향 고정' }), r: move('폭발펀치', 'melee', 5, 51, 7, { range: 95, radius: 32, stun: .6, windup: .6, recovery: .72, hint: '느린 강타 · 빗나가면 긴 빈틈' }) },
  snorlax: { hp: 395, speed: 149, color: '#bdc09c', basic: move('몸통박치기', 'melee', 6, 20, .98, { range: 81, radius: 28, windup: .26, recovery: .4 }), q: move('누르기', 'leap', 6, 45, 6.5, { range: 215, radius: 67, windup: .35, duration: .6, recovery: .65, slow: 1.1, hint: '점프 후 착지 · 착지점 예고' }), r: move('잠자기', 'heal', 15, 0, 14, { heal: 88, windup: 1.75, recovery: .55, hint: '제자리 회복 · 피격 시 취소' }) },
  lucario: { hp: 255, speed: 218, color: '#79b9cf', basic: move('발경', 'melee', 7, 16, .72, { range: 76, radius: 23, windup: .16 }), q: move('파동탄', 'projectile', 7, 34, 5.2, { range: 540, speed: 300, homing: .85, mark: true, radius: 13, windup: .42, recovery: .32, hint: '완만하게 추적 · 회피로 따돌리기' }), r: move('신속', 'dash', 10, 30, 5.8, { range: 255, duration: .22, radius: 25, detonateMark: true, windup: .17, recovery: .34, hint: '빠른 직선 돌진 · 무적 없음' }) },
  garchomp: { hp: 305, speed: 207, color: '#9793c0', basic: move('드래곤클로', 'melee', 8, 18, .83, { range: 90, radius: 24, windup: .22 }), q: move('드래곤다이브', 'dash', 8, 45, 6.4, { range: 315, duration: .4, radius: 30, knockback: 50, windup: .55, recovery: .7, hint: '길게 준비 후 돌진 · 후딜 공략 가능' }), r: move('지진', 'wave', 6, 48, 8, { range: 0, radius: 200, speed: 310, windup: .65, recovery: .65, hint: '바깥으로 퍼지는 충격파 · 안쪽은 안전' }) },
  gardevoir: { hp: 230, speed: 196, color: '#d2a0c0', basic: move('염동력', 'projectile', 15, 12, .82, { speed: 400, range: 390, radius: 9 }), q: move('사이코키네시스', 'area', 15, 32, 5.8, { range: 400, radius: 64, pull: 70, root: .45, windup: .75, recovery: .35, hint: '지정 위치로 모으기 · 짧은 속박' }), r: move('문포스', 'projectile', 9, 42, 7, { range: 510, speed: 335, radius: 17, weaken: 2, windup: .45, recovery: .4, hint: '직선 구체 · 적 공격력 일시 감소' }) },
};
export const WORLD = { width: 1600, height: 900, left: 120, right: 1480, top: 170, bottom: 735 };
export const DODGE = { duration: .18, invulnerability: .23, speed: 820, cooldown: 2.3, recovery: .12 };

// E is reserved for the team energy ultimate. Q/R remain normal skills.
const ult = (name,kind,fx,damage,extra) => move(name,kind,fx,damage,0,{ultimate:true,windup:.65,recovery:.65,...extra});
const ultimates = {
 pikachu: ult('번개 폭풍','storm',12,24,{range:430,radius:64,duration:1.25,interval:.25,hint:'위치 고정 5연속 낙뢰 · 예고를 보고 회피'}),
 charizard: ult('블라스트번','eruption',13,24,{range:350,radius:70,duration:.9,interval:.3,hint:'전방으로 3단 불꽃 분출 · 진행 경로 예고'}),
 blastoise: ult('하이드로캐논','beam',2,84,{range:730,radius:32,windup:.9,knockback:95,hint:'긴 충전 후 관통 물대포 · 강한 밀치기'}),
 venusaur: ult('하드플랜트','garden',3,19,{range:380,radius:120,duration:2.2,interval:.55,root:.35,hint:'덩굴 지대 생성 · 주기적 속박'}),
 gengar: ult('고스트다이브','ambush',4,70,{range:310,radius:62,windup:.7,hint:'표식 뒤로 이동 후 폭발 · 지점이 미리 공개됨'}),
 machamp: ult('인파이트','barrage',5,13,{range:130,radius:31,duration:1.05,interval:.15,hint:'방향 고정 7연타 · 마지막 타격 밀치기'}),
 snorlax: ult('기가임팩트','leap',6,80,{range:350,radius:115,duration:.75,windup:.6,recovery:.9,knockback:65,hint:'큰 도약 후 착지 충격파 · 착지점 회피'}),
 lucario: ult('파동 연격','fan',7,25,{range:590,speed:400,radius:16,windup:.6,hint:'부채꼴 파동탄 5발 · 탄 사이로 피하기'}),
 garchomp: ult('대지의 분노','quake',6,32,{range:0,radius:300,speed:360,duration:1.5,interval:.5,hint:'세 번 퍼지는 지진 · 링 사이를 통과'}),
 gardevoir: ult('미래예지','future',15,88,{range:450,radius:96,windup:.35,delay:1.25,hint:'긴 지연 표식 후 폭발 · 회피할 시간 제공'}),
};
for(const [id,fighter] of Object.entries(FIGHTERS)) fighter.e=ultimates[id];
export const ENERGY={max:100,passive:2.4,dealt:.5,taken:.22,dodge:10};

export const SWITCH = { cooldown: 14, exposure: .9, skillLock: 2, dodgeLock: 1.2 };

export function arenaBounds(y){const t=Math.max(0,Math.min(1,(y-WORLD.top)/(WORLD.bottom-WORLD.top)));return{left:200-75*t,right:1400+75*t};}
