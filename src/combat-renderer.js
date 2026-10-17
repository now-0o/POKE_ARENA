import animations from './combat-sprites.json';
import { cameraTransform, viewportTransform } from './combat-camera.js';
import { FX_SHEETS, clipSpriteMaterial, drawFX, contactLight } from './combat-fx.js';
export { viewportTransform } from './combat-camera.js';
import { FIGHTERS, WORLD } from './combat-data.js';
import { activeFighter } from './combat-engine.js';
export async function loadCombatAssets() {
  const assets = {};
  await Promise.all([...Object.keys(animations).flatMap(id => Object.keys(animations[id]).map(anim => [`${id}/${anim}`, `/arena/sprites/${id}/${anim}-Anim.png`])), ['stadium', '/arena/ui/league-stadium.png'], ...FX_SHEETS.map(name=>['vfx-'+name,`/arena/fx/${name}.png`])].map(([key, url]) => new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => { assets[key] = key.startsWith('vfx-') ? clipSpriteMaterial(img) : img; resolve(); }; img.onerror = () => reject(new Error('전투 이미지를 불러오지 못했어요. 다시 시도해 주세요.')); img.src = url;
  })));
  return assets;
}
function label(ctx, value, x, y, size = 13, color = '#f4f0d9') { ctx.font = `${size}px Galmuri, monospace`; ctx.textAlign = 'center'; ctx.fillStyle = '#213e35'; ctx.fillText(value, x + 1, y + 1); ctx.fillStyle = color; ctx.fillText(value, x, y); }
function pixel(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
export function renderArenaFloor(ctx, assets) { ctx.imageSmoothingEnabled = false; ctx.drawImage(assets.stadium, 0, 0, WORLD.width, WORLD.height); }
function animationFrame(meta, seconds) { let tick = (seconds * 60) % meta.durations.reduce((a, b) => a + b, 0); for (let i = 0; i < meta.durations.length; i++) { if (tick < meta.durations[i]) return i; tick -= meta.durations[i]; } return 0; }
function sprite(ctx, assets, f, time, alpha = 1, ghost = false) {
  const kind = !ghost && f.attack > 0 ? 'Attack' : !ghost && f.moving ? 'Walk' : 'Idle';
  const meta = animations[f.id]?.[kind] || animations[f.id]?.Idle, img = assets[`${f.id}/${kind}`] || assets[`${f.id}/Idle`]; if (!meta || !img) return;
  const frame = animationFrame(meta, kind === 'Attack' ? Math.max(0, time - f.attackTime) : time), row = Math.min(meta.rows - 1, ((Math.round((Math.PI / 2 - f.facing) / (Math.PI / 4)) % 8) + 8) % 8);
  const scale = 1.5, leap = f.action?.move.kind === 'leap' && f.action.phase === 'active' ? Math.sin(f.action.age / f.action.move.duration * Math.PI) * 58 : 0;
  const x = Math.round(f.x - meta.width * scale / 2 - meta.offsetX * scale), y = Math.round(f.y - meta.height * scale / 2 - meta.offsetY * scale - 2 - leap);
  ctx.save(); ctx.globalAlpha = alpha * (f.hp <= 0 ? .25 : 1); if (ghost) ctx.filter = 'saturate(.25)'; else if (f.hit > 0) ctx.filter = 'brightness(1.5)';
  ctx.drawImage(img, frame * meta.width, row * meta.height, meta.width, meta.height, x, y, meta.width * scale, meta.height * scale); ctx.restore();
}
function line(ctx, points, color, width = 2) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(Math.round(x),Math.round(y)) : ctx.moveTo(Math.round(x),Math.round(y))); ctx.stroke(); }
function ring(ctx, x, y, r, color, width = 2) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x,y,Math.max(1,r),0,Math.PI*2); ctx.stroke(); }
// Actual raster animation: the source rectangle advances through six unique drawings.
function elemental(ctx,fx,x,y,radius,angle,time,alpha=1){drawFX(ctx,currentAssets,fx,x,y-8,Math.max(48,Math.min(120,radius*4)),angle,time,.5,true,alpha);}
let currentAssets;
function telegraph(ctx, f, a) {
  const m=a.move;if(a.slot==='basic')return;
  const color=f.side?'#ba6657':'#4d899d', p=1-a.remaining/a.total;
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle=f.side?'#b64f4220':'#42809c18';ctx.lineWidth=2;ctx.setLineDash([6,5]);
  if(['area','field','leap','storm','garden','future','ambush'].includes(m.kind)) {
    ctx.beginPath();ctx.arc(a.target.x,a.target.y,m.radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(a.target.x,a.target.y,m.radius-4,-Math.PI/2,-Math.PI/2+p*Math.PI*2);ctx.stroke();
  } else if(['melee','combo','barrage','cone'].includes(m.kind)) {
    const half=m.halfAngle||.34;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.arc(f.x,f.y,m.range,a.angle-half,a.angle+half);ctx.closePath();ctx.fill();ctx.stroke();
  } else if(m.kind==='wave'||m.kind==='quake')ring(ctx,f.x,f.y,m.radius,color,1);
  else if(m.kind!=='heal'&&m.kind!=='blink') { ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x+a.direction.x*m.range,f.y+a.direction.y*m.range);ctx.stroke(); }
  ctx.restore();
  label(ctx,m.kind==='heal'?'Z z z':m.name,f.x,f.y-66,11,color);
}
export function renderBattle(ctx, state, assets, floor, aim, reducedMotion = false) {
  currentAssets=assets;
  const width=ctx.canvas.width,height=ctx.canvas.height,v=cameraTransform(width,height,state.camera);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#273f40';ctx.fillRect(0,0,width,height);
  // Extend the stadium architecture into non-16:9 margins; world geometry stays undistorted.
  const cover=Math.max(width/WORLD.width,height/WORLD.height);ctx.globalAlpha=.65;ctx.drawImage(floor,(width-WORLD.width*cover)/2,(height-WORLD.height*cover)/2,WORLD.width*cover,WORLD.height*cover);ctx.globalAlpha=1;
  ctx.translate(v.x,v.y);ctx.scale(v.scale,v.scale);ctx.drawImage(floor,0,0);
  for(const z of state.zones){
    if(z.delay>0){const color=z.source.side?'#bf786b':'#6da8b5';ctx.save();ctx.setLineDash([5,5]);ring(ctx,z.x,z.y,z.move.radius,color,2);ctx.restore();ring(ctx,z.x,z.y,Math.max(6,z.move.radius*(1-z.delay/(z.totalDelay||1))),color,1);continue;}
    if(z.move.kind==='field')drawFX(ctx,assets,z.move.fx===3?3:14,z.x,z.y,z.move.radius*2,0,state.clock,1,true,.85);
    else if(z.move.kind==='wave'){for(let i=0;i<12;i++){const a=i*Math.PI/6;drawFX(ctx,assets,6,z.x+Math.cos(a)*z.radius,z.y+Math.sin(a)*z.radius,55,0,state.clock,.5,true,.8);}}
  }
  for(const b of state.projectiles)contactLight(ctx,b.move.fx,b.x,b.y,38,.22);
  for(const e of state.effects)contactLight(ctx,e.fx,e.x,e.y,Math.min(100,e.radius),Math.min(.25,e.life*.5));
  const fighters=[activeFighter(state,0),activeFighter(state,1)].sort((a,b)=>a.y-b.y);
  for(const f of fighters)if(f.action?.phase==='windup')telegraph(ctx,f,f.action);
  for(const g of state.trails)sprite(ctx,assets,{...g,hp:1},state.clock,g.life/g.maxLife*.3,true);
  function drawFighter(f){
    ctx.fillStyle='#172b3470';ctx.beginPath();ctx.ellipse(f.x+3,f.y+2,21,7,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=f.side?'#c88470':'#a6d6df';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(f.x,f.y,20,8,0,0,Math.PI*2);ctx.stroke();
    sprite(ctx,assets,f,state.clock,(f.invulnerable>0 && !reducedMotion) ? .7 : 1);
    if(f.hp>0){pixel(ctx,f.x-23,f.y-48,46,5,'#345449');pixel(ctx,f.x-22,f.y-47,44*f.hp/f.maxHp,3,f.side?'#d4957e':'#c6db9c');label(ctx,f.side?'CPU':'1P',f.x,f.y-53,9);}
    if(state.switchExposure[f.side]>0){drawFX(ctx,assets,11,f.x,f.y-22,72,0,.9-state.switchExposure[f.side],.9,false,.85);label(ctx,'교체 중',f.x,f.y+24,11,'#eed5a4');}
    if(f.markTime>0)drawFX(ctx,assets,7,f.x,f.y-44,32,0,state.clock,.5,true,.8);
    if(f.curseTime>0)drawFX(ctx,assets,4,f.x-18,f.y-15,28,0,state.clock,.5,true,.65);
    if(f.stun>0)label(ctx,'···',f.x,f.y-68,16,'#ecdfa2');
    else if(f.recovery>.15)label(ctx,'빈틈',f.x,f.y+22,10,'#e0d0ac');
    if(f.action?.phase==='active'&&f.action.move.kind==='cone') {
      const a=f.action;for(let d=27;d<a.move.range;d+=24){const spread=Math.sin(state.clock*16+d*.18)*.11;elemental(ctx,1,f.x+Math.cos(a.angle+spread)*d,f.y+Math.sin(a.angle+spread)*d,10,a.angle,state.clock,.85);}
    }
    if(f.action?.move.kind==='leap'&&f.action.phase==='active'){const a=f.action;ring(ctx,a.target.x,a.target.y,a.move.radius,f.side?'#bb7867':'#7aafbe',2);}
  }
  const drawables=[...fighters.map(f=>({y:f.y,draw:()=>drawFighter(f)})),...state.projectiles.map(b=>({y:b.y,draw:()=>elemental(ctx,b.move.fx,b.x,b.y,b.radius,b.angle,state.clock)}))];
  drawables.sort((a,b)=>a.y-b.y).forEach(item=>item.draw());
  for(const e of state.effects){
    const age=e.maxLife-e.life;
    if(e.kind==='beam'||e.kind==='pull'){
      const distance=Math.hypot(e.endX-e.x,e.endY-e.y),angle=Math.atan2(e.endY-e.y,e.endX-e.x);
      for(let d=28;d<distance;d+=38)drawFX(ctx,assets,e.fx,e.x+Math.cos(angle)*d,e.y+Math.sin(angle)*d-8,e.kind==='beam'?82:58,angle,age+(d%3)*.02,e.maxLife,false);
    }else drawFX(ctx,assets,e.fx,e.x,e.y-8,Math.max(45,Math.min(180,e.radius*2.2)),e.angle,age,Math.max(.3,e.maxLife),false);
  }
  for(const t of state.texts)label(ctx,t.value,t.x,t.y-(1-t.life/t.maxLife)*22,12,t.color);
  const p=activeFighter(state,0);
  if(aim&&state.phase==='fighting'){
    const a=p.action?.angle??Math.atan2(aim.y-p.y,aim.x-p.x),r=FIGHTERS[p.id].basic.range;
    ctx.save();ctx.globalAlpha=.35;ctx.setLineDash([3,8]);line(ctx,[[p.x,p.y],[p.x+Math.cos(a)*Math.min(r,150),p.y+Math.sin(a)*Math.min(r,150)]],'#f1eed5',1);ctx.restore();
    line(ctx,[[aim.x-7,aim.y],[aim.x-2,aim.y]],'#fff2c1');line(ctx,[[aim.x+2,aim.y],[aim.x+7,aim.y]],'#fff2c1');line(ctx,[[aim.x,aim.y-7],[aim.x,aim.y-2]],'#fff2c1');
  }
  if(state.noticeTime>0&&state.phase==='fighting')label(ctx,state.notice,800,125,16,'#eee9cd');
  if(state.phase==='countdown'){ctx.fillStyle='#193b3544';ctx.fillRect(0,0,WORLD.width,WORLD.height);label(ctx,state.countdown>.6?String(Math.ceil(state.countdown-.6)):'FIGHT!',800,450,62,'#f7e2ab');label(ctx,'공격을 읽고 · 피하고 · 빈틈에 반격',800,495,17,'#eff0d8');}
  ctx.restore();
  if(state.cinematic?.remaining>0){
    const c=state.cinematic,t=1-c.remaining/c.total;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#0e263c44';ctx.fillRect(0,0,width,height);const band=height*.28,y=height*.32;
    ctx.fillStyle='#183449ef';ctx.fillRect(0,y,width,band);ctx.fillStyle=FIGHTERS[c.id].color;ctx.fillRect(0,y,width,3);ctx.fillRect(0,y+band-3,width,3);
    const fighter={id:c.id,x:width*.35,y:y+band*.75,hp:1,facing:0,attack:.2,attackTime:state.clock-t*.55};
    ctx.save();ctx.translate(width*.25,y+band*.6);ctx.scale(3,3);sprite(ctx,assets,{...fighter,x:0,y:0},state.clock);ctx.restore();
    label(ctx,c.side?'CPU · ULTIMATE':'PLAYER · ULTIMATE',width*.6,y+band*.32,Math.max(11,Math.min(18,width/70)),FIGHTERS[c.id].color);
    label(ctx,c.name,width*.6,y+band*.62,Math.max(18,Math.min(30,width/45)),'#f6e9c9');
    ctx.restore();
  }
}
