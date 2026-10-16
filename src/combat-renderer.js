import animations from './combat-sprites.json';
import { FIGHTERS, WORLD } from './combat-data.js';
import { activeFighter } from './combat-engine.js';
export async function loadCombatAssets() {
  const assets = {};
  await Promise.all([...Object.keys(animations).flatMap(id => Object.keys(animations[id]).map(anim => [`${id}/${anim}`, `/arena/sprites/${id}/${anim}-Anim.png`])), ['fx', '/arena/ui/battle-fx.png'], ['stadium', '/arena/ui/stadium.png']].map(([key, url]) => new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => { assets[key] = img; resolve(); }; img.onerror = () => reject(new Error('전투 이미지를 불러오지 못했어요. 다시 시도해 주세요.')); img.src = url;
  })));
  return assets;
}
function label(ctx, value, x, y, size = 14, color = '#fff', align = 'center') {
  ctx.font = `${size}px Galmuri11, monospace`; ctx.textAlign = align; ctx.fillStyle = '#091b29'; ctx.fillText(value, x + 2, y + 2); ctx.fillStyle = color; ctx.fillText(value, x, y);
}
function rect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
export function renderArenaFloor(ctx, assets) {
  ctx.imageSmoothingEnabled = false;
  rect(ctx, 0, 0, 960, 540, '#122d43');
  if (assets.stadium) { ctx.globalAlpha = .65; ctx.drawImage(assets.stadium, 0, -45, 960, 650); ctx.globalAlpha = 1; }
  rect(ctx, 32, 68, 896, 441, '#081e2d'); rect(ctx, 38, 74, 884, 428, '#78a6a9'); rect(ctx, 44, 80, 872, 416, '#cee4c1');
  const tiles = ['#739b79', '#779f7d', '#7aa17e', '#739a78'];
  for (let y = 86; y < 491; y += 18) for (let x = 50; x < 910; x += 18) {
    rect(ctx, x, y, Math.min(18, 910 - x), Math.min(18, 491 - y), tiles[(Math.floor(x / 18) * 13 + Math.floor(y / 18) * 7) % 4]);
    if ((x * 3 + y * 7) % 9 === 0) rect(ctx, x + 4, y + 10, 3, 2, '#8caf86');
  }
  ctx.strokeStyle = '#cee3b8'; ctx.lineWidth = 3; ctx.strokeRect(70, 103, 820, 368);
  ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(480, 104); ctx.lineTo(480, 470); ctx.stroke();
  ctx.beginPath(); ctx.arc(480, 288, 98, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(480, 288, 24, 0, Math.PI * 2); ctx.fillStyle = '#739b79'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(382, 288); ctx.lineTo(456, 288); ctx.moveTo(504, 288); ctx.lineTo(578, 288); ctx.stroke(); ctx.globalAlpha = 1;
  // Pixel arena lamps and entrance lanes.
  for (const x of [21, 933]) for (let y = 98; y < 480; y += 72) { rect(ctx, x, y, 6, 28, '#20364b'); rect(ctx, x, y, 6, 13, '#8de9d6'); }
  label(ctx, 'POKÉ ARENA', 480, 37, 19, '#d9eadb'); label(ctx, 'TRAINING FIELD / 01', 480, 526, 10, '#bbd9d0');
  label(ctx, 'PLAYER 1', 163, 60, 11, '#8de3ff'); label(ctx, 'CPU TRAINER', 799, 60, 11, '#ffb8a3');
}
function animationFrame(meta, seconds) {
  const total = meta.durations.reduce((a, b) => a + b, 0); let tick = (seconds * 60) % total;
  for (let i = 0; i < meta.durations.length; i++) { if (tick < meta.durations[i]) return i; tick -= meta.durations[i]; } return 0;
}
function directionRow(angle) { return ((Math.round((Math.PI / 2 - angle) / (Math.PI / 4)) % 8) + 8) % 8; }
function sprite(ctx, assets, f, time, alpha = 1, ghost = false) {
  const kind = !ghost && f.attack > 0 ? 'Attack' : !ghost && f.moving ? 'Walk' : 'Idle';
  const meta = animations[f.id]?.[kind] || animations[f.id]?.Idle; const img = assets[`${f.id}/${kind}`] || assets[`${f.id}/Idle`];
  if (!meta || !img) return;
  const frame = animationFrame(meta, kind === 'Attack' ? Math.max(0, time - f.attackTime) : time);
  const row = Math.min(meta.rows - 1, directionRow(f.facing));
  const scale = 2; let bob = kind === 'Walk' ? Math.sin(time * 22) * 1.5 : 0;
  const x = Math.round(f.x - meta.width * scale / 2 - meta.offsetX * scale);
  const y = Math.round(f.y - meta.height * scale / 2 - meta.offsetY * scale - 3 + bob);
  ctx.save(); ctx.globalAlpha = alpha;
  if (ghost) ctx.filter = 'brightness(1.8) saturate(.2)'; else if (f.hit > 0) ctx.filter = 'brightness(2.4)';
  if (f.hp <= 0) { ctx.globalAlpha *= .35; ctx.translate(f.x, f.y); ctx.rotate(-Math.PI / 2); ctx.translate(-f.x, -f.y); }
  ctx.drawImage(img, frame * meta.width, row * meta.height, meta.width, meta.height, x, y, meta.width * scale, meta.height * scale); ctx.restore();
}
function fx(ctx, assets, index, x, y, radius, angle = 0, alpha = 1) {
  const atlas = assets.fx; if (!atlas) return;
  const cellW = atlas.width / 4, cellH = atlas.height / 4;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(angle);
  ctx.drawImage(atlas, Math.floor(index % 4 * cellW), Math.floor(Math.floor(index / 4) * cellH), Math.floor(cellW), Math.floor(cellH), -radius, -radius, radius * 2, radius * 2); ctx.restore();
}
export function renderBattle(ctx, state, assets, floor, aim, reducedMotion = false) {
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (state.shake > 0 && !reducedMotion) ctx.translate(Math.sin(state.clock * 150) * 2, Math.cos(state.clock * 130) * 2);
  ctx.drawImage(floor, 0, 0);
  for (const z of state.zones) {
    const color = z.source.side ? '#ff775e' : '#6ce3ff', progress = 1 - z.remaining / z.total;
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = z.source.side ? '#e54b352c' : '#2ab6e12c'; ctx.lineWidth = 2;
    if (z.move.kind === 'beam') {
      ctx.lineWidth = z.move.radius * 2; ctx.globalAlpha = .22; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.endX, z.endY); ctx.stroke(); ctx.globalAlpha = .85; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.endX, z.endY); ctx.stroke();
    } else {
      const radius = z.move.radius || 44; ctx.beginPath(); ctx.arc(z.x, z.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(z.x, z.y, radius - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke();
      label(ctx, z.move.kind === 'heal' ? 'Z z z' : '!', z.x, z.y + 5, 17, color);
    } ctx.restore();
  }
  for (const ghost of state.trails) sprite(ctx, assets, { ...ghost, hp: 1 }, state.clock, ghost.life / ghost.maxLife * .45, true);
  const fighters = [activeFighter(state, 0), activeFighter(state, 1)].sort((a, b) => a.y - b.y);
  for (const f of fighters) {
    ctx.fillStyle = '#132f3944'; ctx.beginPath(); ctx.ellipse(f.x, f.y, 25, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = f.side ? '#ffad8c' : '#9deeff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, f.y, 27, 11, 0, 0, Math.PI * 2); ctx.stroke();
    sprite(ctx, assets, f, state.clock, f.invulnerable > 0 && !reducedMotion && Math.floor(state.clock * 20) % 2 ? .6 : 1);
    if (f.hp > 0) {
      const by = f.y - 82; rect(ctx, f.x - 31, by, 62, 7, '#102b36'); rect(ctx, f.x - 29, by + 2, 58 * f.hp / f.maxHp, 3, f.side ? '#ff9b86' : '#9cec9c');
      label(ctx, f.side ? 'CPU' : '1P', f.x, by - 7, 9, f.side ? '#ffd0c2' : '#bdf3ff');
    }
  }
  for (const b of state.projectiles) fx(ctx, assets, b.move.fx, b.x, b.y - 13, b.radius * 1.9, b.angle);
  for (const e of state.effects) {
    const progress = 1 - e.life / e.maxLife; const radius = e.radius * (.7 + progress * .5);
    fx(ctx, assets, e.fx, e.x, e.y - 12, radius, e.angle, Math.min(1, e.life / .12));
  }
  for (const t of state.texts) label(ctx, t.value, t.x, t.y - (1 - t.life / t.maxLife) * 35, 14, t.color);
  const p = activeFighter(state, 0);
  if (aim && state.phase === 'fighting') {
    const angle = Math.atan2(aim.y - p.y, aim.x - p.x);
    ctx.strokeStyle = '#fff4b9'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(aim.x, aim.y, 9, 0, Math.PI * 2); ctx.moveTo(aim.x - 14, aim.y); ctx.lineTo(aim.x - 5, aim.y); ctx.moveTo(aim.x + 5, aim.y); ctx.lineTo(aim.x + 14, aim.y); ctx.moveTo(aim.x, aim.y - 14); ctx.lineTo(aim.x, aim.y - 5); ctx.stroke();
    ctx.fillStyle = '#f9ed9b'; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(angle) * 47, p.y + Math.sin(angle) * 47); ctx.lineTo(p.x + Math.cos(angle + .18) * 37, p.y + Math.sin(angle + .18) * 37); ctx.lineTo(p.x + Math.cos(angle - .18) * 37, p.y + Math.sin(angle - .18) * 37); ctx.fill();
  }
  if (state.noticeTime > 0 && state.phase === 'fighting') label(ctx, state.notice, 480, 65, 16, '#fff4c6');
  if (state.phase === 'countdown') {
    rect(ctx, 0, 0, WORLD.width, WORLD.height, '#0b203a66');
    label(ctx, state.countdown > .6 ? String(Math.ceil(state.countdown - .6)) : 'FIGHT!', 480, 280, 65, '#ffdf89');
    label(ctx, '마우스로 조준 · WASD로 이동', 480, 327, 16, '#e9f4ec');
  }
  ctx.restore();
}
