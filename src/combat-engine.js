import { FIGHTERS, WORLD, DODGE } from './combat-data.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const length = (x, y) => Math.hypot(x, y);
const unit = (x, y) => { const d = length(x, y); return d ? { x: x / d, y: y / d } : { x: 1, y: 0 }; };
const distance = (a, b) => length(a.x - b.x, a.y - b.y);
function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return length(p.x - a.x - dx * t, p.y - a.y - dy * t);
}
function fighter(id, side, index) {
  if (!FIGHTERS[id]) throw new Error(`Unknown fighter: ${id}`);
  return { id, side, index, hp: FIGHTERS[id].hp, maxHp: FIGHTERS[id].hp, x: side ? 735 : 225, y: 288, facing: side ? Math.PI : 0, radius: 19, cds: { basic: 0, q: 0, e: 0, dodge: 0 }, invulnerable: 0, dash: 0, dashVector: { x: 0, y: 0 }, dashAttack: null, attack: 0, attackTime: 0, hit: 0, slow: 0, sleeping: 0, restToken: 0, moving: false };
}
export function createBattle(team, botTeam) {
  if (!team?.length || !botTeam?.length) throw new Error('Both teams are required');
  return { teams: [team.map((id, i) => fighter(id, 0, i)), botTeam.map((id, i) => fighter(id, 1, i))], active: [0, 0], clock: 0, timeLeft: 180, countdown: 2.6, phase: 'countdown', winner: null, projectiles: [], zones: [], effects: [], trails: [], texts: [], swaps: [0, 0], paused: false, aiTimer: .8, aiTurn: 0, notice: '', noticeTime: 0, shake: 0 };
}
export const activeFighter = (state, side) => state.teams[side][state.active[side]];
function contain(f) { f.x = clamp(f.x, WORLD.left + f.radius, WORLD.right - f.radius); f.y = clamp(f.y, WORLD.top + f.radius, WORLD.bottom - f.radius); }
function text(state, f, value, color) { state.texts.push({ x: f.x, y: f.y - 40, value, color, life: .85, maxLife: .85 }); }
function effect(state, x, y, fx, radius = 40, angle = 0, life = .38) { state.effects.push({ x, y, fx, radius, angle, life, maxLife: life }); }
function damage(state, source, target, move) {
  if (target.hp <= 0 || target.invulnerable > 0 || state.swaps[target.side] > 0) return false;
  target.hp = Math.max(0, target.hp - move.damage); target.hit = .14;
  target.sleeping = 0; target.restToken++; target.slow = Math.max(target.slow, move.slow || 0);
  if (move.knockback) { const d = unit(target.x - source.x, target.y - source.y); target.x += d.x * move.knockback; target.y += d.y * move.knockback; contain(target); }
  effect(state, target.x, target.y - 12, 11, 44); text(state, target, `-${move.damage}`, target.side ? '#fff2c2' : '#ffb6b6');
  state.shake = Math.max(state.shake, move.damage >= 35 ? .11 : .04);
  return true;
}
function setNotice(state, value) { state.notice = value; state.noticeTime = 1.35; }
export function dodge(state, f, dx, dy) {
  if (state.phase !== 'fighting' || state.paused || f.hp <= 0 || f.cds.dodge > 0 || f.dash > 0 || f.sleeping > 0 || state.swaps[f.side] > 0) return false;
  const direction = length(dx, dy) ? unit(dx, dy) : { x: Math.cos(f.facing), y: Math.sin(f.facing) };
  f.dashVector = direction; f.dash = DODGE.duration; f.invulnerable = DODGE.invulnerability; f.cds.dodge = DODGE.cooldown; f.dashAttack = null;
  return true;
}
export function cast(state, f, slot, aim) {
  if (state.phase !== 'fighting' || state.paused || f.hp <= 0 || f.cds[slot] > 0 || f.sleeping > 0 || f.dash > 0 || state.swaps[f.side] > 0) return false;
  const m = FIGHTERS[f.id][slot]; if (!m) return false;
  const d = unit(aim.x - f.x, aim.y - f.y); const angle = Math.atan2(d.y, d.x);
  f.facing = angle; f.cds[slot] = m.cooldown; f.attack = .32; f.attackTime = state.clock;
  const target = activeFighter(state, 1 - f.side);
  if (slot !== 'basic') { setNotice(state, `${f.side ? 'CPU' : '1P'} · ${m.name}`); text(state, f, m.name, FIGHTERS[f.id].color); }
  if (m.kind === 'projectile') {
    state.projectiles.push({ x: f.x + d.x * 24, y: f.y + d.y * 24, vx: d.x * m.speed, vy: d.y * m.speed, life: m.range / m.speed, source: f, move: m, angle, radius: m.radius || 13 });
  } else if (m.kind === 'area' || m.kind === 'beam') {
    const dist = Math.min(distance(f, aim), m.range);
    const x = m.kind === 'beam' ? f.x : f.x + d.x * dist;
    const y = m.kind === 'beam' ? f.y : f.y + d.y * dist;
    state.zones.push({ x, y, endX: f.x + d.x * m.range, endY: f.y + d.y * m.range, source: f, move: m, angle, remaining: m.delay || .16, total: m.delay || .16 });
  } else if (m.kind === 'melee') {
    const end = { x: f.x + d.x * m.range, y: f.y + d.y * m.range };
    effect(state, f.x + d.x * 53, f.y + d.y * 53 - 10, m.fx, 60, angle);
    if (segmentDistance(target, f, end) <= (m.radius || 30) + target.radius) damage(state, f, target, m);
  } else if (m.kind === 'dash') {
    f.dash = .23; f.dashVector = d; f.dashAttack = { move: m, speed: m.range / .23, hit: false };
    effect(state, f.x, f.y, m.fx, 65, angle);
  } else if (m.kind === 'heal') {
    f.sleeping = m.delay; f.restToken++; state.zones.push({ x: f.x, y: f.y, source: f, restToken: f.restToken, move: m, remaining: m.delay, total: m.delay });
  }
  return true;
}
function tickFighter(state, f, dt) {
  for (const key of Object.keys(f.cds)) f.cds[key] = Math.max(0, f.cds[key] - dt);
  for (const key of ['invulnerable', 'attack', 'hit', 'slow', 'sleeping']) f[key] = Math.max(0, f[key] - dt);
  if (f.dash > 0 && f.hp > 0) {
    const portion = Math.min(dt, f.dash); f.dash -= portion;
    state.trails.push({ id: f.id, x: f.x, y: f.y, facing: f.facing, life: .22, maxLife: .22, side: f.side });
    const before = { x: f.x, y: f.y };
    const speed = f.dashAttack?.speed || DODGE.speed;
    f.x += f.dashVector.x * speed * portion; f.y += f.dashVector.y * speed * portion; contain(f);
    if (f.dashAttack && !f.dashAttack.hit) {
      const target = activeFighter(state, 1 - f.side);
      if (segmentDistance(target, before, f) <= f.dashAttack.move.radius + target.radius) f.dashAttack.hit = damage(state, f, target, f.dashAttack.move);
    }
    if (f.dash <= .000001) { f.dash = 0; f.dashAttack = null; }
  }
}
function walk(state, f, dx, dy, dt) {
  f.moving = false;
  if (f.hp <= 0 || f.dash > 0 || f.sleeping > 0 || state.swaps[f.side] > 0) return;
  if (length(dx, dy)) {
    const d = unit(dx, dy), speed = FIGHTERS[f.id].speed * (f.slow > 0 ? .55 : 1);
    f.x += d.x * speed * dt; f.y += d.y * speed * dt; f.facing = Math.atan2(d.y, d.x); f.moving = true; contain(f);
  }
}
function bot(state, dt) {
  const f = activeFighter(state, 1), p = activeFighter(state, 0);
  if (f.hp <= 0 || p.hp <= 0 || state.swaps.some(t => t > 0)) return;
  const d = unit(p.x - f.x, p.y - f.y), dist = distance(p, f);
  const basic = FIGHTERS[f.id].basic, desired = basic.kind === 'melee' ? 67 : 245;
  let toward = dist > desired + 35 ? 1 : dist < desired - 55 ? -.65 : 0;
  const strafe = Math.sin(state.clock * 1.4 + f.index) * .5;
  walk(state, f, d.x * toward - d.y * strafe, d.y * toward + d.x * strafe, dt);
  f.facing = Math.atan2(d.y, d.x);
  // Read telegraphs and nearby projectiles; cooldown and cadence keep the bot beatable.
  const danger = state.projectiles.some(b => b.source.side === 0 && distance(b, f) < 95) || state.zones.some(z => z.source.side === 0 && z.remaining < .25 && distance(z, f) < (z.move.radius || 30) + 35);
  if (danger && Math.sin(state.clock * 8) > .35) dodge(state, f, -d.y, d.x);
  state.aiTimer -= dt;
  if (state.aiTimer <= 0) {
    state.aiTimer = .38; state.aiTurn++;
    const predicted = { x: p.x, y: p.y };
    let acted = false;
    for (const slot of state.aiTurn % 2 ? ['q', 'e'] : ['e', 'q']) {
      const m = FIGHTERS[f.id][slot];
      if (m.kind === 'heal' ? f.hp < f.maxHp * .65 : dist < (m.range || m.radius || 100) + 35) acted = cast(state, f, slot, predicted);
      if (acted) break;
    }
    if (!acted && dist <= basic.range + 15) cast(state, f, 'basic', predicted);
  }
}
function processKO(state, dt) {
  for (let side = 0; side < 2; side++) {
    const f = activeFighter(state, side);
    if (f.hp > 0) continue;
    if (!state.swaps[side]) { state.swaps[side] = 1.25; setNotice(state, `${side ? 'CPU' : '1P'} 포켓몬이 쓰러졌다!`); }
    state.swaps[side] -= dt;
    if (state.swaps[side] <= 0) {
      state.swaps[side] = 0;
      const next = state.teams[side].findIndex(p => p.hp > 0);
      if (next >= 0) { state.active[side] = next; const p = activeFighter(state, side); p.invulnerable = 1; setNotice(state, `${side ? 'CPU' : '1P'} · 다음 파트너 출전!`); }
    }
  }
  const dead = state.teams.map(team => team.every(p => p.hp <= 0));
  if (dead.some(Boolean)) finish(state, dead[0] && dead[1] ? 'draw' : dead[1] ? 0 : 1);
}
function finish(state, winner) { state.phase = 'finished'; state.winner = winner; state.projectiles = []; state.zones = []; }
export function stepBattle(state, input = {}, dt = 1 / 60) {
  if (state.paused || state.phase === 'finished') return;
  dt = clamp(dt, 0, .05); state.clock += dt;
  for (const group of ['effects', 'trails', 'texts']) { state[group].forEach(e => { e.life -= dt; }); state[group] = state[group].filter(e => e.life > 0); }
  state.shake = Math.max(0, state.shake - dt); state.noticeTime = Math.max(0, state.noticeTime - dt);
  if (state.phase === 'countdown') { state.countdown -= dt; if (state.countdown <= 0) { state.phase = 'fighting'; setNotice(state, 'BATTLE START!'); } return; }
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  const p = activeFighter(state, 0), cpu = activeFighter(state, 1);
  for (const f of [p, cpu]) tickFighter(state, f, dt);
  walk(state, p, input.dx || 0, input.dy || 0, dt);
  if (input.aim) p.facing = Math.atan2(input.aim.y - p.y, input.aim.x - p.x);
  if (input.dodge) { dodge(state, p, input.dx || 0, input.dy || 0); input.dodge = false; }
  for (const slot of ['q', 'e']) if (input[slot]) { cast(state, p, slot, input.aim || cpu); input[slot] = false; }
  if (input.attack) cast(state, p, 'basic', input.aim || cpu);
  bot(state, dt);
  for (const b of state.projectiles) {
    const before = { x: b.x, y: b.y }; const travel = Math.min(dt, b.life);
    b.x += b.vx * travel; b.y += b.vy * travel; b.life -= dt;
    const target = activeFighter(state, 1 - b.source.side);
    if (segmentDistance(target, before, b) <= b.radius + target.radius && target.hp > 0 && !state.swaps[target.side]) {
      damage(state, b.source, target, b.move); effect(state, b.x, b.y, b.move.fx, 54, b.angle); b.life = 0;
    }
  }
  state.projectiles = state.projectiles.filter(b => b.life > 0 && b.x > 20 && b.x < 940 && b.y > 45 && b.y < 520);
  for (const z of state.zones) {
    z.remaining -= dt;
    if (z.remaining > 0) continue;
    const m = z.move, target = activeFighter(state, 1 - z.source.side);
    if (m.kind === 'heal') {
      // Damage interrupts Rest; interrupted heals never resolve.
      if (z.source.hp > 0 && z.restToken === z.source.restToken) {
        const healed = Math.min(m.heal, z.source.maxHp - z.source.hp); z.source.hp += healed; text(state, z.source, `+${healed}`, '#a5ffb4'); effect(state, z.source.x, z.source.y, 15, 65);
      }
    } else {
      const hit = m.kind === 'beam' ? segmentDistance(target, z, { x: z.endX, y: z.endY }) <= m.radius + target.radius : distance(z, target) <= m.radius + target.radius;
      if (hit) damage(state, z.source, target, m);
      if (m.kind === 'beam') {
        const range = length(z.endX - z.x, z.endY - z.y);
        for (let d = 26; d < range; d += 31) effect(state, z.x + Math.cos(z.angle) * d, z.y + Math.sin(z.angle) * d, m.fx, m.radius * 1.5, z.angle, .32);
      } else effect(state, z.x, z.y, m.fx, m.radius * 1.3, 0, .5);
    }
  }
  state.zones = state.zones.filter(z => z.remaining > 0);
  // Separate combatants without pushing through the arena boundary.
  if (p.hp > 0 && cpu.hp > 0 && !p.dash && !cpu.dash) {
    const d = distance(p, cpu), min = p.radius + cpu.radius;
    if (d < min) { const n = unit(cpu.x - p.x, cpu.y - p.y); p.x -= n.x * (min - d) / 2; p.y -= n.y * (min - d) / 2; cpu.x += n.x * (min - d) / 2; cpu.y += n.y * (min - d) / 2; contain(p); contain(cpu); }
  }
  processKO(state, dt);
  if (!state.timeLeft && state.phase !== 'finished') {
    const scores = state.teams.map(team => team.reduce((n, f) => n + f.hp / f.maxHp, 0));
    finish(state, Math.abs(scores[0] - scores[1]) < .0001 ? 'draw' : scores[0] > scores[1] ? 0 : 1);
  }
}
