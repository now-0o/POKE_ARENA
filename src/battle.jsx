import React, { useEffect, useRef, useState } from 'react';
import { FIGHTERS, DODGE, WORLD, ENERGY } from './combat-data.js';
import { createBattle, activeFighter, stepBattle } from './combat-engine.js';
import { loadCombatAssets, renderArenaFloor, renderBattle } from './combat-renderer.js';
import { updateCamera, screenToWorld } from './combat-camera.js';
import { GameButton, Sprite, UI } from './pixel-ui.jsx';
import './battle.css';
let cachedAssets;
function loadAssets() { if (!cachedAssets) cachedAssets = loadCombatAssets().catch(error => { cachedAssets = null; throw error; }); return cachedAssets; }
export function BattleScreen({ user, room, roster, onBack, onEdit, disabled }) {
  const canvasRef = useRef(null), gameRef = useRef(null), inputRef = useRef({ dx: 0, dy: 0, aim: { x: 1170, y: 450 } });
  const [hud, setHud] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [paused, setPaused] = useState(false), [run, setRun] = useState(0);
  const byId = id => roster.find(p => p.id === id);
  useEffect(() => {
    let cancelled = false, frameId, state, assets, floor, last = 0, accumulator = 0, updateTime = 0;
    const canvas = canvasRef.current, ctx = canvas.getContext('2d');
    const input = { dx: 0, dy: 0, aim: { x: 1170, y: 450 } }, keys = new Set(); inputRef.current = input;
    setLoading(true); setError(''); setPaused(false); setHud(null);
    function snapshot() {
      setHud({ teams: state.teams.map(team => team.map(f => ({ ...f, cds: { ...f.cds } }))), active: [...state.active], phase: state.phase, winner: state.winner, timeLeft: state.timeLeft, stats: state.stats, energy: [...state.energy] });
    }
    function clearInput() { keys.clear(); Object.assign(input, { dx: 0, dy: 0, attack: false, q: false, r: false, e: false, dodge: false }); }
    function pause() { clearInput(); if (state && state.phase !== 'finished') { state.paused = true; setPaused(true); } }
    function movement() { input.dx = Number(keys.has('KeyD')) - Number(keys.has('KeyA')); input.dy = Number(keys.has('KeyS')) - Number(keys.has('KeyW')); }
    function keydown(event) {
      if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.code === 'Escape' && !event.repeat && state && state.phase !== 'finished') {
        event.preventDefault(); clearInput(); state.paused = !state.paused; setPaused(state.paused); return;
      }
      if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyR', 'KeyE', 'Space'].includes(event.code)) return;
      if (event.target.tagName === 'BUTTON') return;
      event.preventDefault(); if (!state || state.paused || state.phase === 'finished') return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) { keys.add(event.code); movement(); }
      if (!event.repeat && state.phase === 'fighting') {
        if (event.code === 'KeyQ') input.q = true;
        if (event.code === 'KeyR') input.r = true;
        if (event.code === 'KeyE') input.e = true;
        if (event.code === 'Space') input.dodge = true;
      }
    }
    function keyup(event) { keys.delete(event.code); movement(); }
    function refreshAim() { if(input.pointer) input.aim=screenToWorld(input.pointer.x*canvas.width,input.pointer.y*canvas.height,canvas.width,canvas.height,state?.camera); }
    function aim(event) { const r = canvas.getBoundingClientRect(); input.pointer={x:(event.clientX-r.left)/r.width,y:(event.clientY-r.top)/r.height}; refreshAim(); }
    function down(event) { if (event.button !== 0 || event.pointerType === 'touch') return; event.preventDefault(); canvas.focus({ preventScroll: true }); aim(event); input.attack = true; }
    function up() { input.attack = false; }
    function hide() { if (document.hidden) pause(); }
    function resize() { const r = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(r.width)); canvas.height = Math.max(1, Math.round(r.height)); }
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function frame(now) {
      if (cancelled) return;
      const elapsed = last ? Math.min((now - last) / 1000, .1) : 0; last = now;
      updateCamera(state,elapsed,reducedMotion); refreshAim();
      if (!state.paused) {
        accumulator += elapsed;
        while (accumulator >= 1 / 60) { stepBattle(state, input, 1 / 60); accumulator -= 1 / 60; }
      } else accumulator = 0;
      renderBattle(ctx, state, assets, floor, input.aim, reducedMotion);
      if (now - updateTime > 40 || state.phase === 'finished') { snapshot(); updateTime = now; }
      if (state.phase !== 'finished') frameId = requestAnimationFrame(frame);
    }
    loadAssets().then(loaded => {
      if (cancelled) return;
      assets = loaded; floor = document.createElement('canvas'); floor.width = WORLD.width; floor.height = WORLD.height; renderArenaFloor(floor.getContext('2d'), assets);
      state = createBattle(room.team, room.botTeam); gameRef.current = state; setLoading(false); snapshot();
      canvas.focus({ preventScroll: true }); frameId = requestAnimationFrame(frame);
    }).catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', pause); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    document.addEventListener('visibilitychange', hide); canvas.addEventListener('pointermove', aim); canvas.addEventListener('pointerdown', down);
    return () => {
      cancelled = true; observer.disconnect(); cancelAnimationFrame(frameId); gameRef.current = null;
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', pause); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      document.removeEventListener('visibilitychange', hide); canvas.removeEventListener('pointermove', aim); canvas.removeEventListener('pointerdown', down);
    };
  }, [room.id, run]);
  function togglePause() { const s = gameRef.current; if (!s || s.phase === 'finished') return; s.paused = !s.paused; setPaused(s.paused); canvasRef.current.focus({ preventScroll: true }); }
  function trigger(slot) { if (!gameRef.current || gameRef.current.paused) return; inputRef.current[slot] = true; if (slot === 'attack') setTimeout(() => { inputRef.current.attack = false; }, 100); canvasRef.current.focus({ preventScroll: true }); }
  function touchMove(dx, dy) { inputRef.current.dx = dx; inputRef.current.dy = dy; }
  const player = hud?.teams[0][hud.active[0]], cpu = hud?.teams[1][hud.active[1]], stats = player ? FIGHTERS[player.id] : null;
  const finished = hud?.phase === 'finished', won = hud?.winner === 0;
  return <section className="battle-screen screen-enter" aria-label="봇 트레이닝 전투">
    <div className="battle-heading"><span className="pixel-eyebrow">LEAGUE ARENA <small>3 VS 3 · TRAINING</small></span><span className="battle-clock">{hud ? `${Math.floor(Math.ceil(hud.timeLeft) / 60)}:${String(Math.ceil(hud.timeLeft) % 60).padStart(2, '0')}` : '3:00'}</span><button className="battle-pause" onClick={togglePause} disabled={loading || finished || !!error}>Ⅱ 일시정지 <kbd>ESC</kbd></button></div>
    <div className="battle-scoreboard">{[player, cpu].map((f, side) => <section className={`battle-health side-${side}`} key={side}><div className="battle-health-title"><span>{side ? 'CPU / 연습 봇' : `1P / ${user.username}`}</span><strong>{f && byId(f.id)?.name}</strong><span>{f ? `${Math.ceil(f.hp)} / ${f.maxHp}` : '…'}</span></div><div className="battle-health-bar"><i style={{ width: `${f ? 100 * f.hp / f.maxHp : 100}%` }} /></div><div className="battle-energy-bar" aria-label={`궁극기 게이지 ${Math.floor(hud?.energy?.[side] || 0)}%`}><i style={{width:`${hud?.energy?.[side] || 0}%`}}/><span>{(hud?.energy?.[side] || 0)>=99.999 ? 'ULT READY' : `ULT ${Math.floor(hud?.energy?.[side] || 0)}%`}</span></div><div className="battle-team">{(hud?.teams[side] || []).map((p, i) => <span key={p.id} className={`${p.hp <= 0 ? 'fainted' : ''} ${hud.active[side] === i ? 'active' : ''}`}><img src={`${UI}pokeball${p.hp <= 0 ? '-empty' : ''}.png`} alt="" />{byId(p.id)?.name}<small>{p.hp <= 0 ? '기절' : `${Math.ceil(p.hp / p.maxHp * 100)}%`}</small></span>)}</div></section>)}</div>
    <div className="battle-viewport"><canvas ref={canvasRef} width="1600" height="900" tabIndex={0} aria-label="전투장. WASD 이동, 마우스 조준, 클릭 단발공격, Q R 기술, E 궁극기, 스페이스 회피, ESC 일시정지" />
      {(loading || error) && <div className="battle-overlay"><div className="pixel-frame frame-paper battle-dialog"><img src={`${UI}pokeball.png`} alt="" /><h2>{error || '전투장 준비 중…'}</h2>{error && <GameButton onClick={() => setRun(v => v + 1)}>다시 불러오기</GameButton>}</div></div>}
      {paused && !finished && <div className="battle-overlay"><div className="pixel-frame frame-paper battle-dialog"><span className="pixel-eyebrow">TAKE A BREATH</span><h2>잠깐 쉬어가기</h2><p>전투가 일시정지됐어요.</p><GameButton onClick={togglePause}>전투 계속 ▶</GameButton><GameButton tone="blue" onClick={onBack}>팀 확인으로</GameButton></div></div>}
      {finished && <div className="battle-overlay"><div className={`pixel-frame ${won ? 'frame-gold' : 'frame-paper'} battle-dialog result-dialog`} role="status"><span className="pixel-eyebrow">TRAINING COMPLETE</span><h1>{hud.winner === 'draw' ? 'DRAW' : won ? 'VICTORY!' : 'GOOD TRY!'}</h1><p>{hud.winner === 'draw' ? '막상막하의 승부! 한 번 더 도전해 볼까?' : won ? '파트너와 함께 승리를 거뒀다!' : '멋진 승부였어. 다시 도전해 보자!'}</p><p className="battle-result-stats">회피 성공 {hud.stats?.dodges[0] || 0} · 빈틈 공략 {hud.stats?.punishes[0] || 0}</p><div className="result-partners">{room.team.map(id => <Sprite key={id} pokemon={byId(id)} size="slot" />)}</div><GameButton onClick={() => setRun(v => v + 1)}>같은 팀으로 재대결 ▶</GameButton><GameButton tone="blue" disabled={disabled} onClick={onEdit}>포켓몬 다시 선택</GameButton><button className="back-link" onClick={onBack}>팀 확인으로 돌아가기</button></div></div>}
    </div>
    <div className="battle-status" aria-live="polite">{player?.action ? `${player.action.move.name} · ${player.action.phase === 'windup' ? '준비 중 · 방향 고정' : '사용 중'}` : player?.recovery > .05 ? '후딜 · 거리 벌리기' : player?.stun > 0 ? '경직' : player?.counter > 0 ? '정밀 회피 성공 · 다음 공격 강화' : '공격을 유도하고, 피하고, 빈틈에 반격하세요'}</div>
    <div className="battle-skills">{stats && <><div className="battle-partner"><Sprite pokemon={byId(player.id)} size="slot" /><div><small>YOUR PARTNER</small><strong>{byId(player.id)?.name}</strong><span>{player.slow > 0 ? '이동속도 감소' : player.action?.move.kind === 'heal' ? '잠자는 중 · 피격 시 취소' : '공격 중 방향이 고정돼요'}</span></div></div>{[['basic', 'CLICK'], ['q', 'Q'], ['r', 'R'], ['e', 'E'], ['dodge', 'SPACE']].map(([slot, key]) => {
      const move = slot === 'dodge' ? { name: '회피', cooldown: DODGE.cooldown, fx: 10 } : stats[slot], cd = player.cds[slot], energy=hud.energy?.[0] || 0, ultimate=slot === 'e', ready=ultimate?energy >= ENERGY.max-.001:cd <= 0;
      const locked = slot === 'dodge' ? player.stun > 0 || player.root > 0 || (player.action && player.action.slot !== 'basic') || player.recovery > .22 : !!player.action || player.recovery > .01 || player.stun > 0;
      return <button className={`skill-tile ${!ready ? 'cooling' : locked ? 'skill-locked' : 'skill-ready'} ${ultimate ? 'ultimate-tile' : ''} ${player.action?.slot === slot ? 'casting' : ''}`} key={slot} title={move.hint || (slot === 'dodge' ? '이동 방향 회피 · 기본공격 준비 동작 취소 가능' : '한 번 클릭할 때 한 번 공격')} style={{ '--skill-color': stats.color }} disabled={loading || hud?.phase !== 'fighting' || paused || !ready || locked || player.hp <= 0} onClick={() => trigger(slot === 'basic' ? 'attack' : slot)} onPointerUp={() => { if (slot === 'basic') setTimeout(() => { inputRef.current.attack = false; }, 80); }} aria-label={`${move.name}, ${key}${ultimate ? `, 궁극기 게이지 ${Math.floor(energy)}%` : cd > 0 ? `, ${cd.toFixed(1)}초 후` : ', 사용 가능'}`}>
        <span className="skill-key">{key}</span><SkillIcon fx={move.fx} /><strong>{move.name}</strong><span className="cooldown-number">{ultimate ? ready ? 'ULT READY' : `${Math.floor(energy)}%` : cd > 0 ? cd.toFixed(1) : locked ? '대기' : 'READY'}</span><small>{slot === 'dodge' ? '짧은 무적' : slot === 'basic' ? '단발 공격' : ultimate ? '게이지 궁극기' : move.hint?.split(' · ')[0]}</small><span className="skill-progress"><i style={{ width: `${ultimate ? energy : 100 * (1 - cd / move.cooldown)}%` }} /></span>{!ready && <span className="skill-cooldown" style={{ height: `${ultimate ? 100-energy : 100 * cd / move.cooldown}%` }} />}

      </button>;
    })}</>}</div>
    <div className="touch-movement" aria-label="터치 이동">{[[0,-1,'↑'],[-1,0,'←'],[0,1,'↓'],[1,0,'→']].map(([dx,dy,label]) => <button key={label} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); touchMove(dx,dy); }} onPointerUp={() => touchMove(0,0)} onPointerCancel={() => touchMove(0,0)}>{label}</button>)}</div>
    <p className="battle-help"><span><kbd>W A S D</kbd> 이동</span><span><kbd>마우스</kbd> 조준 · 클릭 단발공격</span><span><kbd>Q</kbd> <kbd>R</kbd> 기술 <kbd>E</kbd> 궁극기</span><span><kbd>SPACE</kbd> 이동 방향 회피</span><span>공격 준비·후딜에는 기술 연속 사용 불가</span></p>
  </section>;
}

