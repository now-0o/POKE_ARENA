import test from 'node:test';import assert from 'node:assert/strict';
import {createBattle,activeFighter,cast,stepBattle,switchPokemon} from '../src/combat-engine.js';import {SWITCH,FIGHTERS} from '../src/combat-data.js';import {updateCamera} from '../src/combat-camera.js';
const advance=(s,t)=>{for(let i=0;i<Math.ceil(t*60);i++)stepBattle(s,{});};
const setup=()=>{const s=createBattle(['pikachu','lucario','gengar'],['charizard','blastoise','garchomp'],{ai:false});s.phase='fighting';return s;};
test('voluntary switch preserves team health, position and energy, with a shared cooldown',()=>{
 const s=setup(),old=activeFighter(s,0);old.hp=90;old.x=650;old.y=430;s.teams[0][1].hp=123;s.energy[0]=65;
 assert(switchPokemon(s,0,1));const next=activeFighter(s,0);assert.equal(next.id,'lucario');assert.equal(next.hp,123);assert.equal(s.teams[0][0].hp,90);assert.equal(next.x,650);assert.equal(next.y,430);assert.equal(s.energy[0],65);
 assert.equal(s.switchCooldown[0],SWITCH.cooldown);assert(next.recovery>=.9);assert.equal(next.invulnerable,0);assert(next.cds.q>=2&&next.cds.r>=2&&next.cds.dodge>=1.2);assert(!switchPokemon(s,0,2));
 advance(s,14.1);assert(switchPokemon(s,0,0));assert.equal(activeFighter(s,0).hp,90,'returning does not heal');
});
test('cannot switch to a fainted or active partner, or cancel committed attacks and stun',()=>{
 const s=setup(),p=activeFighter(s,0),cpu=activeFighter(s,1);s.teams[0][1].hp=0;assert(!switchPokemon(s,0,1));assert(!switchPokemon(s,0,0));assert(!switchPokemon(s,0,8));
 cast(s,p,'q',cpu);assert(!switchPokemon(s,0,2));p.action=null;p.stun=.3;assert(!switchPokemon(s,0,2));p.stun=0;p.root=.3;assert(!switchPokemon(s,0,2));p.root=0;s.paused=true;assert(!switchPokemon(s,0,2));
});
test('incoming partner is exposed and takes punish damage; no invulnerability exploit',()=>{
 const s=setup(),cpu=activeFighter(s,1);const p=activeFighter(s,0);p.x=650;cpu.x=710;cpu.y=p.y=450;
 assert(switchPokemon(s,0,1));const next=activeFighter(s,0),hp=next.hp;cast(s,cpu,'basic',next);advance(s,.4);assert(hp-next.hp>FIGHTERS.charizard.basic.damage);assert(s.stats.punishes[1]>0);
});
test('bench cooldowns pass, forced KO replacement still works during switch cooldown',()=>{
 const s=setup(),p=activeFighter(s,0);p.cds.q=5;switchPokemon(s,0,1);advance(s,2);assert(p.cds.q<3.1);activeFighter(s,0).hp=0;advance(s,1.4);assert.equal(activeFighter(s,0).id,'pikachu');assert(s.switchCooldown[0]>0);
});
test('bot voluntarily rotates when hurt and at deliberate tactical intervals',()=>{
 const s=setup();s.aiEnabled=true;s.aiTimer=0;activeFighter(s,1).hp=70;stepBattle(s);assert.equal(activeFighter(s,1).id,'blastoise');assert.equal(s.switchCount[1],1);assert.equal(activeFighter(s,1).invulnerable,0);
 const b=setup();b.aiEnabled=true;b.clock=13;b.aiTimer=0;b.aiTurn=6;stepBattle(b);assert.equal(b.switchCount[1],1);advance(b,5);assert.equal(b.switchCount[1],1,'bot respects shared cooldown');
});
test('stable camera caps magnification and fixed mode stops following',()=>{
 const s=setup();activeFighter(s,0).x=700;activeFighter(s,1).x=800;for(let i=0;i<900;i++)updateCamera(s,1/60);assert(s.camera.zoom<=1.22);const before=s.camera.zoom;activeFighter(s,0).x+=20;updateCamera(s,1/60);assert(Math.abs(s.camera.zoom-before)<.002);
 s.camera.mode='fixed';updateCamera(s,1/60);assert.deepEqual([s.camera.x,s.camera.y,s.camera.zoom],[800,450,1]);
});
