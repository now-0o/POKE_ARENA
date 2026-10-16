import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, activeFighter, cast, dodge, stepBattle } from '../src/combat-engine.js';
import { FIGHTERS, WORLD, DODGE } from '../src/combat-data.js';
function battle(team=['pikachu'],enemy=['snorlax']) { const s=createBattle(team,enemy,{ai:false});s.phase='fighting'; const p=activeFighter(s,0),c=activeFighter(s,1);p.x=600;p.y=450;c.x=680;c.y=450;return s; }
function advance(s,seconds,input={}){for(let i=0;i<Math.ceil(seconds*60);i++)stepBattle(s,input,1/60);}
test('movement is normalized and contained, viewport-sized world has room to disengage',()=>{
 const a=battle(),b=battle();const x=activeFighter(a,0).x;advance(a,.1,{dx:-1});advance(b,.1,{dx:-1,dy:1});
 assert(Math.abs(activeFighter(a,0).x-x)-Math.hypot(activeFighter(b,0).x-x,activeFighter(b,0).y-450)<.001);
 advance(a,12,{dx:-1,dy:-1});const p=activeFighter(a,0);assert(p.x>=WORLD.left+p.radius&&p.y>=WORLD.top+p.radius);
 a.paused=true;const time=a.clock;advance(a,1);assert.equal(a.clock,time);assert(WORLD.right-WORLD.left>1300);
});
test('skills have windup, cannot be stacked, lock aim and leave a punishable recovery',()=>{
 const s=battle(['venusaur']),p=activeFighter(s,0),c=activeFighter(s,1);c.x=1000;
 assert(cast(s,p,'q',c));assert(!cast(s,p,'r',c));assert(!cast(s,p,'basic',c));assert(!dodge(s,p,1,0));
 advance(s,.5,{aim:{x:600,y:600},dx:1});assert.equal(p.x,600);assert.equal(p.action.angle,0);assert.equal(c.hp,c.maxHp);
 advance(s,.65);assert(c.hp<c.maxHp);assert(p.recovery>0);assert(!cast(s,p,'r',c));
 const hp=p.hp;c.cds.basic=0;c.x=p.x+60;assert(cast(s,c,'basic',p));advance(s,.3);assert(p.hp<hp-FIGHTERS.snorlax.basic.damage,'recovery takes +20% punish damage');assert.equal(s.stats.punishes[1],1);
});
test('basic attack is one click, has startup, and can be cancelled by dodge',()=>{
 const s=battle(),p=activeFighter(s,0),c=activeFighter(s,1),input={attack:true,aim:c};stepBattle(s,input);assert(p.action);assert(!input.attack);assert.equal(s.projectiles.length,0);advance(s,.12);assert.equal(c.hp,c.maxHp);
 assert(dodge(s,p,-1,0));advance(s,.3);assert.equal(s.projectiles.length,0);assert.equal(c.hp,c.maxHp);assert(s.trails.length>0);assert(!dodge(s,p,1,0));advance(s,DODGE.cooldown);assert(dodge(s,p,1,0));
});
test('telegraphed Thunder can be sidestepped; correct dodge timing gives a counter',()=>{
 const s=battle(['pikachu'],['pikachu']),p=activeFighter(s,0),c=activeFighter(s,1);cast(s,c,'r',p);advance(s,.1);const hp=p.hp;advance(s,.85,{dy:1});assert.equal(p.hp,hp,'walking out of marker avoids thunder');
 const a=battle(['pikachu'],['pikachu']),ap=activeFighter(a,0),ac=activeFighter(a,1);cast(a,ac,'r',ap);advance(a,.9);assert(dodge(a,ap,1,0));advance(a,.15);assert.equal(ap.hp,ap.maxHp);assert.equal(a.stats.dodges[0],1);assert(ap.counter>0);
});
test('Flamethrower is a fixed cone; Solar Beam is a long narrow charged line',()=>{
 const a=battle(['charizard']),p=activeFighter(a,0),c=activeFighter(a,1);c.x=p.x+160;cast(a,p,'q',c);advance(a,.45);const hp=c.hp;assert(hp<c.maxHp);c.y+=160;advance(a,.75);assert(c.hp<hp,'burn persists after leaving the cone');advance(a,1.5);const afterBurn=c.hp;advance(a,1);assert.equal(c.hp,afterBurn,'burn expires');
 const b=battle(['venusaur']),bp=activeFighter(b,0),bc=activeFighter(b,1);bc.x=bp.x+600;cast(b,bp,'q',bc);advance(b,.8);assert.equal(bc.hp,bc.maxHp);advance(b,.35);assert(bc.hp<bc.maxHp);
 const miss=battle(['venusaur']),mp=activeFighter(miss,0),mc=activeFighter(miss,1);mc.x=mp.x+500;cast(miss,mp,'q',mc);mc.y+=60;advance(miss,1.2);assert.equal(mc.hp,mc.maxHp);
});
test('Whirlpool persists and slows, Earthquake is a passing ring with a safe interior',()=>{
 const s=battle(['blastoise']),p=activeFighter(s,0),c=activeFighter(s,1);cast(s,p,'r',c);advance(s,.7);assert.equal(s.zones.length,1);const hp=c.hp;advance(s,1.3);assert(c.hp<hp);assert(c.slow>0);c.y+=150;const out=c.hp;advance(s,.8);assert.equal(c.hp,out);
 const a=battle(['garchomp']),ap=activeFighter(a,0),ac=activeFighter(a,1);ac.x=ap.x+180;cast(a,ap,'r',ac);advance(a,.82);assert.equal(ac.hp,ac.maxHp,'outer ring has not arrived');ac.x=ap.x+20;advance(a,.5);assert.equal(ac.hp,ac.maxHp,'already-passed interior is safe');
 const b=battle(['garchomp']),bp=activeFighter(b,0),bc=activeFighter(b,1);bc.x=bp.x+180;cast(b,bp,'r',bc);advance(b,1.3);assert(bc.hp<bc.maxHp);
});
test('Vine Whip pulls, Shadow Double repositions without damage, Rest can be interrupted',()=>{
 const s=battle(['venusaur']),p=activeFighter(s,0),c=activeFighter(s,1);c.x=p.x+170;cast(s,p,'r',c);advance(s,.4);assert(c.x<770);assert(c.root>0);
 const b=battle(['gengar']),bp=activeFighter(b,0),bc=activeFighter(b,1),x=bp.x;cast(b,bp,'r',{x:900,y:450});advance(b,.2);assert(bp.x>x+150);assert.equal(bc.hp,bc.maxHp);assert(bp.empowerTime>0);
 const a=battle(['snorlax'],['pikachu']),ap=activeFighter(a,0),ac=activeFighter(a,1);ap.hp=200;cast(a,ap,'r',ap);cast(a,ac,'basic',ap);advance(a,2);assert(ap.hp<200);assert.equal(ap.action,null);
 const r=battle(['snorlax']),rp=activeFighter(r,0);rp.hp=200;cast(r,rp,'r',rp);advance(r,1.8);assert.equal(rp.hp,288);
});
test('rushes have different startup, distance and recovery; leap advertises its landing',()=>{
 for(const id of ['lucario','garchomp','snorlax']){
  const s=battle([id]),p=activeFighter(s,0),c=activeFighter(s,1);c.x=800;const slot=id==='lucario'?'r':'q',m=FIGHTERS[id][slot],x=p.x;cast(s,p,slot,c);advance(s,m.windup-.03);assert.equal(p.x,x);advance(s,(m.duration||.5)+.1);assert(p.x>x+150);assert(c.hp<c.maxHp);assert(p.recovery>0);
 }
});
test('all ten fighters finish an exchange with finite state, cooldowns, and no overlapping casts',()=>{
 for(const id of Object.keys(FIGHTERS))for(const slot of ['basic','q','r']){
  const s=battle([id]),p=activeFighter(s,0),c=activeFighter(s,1);p.hp=p.maxHp-90;assert(cast(s,p,slot,c));assert(!cast(s,p,slot,c));advance(s,3);
  assert(p.cds[slot]>=0);assert.equal(p.action,null);assert(Number.isFinite(p.x+p.y+p.hp+c.hp));
 }
});
test('KO switches team; simultaneous KO draws; bot has deliberate pauses and match ends',()=>{
 const s=battle(['pikachu'],['snorlax','gengar']);activeFighter(s,1).hp=0;advance(s,1.4);assert.equal(activeFighter(s,1).id,'gengar');activeFighter(s,1).hp=0;stepBattle(s);assert.equal(s.winner,0);
 const d=battle();activeFighter(d,0).hp=0;activeFighter(d,1).hp=0;stepBattle(d);assert.equal(d.winner,'draw');
 const match=createBattle(['pikachu','gengar','lucario'],['charizard','blastoise','garchomp']);advance(match,184);assert.equal(match.phase,'finished');assert.equal(match.winner,1);assert(match.stats.hits[1]>0);
 const reset=createBattle(['pikachu'],['snorlax']);assert.equal(reset.teams[0][0].hp,FIGHTERS.pikachu.hp);assert.equal(reset.projectiles.length,0);
});