function SkillIcon({ fx }) {
  const paths = {
    0:'M9 1 3 9 8 9 6 15 13 6 8 6Z',12:'M9 1 3 9 8 9 6 15 13 6 8 6Z',
    1:'M8 1 8 6 12 4 14 10 12 14 5 14 2 10 5 4 5 8Z',13:'M8 1V15M2 4 14 12M14 4 2 12',
    2:'M2 6H12V4H14V12H12V10H2ZM2 8H12',14:'M13 5 10 2 5 2 2 5 2 10 5 13 10 13 13 10 13 7 10 5 6 5 5 7 6 10 9 10',
    3:'M2 13 4 5 12 2 14 4 11 12ZM4 12 11 5',4:'M4 3H11L14 6V12L11 14H4L1 11V6ZM5 7V9M10 7V9',
    5:'M3 7V3H6V6H8V2H10V6H13V11L10 14H5L2 11V7Z',6:'M1 12 4 8 7 11 10 4 15 12M5 2 7 5M12 14H15',
    7:'M5 2H10L14 6V10L10 14H5L1 10V6ZM6 5H9L11 7V9L9 11H6L4 9V7Z',8:'M3 1 1 5 5 15M8 1 6 5 10 15M13 1 11 5 15 15',
    9:'M11 1 6 4 4 8 6 12 11 15 5 14 1 10V6L5 2Z',10:'M1 3H10L15 8 10 13H1M4 6H9M4 10H9',
    15:'M1 8 4 4 8 2 12 4 15 8 12 12 8 14 4 12ZM6 6H10V10H6Z',11:'M8 1V5M8 11V15M1 8H5M11 8H15'
  };
  return <svg className="skill-icon" viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges"><path d={paths[fx] || paths[11]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" /></svg>;
}
