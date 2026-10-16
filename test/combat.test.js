import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, activeFighter, cast, dodge, stepBattle } from '../src/combat-engine.js';
import { FIGHTERS, WORLD } from '../src/combat-data.js';
function battle(team = ['pikachu'], bot = ['snorlax']) {
  const s = createBattle(team, bot); s.phase = 'fighting'; s.aiTimer = 1e6;
  const p = activeFighter(s, 0), c = activeFighter(s, 1); p.x = 400; c.x = 475; p.y = c.y = 280;
  c.cds = { basic: 1e6, q: 1e6, e: 1e6, dodge: 1e6 }; return s;
}
function advance(s, seconds, input = {}) { for (let i = 0; i < Math.ceil(seconds * 60); i++) stepBattle(s, input, 1 / 60); }
test('normalized movement, arena boundaries, pause and countdown', () => {
  const a = battle(), b = battle(); const x = activeFighter(a, 0).x;
  advance(a, .1, { dx: 1 }); advance(b, .1, { dx: 1, dy: 1 });
  assert(Math.abs((activeFighter(a,0).x-x) - Math.hypot(activeFighter(b,0).x-x,activeFighter(b,0).y-280)) < .001);
  advance(a, 10, { dx: -1, dy: -1 }); const p = activeFighter(a,0); assert(p.x >= WORLD.left+p.radius && p.y >= WORLD.top+p.radius);
  a.paused = true; const t = a.clock; advance(a,1,{dx:1}); assert.equal(a.clock,t);
  const s = createBattle(['pikachu'],['snorlax']); assert.equal(cast(s,activeFighter(s,0),'q',{x:500,y:280}),false); advance(s,2.7); assert.equal(s.phase,'fighting');
});
test('dodge travels a short distance, leaves ghosts, grants immunity and respects cooldown', () => {
  const s=battle(), p=activeFighter(s,0), c=activeFighter(s,1), x=p.x;
  assert(dodge(s,p,-1,0)); assert(!dodge(s,p,-1,0));
  c.cds.basic=0; assert(cast(s,c,'basic',p)); assert.equal(p.hp,p.maxHp,'dodge blocks melee damage');
  advance(s,.16); assert(Math.abs((x-p.x)-124.8)<.01); assert(s.trails.length>0); assert(p.invulnerable>0);
  advance(s,.15); assert.equal(p.invulnerable,0); assert(!dodge(s,p,1,0)); advance(s,1.4); assert(dodge(s,p,1,0));
});
test('every fighter has distinct usable Q/E and damage resolves with cooldown', () => {
  for(const id of Object.keys(FIGHTERS)) for(const slot of ['basic','q','e']) {
    const s=battle([id]), p=activeFighter(s,0), c=activeFighter(s,1), m=FIGHTERS[id][slot]; c.sleeping=1000; p.hp=Math.max(1,p.maxHp-100);
    assert(cast(s,p,slot,c),`${id} ${slot} casts`); assert(!cast(s,p,slot,c),`${id} ${slot} cooldown`);
    if(m.kind==='heal') { const hp=p.hp; advance(s,1.4); assert(p.hp>hp,'Rest heals'); }
    else { advance(s,Math.max(.4,(m.delay||0)+.15)); assert(c.hp<c.maxHp,`${id} ${m.name} must hit`); }
  }
});
test('damage interrupts Rest, projectiles cannot tunnel, dodge blocks delayed area', () => {
  const s=battle(['snorlax'],['pikachu']),p=activeFighter(s,0),c=activeFighter(s,1); p.hp=200;
  cast(s,p,'e',c); c.cds.q=0; cast(s,c,'q',p); advance(s,1.5); assert(p.hp<200,'interrupted heal never resolves');
  const b=battle(); const bp=activeFighter(b,0),bc=activeFighter(b,1); bc.x=bp.x+42; cast(b,bp,'basic',bc); advance(b,.05); assert(bc.hp<bc.maxHp);
  const a=battle(['pikachu'],['charizard']),ap=activeFighter(a,0),ac=activeFighter(a,1); ac.cds.e=0; cast(a,ac,'e',ap); advance(a,.65); const hp=ap.hp; dodge(a,ap,0,0); advance(a,.17); assert.equal(ap.hp,hp);
});
test('KO swaps to the next partner and final KO ends combat once', () => {
  const s=battle(['pikachu','lucario'],['snorlax','gengar']); activeFighter(s,1).hp=0; advance(s,1.4); assert.equal(activeFighter(s,1).id,'gengar'); assert(activeFighter(s,1).invulnerable>0);
  activeFighter(s,1).hp=0; stepBattle(s); assert.equal(s.phase,'finished'); assert.equal(s.winner,0); const time=s.clock; advance(s,3); assert.equal(s.clock,time);
  const draw=battle(); activeFighter(draw,0).hp=0; activeFighter(draw,1).hp=0; stepBattle(draw); assert.equal(draw.winner,'draw');
});
test('time limit compares remaining team HP and bot can finish a real match', () => {
  const s=battle(); s.timeLeft=.001; activeFighter(s,1).hp=10; stepBattle(s); assert.equal(s.winner,0);
  const match=createBattle(['pikachu','gengar','lucario'],['charizard','blastoise','garchomp']);
  advance(match,184); assert.equal(match.phase,'finished'); assert.equal(match.winner,1);
  for(const team of match.teams) for(const f of team) assert(Number.isFinite(f.x+f.y+f.hp));
});
