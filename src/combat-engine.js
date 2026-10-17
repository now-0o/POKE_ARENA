import { FIGHTERS, WORLD, DODGE, ENERGY, SWITCH, arenaBounds } from './combat-data.js';
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const len = (x, y) => Math.hypot(x, y);
const unit = (x, y) => { const d = len(x, y); return d ? { x: x / d, y: y / d } : { x: 1, y: 0 }; };
const distance = (a, b) => len(a.x - b.x, a.y - b.y);
export function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return len(p.x - a.x - dx * t, p.y - a.y - dy * t);
}
function fighter(id, side, index) {
  if (!FIGHTERS[id]) throw new Error(`Unknown fighter: ${id}`);
  return { id, side, index, hp: FIGHTERS[id].hp, maxHp: FIGHTERS[id].hp, x: side ? 1170 : 430, y: 450, facing: side ? Math.PI : 0, radius: 15, cds: { basic: 0, q: 0, r: 0, e: 0, dodge: 0 }, action: null, recovery: 0, recoveryTotal: 0, invulnerable: 0, dodgeTime: 0, dodgeVector: { x: 0, y: 0 }, trailTime: 0, attack: 0, attackTime: 0, hit: 0, slow: 0, root: 0, stun: 0, staggerGuard: 0, weaken: 0, empowered: 0, empowerTime: 0, counter: 0, counterTriggered: false, moving: false, burn: 0, burnTick: .5, burnSource: null, markTime: 0, markSide: -1, curse: 0, curseTime: 0 };
}
export function createBattle(team, botTeam, { ai = true } = {}) {
  if (!team?.length || !botTeam?.length) throw new Error('Both teams are required');
  return { teams: [team.map((id, i) => fighter(id, 0, i)), botTeam.map((id, i) => fighter(id, 1, i))], active: [0, 0], clock: 0, energy: [0,0], switchCooldown: [0,0], switchExposure: [0,0], switchCount: [0,0], cinematic: null, hitStop: 0, camera: {x:800,y:450,zoom:1}, timeLeft: 180, countdown: 2.6, phase: 'countdown', winner: null, projectiles: [], zones: [], effects: [], trails: [], texts: [], swaps: [0, 0], paused: false, aiEnabled: ai, aiTimer: 1, aiRest: 0, aiTurn: 0, aiDangerSince: null, notice: '', noticeTime: 0, shake: 0, stats: { hits: [0, 0], dodges: [0, 0], punishes: [0, 0] } };
}
export const activeFighter = (s, side) => s.teams[side][s.active[side]];
function contain(f) { const radius=f.radius||18; f.y=clamp(f.y,WORLD.top+radius,WORLD.bottom-radius); const bounds=arenaBounds(f.y); f.x=clamp(f.x,bounds.left+radius,bounds.right-radius); }
function text(s, f, value, color) { s.texts.push({ x: f.x, y: f.y - 34, value, color, life: .65, maxLife: .65 }); }
function effect(s, x, y, fx, radius = 18, angle = 0, life = .22, extra = {}) { life=Math.max(.42,life); s.effects.push({ x, y, fx, radius, angle, life, maxLife: life, ...extra }); }
function notice(s, value) { s.notice = value; s.noticeTime = 1.3; }
export function gainEnergy(s,side,amount) { s.energy[side]=clamp(s.energy[side]+amount,0,ENERGY.max); }
function recover(f, move) { f.action = null; f.recovery = move.recovery; f.recoveryTotal = move.recovery; f.recoverySpeed = move.kind === 'melee' || move.kind === 'projectile' ? .62 : .35; }
function damage(s, source, target, move, origin = source) {
  if (target.hp <= 0 || s.swaps[target.side] > 0) return false;
  if (target.invulnerable > 0) {
    if (target.dodgeTime > 0 && !target.counterTriggered && !move.dot) { target.counterTriggered = true; target.counter = 1.25; s.stats.dodges[target.side]++; gainEnergy(s,target.side,ENERGY.dodge); text(s, target, '회피 성공', '#e2eac0'); }
    return false;
  }
  const punish = target.recovery > .08 || s.switchExposure[target.side] > 0, counter = source.counter > 0;
  const comboBonus = move.detonateMark && target.markTime > 0 && target.markSide === source.side ? 22 : 0;
  if(comboBonus) {target.markTime=0;text(s,target,'파동 연계!', '#bad6df');}
  const amount = Math.round((move.damage + comboBonus + (target.curseTime>0 ? target.curse*3 : 0)) * (source.weaken > 0 ? .7 : 1) * (punish ? 1.2 : 1) * (counter ? 1.2 : 1));
  target.hp = Math.max(0, target.hp - amount); target.hit = .11; s.stats.hits[source.side]++;
  if (!move.ultimate) gainEnergy(s,source.side,amount*ENERGY.dealt); gainEnergy(s,target.side,amount*ENERGY.taken);
  if(move.burn) {target.burn=move.burn;target.burnSource=source;}
  if(move.mark) {target.markTime=3.5;target.markSide=source.side;}
  if(move.curse) {target.curse=Math.min(2,target.curse+1);target.curseTime=4;}
  if(amount>=35 && (move.ultimate || punish)) s.hitStop=.045;
  if (punish) { s.stats.punishes[source.side]++; if (move.damage >= 20) text(s, target, '빈틈 공략', '#efe1aa'); }
  if (counter) source.counter = 0;
  target.slow = Math.max(target.slow, move.slow || 0); target.root = Math.max(target.root, move.root || 0); target.weaken = Math.max(target.weaken, move.weaken || 0);
  if (move.stun && !target.staggerGuard) { target.stun = move.stun; target.staggerGuard = move.stun + 1; if (target.action) { target.action = null; target.recovery = .18; } }
  if (target.action?.move.kind === 'heal') { target.action = null; target.recovery = .35; text(s, target, '회복 중단', '#e4bdac'); }
  const d = unit(target.x - origin.x, target.y - origin.y);
  if (move.knockback) { target.x += d.x * move.knockback; target.y += d.y * move.knockback; }
  if (move.pull) { const amount = Math.min(move.pull, Math.max(0, distance(target, origin) - 32)); target.x -= d.x * amount; target.y -= d.y * amount; }
  contain(target); effect(s, target.x, target.y - 12, 11, 15); if (amount >= 20) text(s, target, `-${amount}`, target.side ? '#f5e9c4' : '#e9ae9d');
  return true;
}
export function dodge(s, f, dx, dy) {
  if (s.phase !== 'fighting' || s.paused || f.hp <= 0 || f.cds.dodge > 0 || f.dodgeTime > 0 || f.stun > 0 || f.root > 0 || s.swaps[f.side] > 0) return false;
  // Basics can be cancelled; committing to a skill must have a readable cost.
  if (f.action && f.action.slot !== 'basic') return false;
  if (f.recovery > .22) return false;
  f.action = null; f.recovery = 0;
  f.dodgeVector = len(dx, dy) ? unit(dx, dy) : { x: Math.cos(f.facing), y: Math.sin(f.facing) };
  f.dodgeTime = DODGE.duration; f.invulnerable = DODGE.invulnerability; f.cds.dodge = DODGE.cooldown; f.counterTriggered = false;
  return true;
}
export function cast(s, f, slot, aim) {
  if (s.phase !== 'fighting' || s.paused || f.hp <= 0 || f.cds[slot] > 0 || f.action || f.recovery > 0 || f.dodgeTime > 0 || f.stun > 0 || s.swaps[f.side] > 0) return false;
  const m = FIGHTERS[f.id][slot]; if (!m || (m.ultimate && s.energy[f.side] < ENERGY.max-.0001)) return false;
  if(m.ultimate) {s.energy[f.side]=0;s.cinematic={id:f.id,side:f.side,name:m.name,remaining:.55,total:.55};}
  const d = unit(aim.x - f.x, aim.y - f.y), dist = Math.min(distance(f, aim), m.range || 0);
  const target = { x: clamp(f.x + d.x * dist, WORLD.left + 18, WORLD.right - 18), y: clamp(f.y + d.y * dist, WORLD.top + 18, WORLD.bottom - 18) };
  contain(target);
  f.facing = Math.atan2(d.y, d.x); f.cds[slot] = m.cooldown;
  f.action = { move: m, slot, phase: 'windup', remaining: m.windup, total: m.windup, angle: f.facing, direction: d, origin: { x: f.x, y: f.y }, target, age: 0, nextPulse: m.interval || 1, hit: false };
  return true;
}
function inCone(target, f, a) {
  const d = distance(target, f); if (d > a.move.range + target.radius) return false;
  const angle = Math.atan2(target.y - f.y, target.x - f.x), delta = Math.atan2(Math.sin(angle - a.angle), Math.cos(angle - a.angle));
  return Math.abs(delta) <= (a.move.halfAngle || .4) + Math.atan2(target.radius, Math.max(1, d));
}
function pulse(s, f, a) {
  const m = a.move, target = activeFighter(s, 1 - f.side);
  const hit = m.kind === 'cone' ? inCone(target, f, a) : segmentDistance(target, f, { x: f.x + a.direction.x * m.range, y: f.y + a.direction.y * m.range }) <= m.radius + target.radius;
  if (hit) damage(s, f, target, m.kind==='barrage'&&a.age>=.9?{...m,knockback:60}:m);
  if (m.kind !== 'cone') effect(s, f.x + a.direction.x * m.range * .65, f.y + a.direction.y * m.range * .65, m.fx, 30, a.angle);
}
function release(s, f, a) {
  const m = a.move, target = activeFighter(s, 1 - f.side), d = a.direction;
  f.attack = .26; f.attackTime = s.clock;
  if (m.ultimate && releaseUltimate(s,f,a)) return;
  if (m.kind === 'projectile' || m.kind === 'twin') {
    for (const offset of m.kind === 'twin' ? [-13, 13] : [0]) {
      const bonus = a.slot === 'basic' && f.empowerTime > 0 ? f.empowered : 0;
      s.projectiles.push({ x: f.x + d.x * 19 - d.y * offset, y: f.y + d.y * 19 + d.x * offset, vx: d.x * m.speed, vy: d.y * m.speed, life: m.range / m.speed, source: f, move: { ...m, damage: m.damage + bonus }, angle: a.angle, radius: m.radius || 9, age: 0, returnPhase: false, hitPhase: false });
      if (bonus) { f.empowerTime = 0; f.empowered = 0; }
    }
  } else if (m.kind === 'melee' || m.kind === 'pull' || m.kind === 'beam') {
    const end = { x: f.x + d.x * m.range, y: f.y + d.y * m.range };
    if ((target.x-f.x)*d.x+(target.y-f.y)*d.y >= 0 && segmentDistance(target, f, end) <= m.radius + target.radius) { const bonus = a.slot === 'basic' && f.empowerTime > 0 ? f.empowered : 0; damage(s, f, target, { ...m, damage: m.damage + bonus }); if (bonus) { f.empowerTime = 0; f.empowered = 0; } }
    effect(s, f.x, f.y, m.fx, m.radius, a.angle, m.kind === 'beam' ? .2 : .18, { kind: m.kind, endX: end.x, endY: end.y, range: m.range });
  } else if (m.kind === 'area') {
    if (distance(target, a.target) <= m.radius + target.radius) damage(s, f, target, m, a.target);
    effect(s, a.target.x, a.target.y, m.fx, m.radius, 0, .28);
  } else if (m.kind === 'strike') {
      if(!z.hit){if(distance(z,t)<=m.radius+t.radius)damage(s,z.source,t,m,z);effect(s,z.x,z.y,m.fx,m.radius,0,.5);z.hit=true;}z.life=0;
    } else if (m.kind === 'field') {
    s.zones.push({ ...a.target, source: f, move: m, life: m.duration, maxLife: m.duration, pulse: 0 });
  } else if (m.kind === 'wave' || m.kind === 'quake') {
    s.zones.push({ x: f.x, y: f.y, source: f, move: m, life: m.radius / m.speed, maxLife: m.radius / m.speed, radius: 0, hit: false });
  } else if (m.kind === 'blink') {
    s.trails.push({ id: f.id, x: f.x, y: f.y, facing: f.facing, life: .3, maxLife: .3, side: f.side });
    f.x = a.target.x; f.y = a.target.y; f.empowered = m.empower; f.empowerTime = 2.5; contain(f);
    effect(s, f.x, f.y, m.fx, 22, 0, .2);
  } else if (m.kind === 'heal') {
    const healed = Math.min(m.heal, f.maxHp - f.hp); f.hp += healed; text(s, f, `+${healed}`, '#b6d99a'); effect(s, f.x, f.y, 15, 23, 0, .25);
  } else if (['cone', 'combo', 'barrage', 'leap', 'dash'].includes(m.kind)) {
    a.phase = 'active'; a.age = 0; a.origin = { x: f.x, y: f.y };
    if (m.kind === 'cone' || m.kind === 'combo' || m.kind === 'barrage') pulse(s, f, a);
    return;
  }
  recover(f, m);
}
function releaseUltimate(s,f,a) {
 const m=a.move,d=a.direction;
 const strike=(x,y,delay,extra={})=>s.zones.push({x:clamp(x,WORLD.left+20,WORLD.right-20),y:clamp(y,WORLD.top+20,WORLD.bottom-20),source:f,move:{...m,kind:'strike',...extra},delay,totalDelay:delay,life:.05,hit:false});
 if(m.kind==='storm') {for(const [i,[x,y]]of [[0,0],[-70,0],[70,0],[0,-65],[0,65]].entries())strike(a.target.x+x,a.target.y+y,.1+i*.24);}
 else if(m.kind==='eruption') {for(let i=1;i<=3;i++)strike(f.x+d.x*i*100,f.y+d.y*i*100,.12+(i-1)*.3);}
 else if(m.kind==='garden') {s.zones.push({...a.target,source:f,move:{...m,kind:'field'},delay:.3,totalDelay:.3,life:m.duration,maxLife:m.duration,pulse:0});}
 else if(m.kind==='future') strike(a.target.x,a.target.y,m.delay);
 else if(m.kind==='ambush') {const t=activeFighter(s,1-f.side);f.x=a.target.x-d.x*30;f.y=a.target.y-d.y*30;contain(f);strike(a.target.x,a.target.y,.18);effect(s,f.x,f.y,4,38,0,.5);}
 else if(m.kind==='fan') {for(const offset of [-.36,-.18,0,.18,.36]){const angle=a.angle+offset;s.projectiles.push({x:f.x,y:f.y,source:f,move:m,angle,vx:Math.cos(angle)*m.speed,vy:Math.sin(angle)*m.speed,life:m.range/m.speed,radius:m.radius,age:0});}}
 else if(m.kind==='quake'){for(let i=0;i<3;i++)s.zones.push({x:f.x,y:f.y,source:f,move:{...m,kind:'wave'},delay:i*.5,totalDelay:i*.5,life:m.radius/m.speed,maxLife:m.radius/m.speed,radius:0,hit:false});}
 else return false;
 recover(f,m);return true;
}
function tickAction(s, f, dt) {
  const a = f.action; if (!a) return;
  if (a.phase === 'windup') { a.remaining -= dt; if (a.remaining <= 0) release(s, f, a); return; }
  const m = a.move, before = { x: f.x, y: f.y }, oldAge = a.age; a.age = Math.min(m.duration, a.age + dt);
  if (m.kind === 'dash') {
    const travel = m.range * (a.age - oldAge) / m.duration; f.x += a.direction.x * travel; f.y += a.direction.y * travel; contain(f);
    trail(s, f, dt); const target = activeFighter(s, 1 - f.side);
    if (!a.hit && segmentDistance(target, before, f) <= m.radius + target.radius) a.hit = damage(s, f, target, m);
  } else if (m.kind === 'leap') {
    const t = a.age / m.duration; f.x = a.origin.x + (a.target.x - a.origin.x) * t; f.y = a.origin.y + (a.target.y - a.origin.y) * t;
  } else if (m.kind === 'cone' || m.kind === 'combo' || m.kind === 'barrage') {
    while (a.age >= a.nextPulse && a.nextPulse < m.duration + .001) { pulse(s, f, a); a.nextPulse += m.interval; }
  }
  if (a.age >= m.duration - .000001) {
    if (m.kind === 'leap') { const target = activeFighter(s, 1 - f.side); if (distance(target, f) <= m.radius + target.radius) damage(s, f, target, m); effect(s, f.x, f.y, m.fx, m.radius, 0, .26); }
    recover(f, m);
  }
}
function trail(s, f, dt) { f.trailTime -= dt; if (f.trailTime <= 0) { s.trails.push({ id: f.id, x: f.x, y: f.y, facing: f.facing, life: .18, maxLife: .18, side: f.side }); f.trailTime = .045; } }
function tickFighter(s, f, dt) {
  for (const key of Object.keys(f.cds)) f.cds[key] = Math.max(0, f.cds[key] - dt);
  for (const key of ['invulnerable', 'recovery', 'attack', 'hit', 'slow', 'root', 'stun', 'staggerGuard', 'weaken', 'empowerTime', 'counter', 'burn', 'markTime', 'curseTime']) f[key] = Math.max(0, f[key] - dt);
  if (f.hp <= 0) { f.action = null; f.dodgeTime = 0; return; }
  if (f.dodgeTime > 0) {
    const portion = Math.min(dt, f.dodgeTime); f.dodgeTime = Math.max(0, f.dodgeTime - portion); trail(s, f, dt);
    f.x += f.dodgeVector.x * DODGE.speed * portion; f.y += f.dodgeVector.y * DODGE.speed * portion; contain(f);
    if (!f.dodgeTime) { f.recovery = DODGE.recovery; f.recoveryTotal = DODGE.recovery; f.recoverySpeed = .7; }
  }
  if(f.burn>0&&f.burnSource){f.burnTick-=dt;if(f.burnTick<=0){f.burnTick=.5;damage(s,f.burnSource,f,{damage:2,dot:true});effect(s,f.x,f.y-20,1,12,0,.35);}}
  if (!f.stun) tickAction(s, f, dt);
}
function walk(s, f, dx, dy, dt) {
  f.moving = false; if (f.hp <= 0 || f.dodgeTime || f.stun || f.root || s.swaps[f.side]) return;
  let mobility = f.recovery > 0 ? f.recoverySpeed : 1;
  if (f.action) mobility = f.action.slot === 'basic' ? .35 : f.action.move.kind === 'cone' && f.action.phase === 'active' ? .2 : 0;
  if (len(dx, dy) && mobility > 0) { const d = unit(dx, dy), speed = FIGHTERS[f.id].speed * mobility * (f.slow > 0 ? .55 : 1); f.x += d.x * speed * dt; f.y += d.y * speed * dt; if (!f.action) f.facing = Math.atan2(d.y, d.x); f.moving = true; contain(f); }
}
function bot(s, dt) {
  if (!s.aiEnabled) return;
  const f = activeFighter(s, 1), p = activeFighter(s, 0); if (f.hp <= 0 || p.hp <= 0 || s.swaps.some(t => t > 0)) return;
  s.aiRest = Math.max(0, s.aiRest - dt);
  const d = unit(p.x - f.x, p.y - f.y), dist = distance(p, f), melee = FIGHTERS[f.id].basic.kind === 'melee';
  const desired = s.aiRest || f.recovery > 0 ? (melee ? 155 : 340) : (melee ? 64 : 300);
  const toward = dist > desired + 35 ? 1 : dist < desired - 35 ? -.8 : 0;
  walk(s, f, d.x * toward - d.y * Math.sin(s.clock * .8) * .24, d.y * toward + d.x * Math.sin(s.clock * .8) * .24, dt);
  if (!f.action) f.facing = Math.atan2(d.y, d.x);
  // React to visible threats after a human-like delay, with no knowledge of unreleased input.
  const pending = p.action;
  const danger = s.projectiles.some(b => b.source.side === 0 && distance(b, f) < 145 && (f.x - b.x) * b.vx + (f.y - b.y) * b.vy > 0) || (pending?.phase === 'windup' && ['area','leap'].includes(pending.move.kind) && distance(pending.target, f) < pending.move.radius + 20);
  if (danger) {
    if (s.aiDangerSince === null) s.aiDangerSince = s.clock;
    if (s.clock - s.aiDangerSince > .28 && s.aiTurn % 3 !== 0) dodge(s, f, -d.y, d.x);
  } else s.aiDangerSince = null;
  s.aiTimer -= dt; if (s.aiTimer > 0 || s.aiRest || f.action || f.recovery) return;
  s.aiTimer = .5; s.aiTurn++;
  const reserves=s.teams[1].map((p,i)=>({p,i})).filter(({p,i})=>i!==s.active[1]&&p.hp>0);
  if(reserves.length && (f.hp/f.maxHp<.38 || (s.clock>12 && s.aiTurn%7===0 && dist>155))){
    reserves.sort((a,b)=>b.p.hp/b.p.maxHp-a.p.hp/a.p.maxHp);
    if(switchPokemon(s,1,reserves[0].i)){s.aiRest=1.2;return;}
  }
  const slots = s.aiTurn % 3 ? ['basic', 'q', 'r'] : ['q', 'r', 'basic'];
  if (p.recovery > .25) slots.unshift('q');
  if(s.energy[1]>=ENERGY.max) slots.unshift('e');
  for (const slot of slots) {
    const m = FIGHTERS[f.id][slot]; let can = dist <= (m.range || m.radius || 90) + 8;
    if (['melee','combo','barrage','pull'].includes(m.kind)) can = dist < m.range + 6;
    if (m.kind === 'wave' || m.kind === 'quake') can = dist < m.radius - 20;
    if (m.kind === 'heal') can = f.hp < f.maxHp * .6 && dist > 270;
    if (m.kind === 'blink') can = dist < 140;
    if (can && cast(s, f, slot, p)) { s.aiRest = m.windup + (m.duration || 0) + m.recovery + (slot === 'basic' ? .35 : .85); break; }
  }
}
function explode(s, b) {
  const m = b.move; effect(s, b.x, b.y, m.fx, m.explode || b.radius, b.angle, .24);
  if (m.explode) { const target = activeFighter(s, 1 - b.source.side); if (distance(target, b) <= m.explode + target.radius) damage(s, b.source, target, m, b); }
}
function projectiles(s, dt) {
  for (const b of s.projectiles) {
    if (b.move.homing) { const t = activeFighter(s, 1 - b.source.side), wanted = Math.atan2(t.y - b.y, t.x - b.x), diff = Math.atan2(Math.sin(wanted - b.angle), Math.cos(wanted - b.angle)); b.angle += clamp(diff, -b.move.homing * dt, b.move.homing * dt); b.vx = Math.cos(b.angle) * b.move.speed; b.vy = Math.sin(b.angle) * b.move.speed; }
    b.age=(b.age||0)+dt;
    if(b.returnPhase){const wanted=Math.atan2(b.source.y-b.y,b.source.x-b.x);b.angle=wanted;b.vx=Math.cos(wanted)*b.move.speed;b.vy=Math.sin(wanted)*b.move.speed;if(distance(b,b.source)<22){b.life=0;b.resolved=true;continue;}}
    const before = { x: b.x, y: b.y }, travel = Math.min(dt, b.life); b.x += b.vx * travel; b.y += b.vy * travel; b.life -= dt;
    const target = activeFighter(s, 1 - b.source.side);
    if (!b.hitPhase && target.hp > 0 && !s.swaps[target.side] && segmentDistance(target, before, b) <= b.radius + target.radius) {
      if (b.move.explode) explode(s, b); else { damage(s, b.source, target, b.move); effect(s, b.x, b.y, b.move.fx, 16, b.angle); } if(b.move.returning){b.hitPhase=true;}else b.life=0; b.resolved = true;
    }
    if(b.life<=0&&b.move.returning&&!b.returnPhase){b.returnPhase=true;b.hitPhase=false;b.life=b.move.range/b.move.speed*1.5;b.resolved=false;}else if (b.life <= 0 && !b.resolved) explode(s, b);
  }
  s.projectiles = s.projectiles.filter(b => b.life > 0 && b.x > WORLD.left - 30 && b.x < WORLD.right + 30 && b.y > WORLD.top - 30 && b.y < WORLD.bottom + 30);
}
function zones(s, dt) {
  for (const z of s.zones) {
    const m = z.move, t = activeFighter(s, 1 - z.source.side);
    if(z.delay>0){z.delay-=dt;if(z.delay>0)continue;}
    z.life -= dt;
    if (m.kind === 'strike') {
      if(!z.hit){if(distance(z,t)<=m.radius+t.radius)damage(s,z.source,t,m,z);effect(s,z.x,z.y,m.fx,m.radius,0,.5);z.hit=true;}z.life=0;
    } else if (m.kind === 'field') {
      z.pulse -= dt;
      if (distance(z, t) < m.radius + t.radius && t.hp > 0 && !t.invulnerable) t.slow = Math.max(t.slow, .15);
      if (z.pulse <= 0) { z.pulse += m.interval; if (distance(z, t) < m.radius + t.radius) damage(s, z.source, t, m, z); }
    } else if (m.kind === 'wave' || m.kind === 'quake') {
      const previous = z.radius; z.radius += m.speed * dt;
      if (!z.hit && distance(z, t) + t.radius >= previous - 9 && distance(z, t) - t.radius <= z.radius + 9) { damage(s, z.source, t, m, z); z.hit = true; }
    }
  }
  s.zones = s.zones.filter(z => z.life > 0);
}
export function switchPokemon(s,side,index) {
 if(s.phase!=='fighting'||s.paused||s.cinematic?.remaining>0||s.swaps[side]>0||s.switchCooldown[side]>0)return false;
 const current=activeFighter(s,side),next=s.teams[side][index];
 if(!next||index===s.active[side]||next.hp<=0||current.hp<=0||current.action||current.dodgeTime>0||current.stun>0||current.root>0||current.recovery>.22)return false;
 current.action=null;current.attack=0;
 next.x=current.x;next.y=current.y;next.facing=current.facing;next.action=null;next.dodgeTime=0;next.invulnerable=0;
 next.recovery=SWITCH.exposure;next.recoveryTotal=SWITCH.exposure;next.recoverySpeed=.3;
 for(const slot of ['q','r'])next.cds[slot]=Math.max(next.cds[slot],SWITCH.skillLock);
 next.cds.dodge=Math.max(next.cds.dodge,SWITCH.dodgeLock);
 s.active[side]=index;s.switchCooldown[side]=SWITCH.cooldown;s.switchExposure[side]=SWITCH.exposure;s.switchCount[side]++;
 effect(s,current.x,current.y,11,35,0,.5);notice(s,`${side?'CPU':'1P'} · 포켓몬 교체!`);return true;
}
function processKO(s, dt) {
  for (let side = 0; side < 2; side++) {
    const f = activeFighter(s, side); if (f.hp > 0) continue;
    if (!s.swaps[side]) { s.swaps[side] = 1.3; notice(s, `${side ? 'CPU' : '1P'} 포켓몬이 쓰러졌다!`); }
    s.swaps[side] -= dt;
    if (s.swaps[side] <= 0) {
      s.swaps[side] = 0; const next = s.teams[side].findIndex(p => p.hp > 0);
      if (next >= 0) { s.active[side] = next; const p = activeFighter(s, side); p.invulnerable = 1.1; notice(s, `${side ? 'CPU' : '1P'} · 다음 파트너 출전!`); }
    }
  }
  const dead = s.teams.map(team => team.every(p => p.hp <= 0)); if (dead.some(Boolean)) finish(s, dead[0] && dead[1] ? 'draw' : dead[1] ? 0 : 1);
}
function finish(s, winner) { s.phase = 'finished'; s.winner = winner; s.projectiles = []; s.zones = []; }
export function stepBattle(s, input = {}, dt = 1 / 60) {
  if (s.paused || s.phase === 'finished') return;
  dt = clamp(dt, 0, .05); s.clock += dt;
  if(s.cinematic?.remaining>0){s.cinematic.remaining=Math.max(0,s.cinematic.remaining-dt);return;}
  if(s.hitStop>0){s.hitStop=Math.max(0,s.hitStop-dt);return;}
  for (const group of ['effects', 'trails', 'texts']) { s[group].forEach(e => { e.life -= dt; }); s[group] = s[group].filter(e => e.life > 0); }
  s.noticeTime = Math.max(0, s.noticeTime - dt);
  if (s.phase === 'countdown') { s.countdown -= dt; if (s.countdown <= 0) { s.phase = 'fighting'; notice(s, 'BATTLE START!'); } return; }
  s.timeLeft = Math.max(0, s.timeLeft - dt);
  for(let side=0;side<2;side++){gainEnergy(s,side,ENERGY.passive*dt);s.switchCooldown[side]=Math.max(0,s.switchCooldown[side]-dt);s.switchExposure[side]=Math.max(0,s.switchExposure[side]-dt);
    s.teams[side].forEach((f,i)=>{if(i===s.active[side])return;for(const key of Object.keys(f.cds))f.cds[key]=Math.max(0,f.cds[key]-dt);for(const key of ['slow','root','stun','staggerGuard','weaken','empowerTime','counter','burn','markTime','curseTime','recovery'])f[key]=Math.max(0,f[key]-dt);});
  }
  if(Number.isInteger(input.switchIndex)){switchPokemon(s,0,input.switchIndex);input.switchIndex=null;}
  const p = activeFighter(s, 0); let cpu = activeFighter(s, 1);
  for (const f of [p, cpu]) tickFighter(s, f, dt);
  walk(s, p, input.dx || 0, input.dy || 0, dt);
  if (input.aim && !p.action && !p.dodgeTime) p.facing = Math.atan2(input.aim.y - p.y, input.aim.x - p.x);
  if (input.dodge) { dodge(s, p, input.dx || 0, input.dy || 0); input.dodge = false; }
  for (const slot of ['q', 'r', 'e']) if (input[slot]) { cast(s, p, slot, input.aim || cpu); input[slot] = false; }
  if (input.attack) { cast(s, p, 'basic', input.aim || cpu); input.attack = false; }
  if(s.cinematic?.remaining>0)return;
  bot(s, dt); cpu=activeFighter(s,1); if(s.cinematic?.remaining>0)return; projectiles(s, dt); zones(s, dt);
  if (p.hp > 0 && cpu.hp > 0) {
    const d = distance(p, cpu), min = p.radius + cpu.radius;
    if (d < min && !p.action && !cpu.action) { const n = unit(cpu.x - p.x, cpu.y - p.y); p.x -= n.x * (min - d) / 2; p.y -= n.y * (min - d) / 2; cpu.x += n.x * (min - d) / 2; cpu.y += n.y * (min - d) / 2; contain(p); contain(cpu); }
  }
  processKO(s, dt);
  if (!s.timeLeft && s.phase !== 'finished') { const scores = s.teams.map(team => team.reduce((n, f) => n + f.hp / f.maxHp, 0)); finish(s, Math.abs(scores[0] - scores[1]) < .0001 ? 'draw' : scores[0] > scores[1] ? 0 : 1); }
}
