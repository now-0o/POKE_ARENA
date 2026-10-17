import test from 'node:test';import assert from 'node:assert/strict';
import {createBattle,activeFighter,cast,stepBattle,gainEnergy} from '../src/combat-engine.js';
import {FIGHTERS,ENERGY} from '../src/combat-data.js';
import {updateCamera,cameraTransform,screenToWorld} from '../src/combat-camera.js';
import {fxFrame,FX_MAP} from '../src/combat-fx.js';
const advance=(s,sec,input={})=>{for(let i=0;i<Math.ceil(sec*60);i++)stepBattle(s,input,1/60);};
const setup=(id='pikachu')=>{const s=createBattle([id],['snorlax'],{ai:false});s.phase='fighting';const p=activeFighter(s,0),c=activeFighter(s,1);p.x=650;c.x=750;p.y=c.y=450;return s;};
test('camera eases toward close fighters and zooms back out without jumping',()=>{
 const s=setup(),c=s.camera;updateCamera(s,1/60);assert(c.zoom>1&&c.zoom<1.1);for(let i=0;i<240;i++)updateCamera(s,1/60);assert(c.zoom>1.19&&c.zoom<=1.22);
 activeFighter(s,0).x=160;activeFighter(s,1).x=1440;const old=c.zoom;updateCamera(s,1/60);assert(c.zoom<old&&c.zoom>1);for(let i=0;i<180;i++)updateCamera(s,1/60);assert(c.zoom<1.016);
 s.paused=true;const zoom=c.zoom;updateCamera(s,.1);assert.equal(c.zoom,zoom);s.paused=false;updateCamera(s,.1,true);assert.equal(c.zoom,1);
});
test('aim inverse stays correct at different camera zooms and viewport sizes',()=>{
 for(const [w,h]of [[1920,1080],[1366,768],[2560,1080],[390,844]])for(const zoom of [1,1.3,1.85]){
 const camera={x:850,y:430,zoom},v=cameraTransform(w,h,camera),world={x:927,y:487};const point=screenToWorld(world.x*v.scale+v.x,world.y*v.scale+v.y,w,h,camera);assert(Math.abs(point.x-world.x)<.00001&&Math.abs(point.y-world.y)<.00001);
 }
});
test('energy is earned from contact, passively, is capped, and E consumes it once',()=>{
 const s=setup(),p=activeFighter(s,0),c=activeFighter(s,1);assert(!cast(s,p,'e',c));assert.equal(s.energy[0],0);
 cast(s,p,'q',c);advance(s,.7);assert(s.energy[0]>5);assert(s.energy[1]>2);gainEnergy(s,0,1000);assert.equal(s.energy[0],ENERGY.max);advance(s,.3);
 assert(cast(s,p,'e',c));assert.equal(s.energy[0],0);assert(s.cinematic.remaining>0);assert(!cast(s,p,'e',c));const hp=c.hp;advance(s,.3);assert.equal(c.hp,hp,'cut-in freezes battle');
});
test('every ultimate resolves a distinct attack and resets on a new match',()=>{
 const patterns=new Set();for(const id of Object.keys(FIGHTERS)){
 const s=setup(id),p=activeFighter(s,0),c=activeFighter(s,1);s.energy[0]=100;patterns.add(FIGHTERS[id].e.kind);assert(cast(s,p,'e',c),id);advance(s,5);assert(c.hp<c.maxHp,`${id} ultimate hits a stationary target`);assert(!p.action,`${id} ultimate ends`);assert(s.energy[0]<ENERGY.max);assert(Number.isFinite(p.x+p.y+c.hp));
 }assert(patterns.size>=8);assert.deepEqual(createBattle(['pikachu'],['snorlax']).energy,[0,0]);
});
test('Future Sight announces a delayed strike that movement can avoid',()=>{
 const s=setup('gardevoir'),p=activeFighter(s,0),c=activeFighter(s,1);s.energy[0]=100;cast(s,p,'e',c);advance(s,1);assert(s.zones.some(z=>z.delay>0));c.y+=160;advance(s,1.6);assert.equal(c.hp,c.maxHp);
});
test('Aura Sphere mark and Extreme Speed detonation create a real combo',()=>{
 const s=setup('lucario'),p=activeFighter(s,0),c=activeFighter(s,1);cast(s,p,'q',c);advance(s,.8);assert(c.markTime>0);const hp=c.hp;cast(s,p,'r',c);advance(s,.5);assert.equal(c.markTime,0);assert(hp-c.hp>=FIGHTERS.lucario.r.damage+22);
});
test('Razor Leaf hits outbound and on the independently moving return path',()=>{
 const s=setup('venusaur'),p=activeFighter(s,0),c=activeFighter(s,1);c.x=820;cast(s,p,'basic',c);advance(s,.8);const hp=c.hp;assert(hp<c.maxHp);advance(s,1.2);assert(c.hp<hp,'return hit is separate from outward contact');
});
test('sprite playback advances six source frames and maps all sixteen effect families',()=>{
 assert.equal(Object.keys(FX_MAP).length,16);assert.deepEqual([0,.1,.2,.3,.4,.49].map(t=>fxFrame(t,.5,false)),[0,1,2,3,4,5]);assert.notEqual(fxFrame(.1,.5,true),fxFrame(.2,.5,true));
});
