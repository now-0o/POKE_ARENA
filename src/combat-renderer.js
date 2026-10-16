import animations from './combat-sprites.json';
import { FIGHTERS, WORLD } from './combat-data.js';
import { activeFighter } from './combat-engine.js';
export async function loadCombatAssets() {
  const assets = {};
  await Promise.all([...Object.keys(animations).flatMap(id => Object.keys(animations[id]).map(anim => [`${id}/${anim}`, `/arena/sprites/${id}/${anim}-Anim.png`])), ['stadium', '/arena/ui/league-stadium.png']].map(([key, url]) => new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => { assets[key] = img; resolve(); }; img.onerror = () => reject(new Error('전투 이미지를 불러오지 못했어요. 다시 시도해 주세요.')); img.src = url;
  })));
  return assets;
}
export function viewportTransform(width, height) { const scale = Math.min(width / WORLD.width, height / WORLD.height); return { scale, x: (width - WORLD.width * scale) / 2, y: (height - WORLD.height * scale) / 2 }; }
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
// Small, limited-palette effects drawn at game pixel scale; no glow or oversized VFX atlas.
function elemental(ctx, fx, x, y, radius, angle, time, alpha = 1) {
  ctx.save();ctx.translate(Math.round(x),Math.round(y)-8);ctx.rotate(angle || 0);ctx.globalAlpha=alpha;
  const r = Math.max(6,Math.min(radius,24));
  if ([0,12].includes(fx)) {
    const n = Math.floor(time*20)%2 ? 1 : -1;
    line(ctx,[[-r,0],[-r*.3,-4*n],[0,4*n],[r*.4,-3*n],[r,0]],'#a48c37',5);line(ctx,[[-r,0],[-r*.3,-4*n],[0,4*n],[r*.4,-3*n],[r,0]],'#f3e383',3);
  } else if ([1,13].includes(fx)) {
    ctx.fillStyle='#bd6949';ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-9,-5);ctx.lineTo(-3,-3);ctx.lineTo(3,-8);ctx.lineTo(12,-3);ctx.lineTo(16,0);ctx.lineTo(8,5);ctx.lineTo(1,4);ctx.lineTo(-4,7);ctx.lineTo(-9,3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#e5a15d';ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-2,-3);ctx.lineTo(4,-2);ctx.lineTo(8,0);ctx.lineTo(1,4);ctx.lineTo(-4,2);ctx.closePath();ctx.fill();pixel(ctx,-3,-1,5,3,'#ead29a');
    if(fx===13){line(ctx,[[-14,-12],[14,12]],'#d87b45',5);line(ctx,[[14,-12],[-14,12]],'#d87b45',5);line(ctx,[[0,-17],[0,17]],'#e6ac5f',4);}
  } else if(fx===2) {
    pixel(ctx,-r,-5,r*2,10,'#609aaf');pixel(ctx,-r+3,-3,r*2-4,5,'#a4d1d2');pixel(ctx,r-3,-7,4,14,'#78b8ca');
  } else if(fx===3) {
    for(let i=-1;i<=1;i++){ctx.save();ctx.translate(i*9,i*6);ctx.rotate(-.5);ctx.fillStyle='#668e52';ctx.beginPath();ctx.moveTo(-7,0);ctx.quadraticCurveTo(0,-10,8,0);ctx.quadraticCurveTo(0,8,-7,0);ctx.fill();line(ctx,[[-5,0],[6,0]],'#b7ce79',1);ctx.restore();}
  } else if([4,7,9,15].includes(fx)) {
    const palettes={4:['#66547d','#a18eb5'],7:['#5690b0','#b6d5de'],9:['#ae87ab','#e1c8d3'],15:['#9788ad','#ccc2d7']},[dark,light]=palettes[fx];
    ctx.fillStyle=dark;ctx.beginPath();ctx.arc(0,0,r*.7,0,Math.PI*2);ctx.fill();ctx.fillStyle=light;ctx.beginPath();ctx.arc(-2,-2,r*.43,0,Math.PI*2);ctx.fill();pixel(ctx,-4,-5,4,3,'#e5e5d7');
    for(let i=0;i<3;i++){const t=time*4+i*2.1;pixel(ctx,Math.cos(t)*r,Math.sin(t)*r,2,2,light);}
  } else if(fx===6) {
    for(let i=0;i<6;i++){const a=i*Math.PI/3;pixel(ctx,Math.cos(a)*radius*.65,Math.sin(a)*radius*.45,5,4,'#ae9474');}
  } else if([5,8,10,11].includes(fx)) {
    const color=fx===8?'#c4b8d7':fx===11?'#e9e2b7':'#dedfd1';
    for(let i=0;i<(fx===8?3:2);i++)line(ctx,[[-12+i*6,-9],[-3+i*6,-2],[7+i*6,9]],color,fx===11?2:3);
  }
  ctx.restore();
}
function telegraph(ctx, f, a) {
  const m=a.move;if(a.slot==='basic')return;
  const color=f.side?'#ba6657':'#4d899d', p=1-a.remaining/a.total;
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle=f.side?'#b64f4220':'#42809c18';ctx.lineWidth=2;ctx.setLineDash([6,5]);
  if(['area','field','leap'].includes(m.kind)) {
    ctx.beginPath();ctx.arc(a.target.x,a.target.y,m.radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(a.target.x,a.target.y,m.radius-4,-Math.PI/2,-Math.PI/2+p*Math.PI*2);ctx.stroke();
  } else if(['melee','combo','cone'].includes(m.kind)) {
    const half=m.halfAngle||.34;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.arc(f.x,f.y,m.range,a.angle-half,a.angle+half);ctx.closePath();ctx.fill();ctx.stroke();
  } else if(m.kind==='wave')ring(ctx,f.x,f.y,m.radius,color,1);
  else if(m.kind!=='heal'&&m.kind!=='blink') { ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x+a.direction.x*m.range,f.y+a.direction.y*m.range);ctx.stroke(); }
  ctx.restore();
  label(ctx,m.kind==='heal'?'Z z z':m.name,f.x,f.y-66,11,color);
}
export function renderBattle(ctx, state, assets, floor, aim, reducedMotion = false) {
  const width=ctx.canvas.width,height=ctx.canvas.height,v=viewportTransform(width,height);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#273f40';ctx.fillRect(0,0,width,height);
  // Extend the stadium architecture into non-16:9 margins; world geometry stays undistorted.
  const cover=Math.max(width/WORLD.width,height/WORLD.height);ctx.globalAlpha=.65;ctx.drawImage(floor,(width-WORLD.width*cover)/2,(height-WORLD.height*cover)/2,WORLD.width*cover,WORLD.height*cover);ctx.globalAlpha=1;
  ctx.translate(v.x,v.y);ctx.scale(v.scale,v.scale);ctx.drawImage(floor,0,0);
  for(const z of state.zones){
    if(z.move.kind==='field'){ctx.save();ctx.globalAlpha=.4;ring(ctx,z.x,z.y,z.move.radius,'#4f95aa',2);for(let i=0;i<3;i++){ctx.beginPath();ctx.strokeStyle='#84bfca';ctx.lineWidth=3;ctx.arc(z.x,z.y,20+i*20,state.clock*2+i,state.clock*2+i+Math.PI*1.2);ctx.stroke();}ctx.restore();}
    else{ring(ctx,z.x,z.y,z.radius,'#ae9474',4);for(let i=0;i<12;i++){const a=i*Math.PI/6;pixel(ctx,z.x+Math.cos(a)*z.radius,z.y+Math.sin(a)*z.radius,4,3,'#d1bc91');}}
  }
  const fighters=[activeFighter(state,0),activeFighter(state,1)].sort((a,b)=>a.y-b.y);
  for(const f of fighters)if(f.action?.phase==='windup')telegraph(ctx,f,f.action);
  for(const g of state.trails)sprite(ctx,assets,{...g,hp:1},state.clock,g.life/g.maxLife*.3,true);
  for(const f of fighters){
    ctx.fillStyle='#28433950';ctx.beginPath();ctx.ellipse(f.x,f.y,17,6,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=f.side?'#c88470':'#a6d6df';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(f.x,f.y,20,8,0,0,Math.PI*2);ctx.stroke();
    sprite(ctx,assets,f,state.clock,(f.invulnerable>0 && !reducedMotion) ? .7 : 1);
    if(f.hp>0){pixel(ctx,f.x-23,f.y-48,46,5,'#345449');pixel(ctx,f.x-22,f.y-47,44*f.hp/f.maxHp,3,f.side?'#d4957e':'#c6db9c');label(ctx,f.side?'CPU':'1P',f.x,f.y-53,9);}
    if(f.stun>0)label(ctx,'···',f.x,f.y-68,16,'#ecdfa2');
    else if(f.recovery>.15)label(ctx,'빈틈',f.x,f.y+22,10,'#e0d0ac');
    if(f.action?.phase==='active'&&f.action.move.kind==='cone') {
      const a=f.action;for(let d=27;d<a.move.range;d+=24){const spread=Math.sin(state.clock*16+d*.18)*.11;elemental(ctx,1,f.x+Math.cos(a.angle+spread)*d,f.y+Math.sin(a.angle+spread)*d,10,a.angle,state.clock,.85);}
    }
    if(f.action?.move.kind==='leap'&&f.action.phase==='active'){const a=f.action;ring(ctx,a.target.x,a.target.y,a.move.radius,f.side?'#bb7867':'#7aafbe',2);}
  }
  for(const b of state.projectiles)elemental(ctx,b.move.fx,b.x,b.y,b.radius,b.angle,state.clock);
  for(const e of state.effects){
    const alpha=Math.min(1,e.life/.09);
    if(e.kind==='beam'){ctx.save();ctx.globalAlpha=alpha;line(ctx,[[e.x,e.y-7],[e.endX,e.endY-7]],'#87ae6c',12);line(ctx,[[e.x,e.y-7],[e.endX,e.endY-7]],'#e1e8a7',4);ctx.restore();}
    else if(e.kind==='pull'){line(ctx,[[e.x,e.y-6],[e.endX,e.endY-6]],'#557c4b',4);line(ctx,[[e.x,e.y-7],[e.endX,e.endY-7]],'#a0bf74',2);}
    else if(e.fx===12){line(ctx,[[e.x-9,e.y-105],[e.x+6,e.y-76],[e.x-4,e.y-39],[e.x+3,e.y]],'#dcc76c',6);line(ctx,[[e.x-9,e.y-105],[e.x+6,e.y-76],[e.x-4,e.y-39],[e.x+3,e.y]],'#f1e9b1',2);ring(ctx,e.x,e.y,18+(1-e.life/e.maxLife)*e.radius*.5,'#dbcd8c',2);}
    else if(e.fx===6){ring(ctx,e.x,e.y,e.radius*(1-e.life/e.maxLife),'#ad9878',2);elemental(ctx,6,e.x,e.y,e.radius,0,state.clock,alpha);}
    else if(e.kind==='melee'){elemental(ctx,e.fx,e.x+Math.cos(e.angle)*e.range*.65,e.y+Math.sin(e.angle)*e.range*.65,16,e.angle,state.clock,alpha);}
    else elemental(ctx,e.fx,e.x,e.y,Math.min(e.radius,25),e.angle,state.clock,alpha);
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
}
