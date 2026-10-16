import React, { useEffect, useRef, useState } from 'react';
import { FIGHTERS, DODGE } from './combat-data.js';
import { createBattle, activeFighter, stepBattle } from './combat-engine.js';
import { loadCombatAssets, renderArenaFloor, renderBattle } from './combat-renderer.js';
import { GameButton, Sprite, UI } from './pixel-ui.jsx';
import './battle.css';
let cachedAssets;
function loadAssets() { if (!cachedAssets) cachedAssets = loadCombatAssets().catch(error => { cachedAssets = null; throw error; }); return cachedAssets; }
export function BattleScreen({ user, room, roster, onBack, onEdit, disabled }) {
  const canvasRef = useRef(null), gameRef = useRef(null), inputRef = useRef({ dx: 0, dy: 0, aim: { x: 735, y: 288 } });
  const [hud, setHud] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [paused, setPaused] = useState(false), [run, setRun] = useState(0);
  const byId = id => roster.find(p => p.id === id);
  useEffect(() => {
    let cancelled = false, frameId, state, assets, floor, last = 0, accumulator = 0, updateTime = 0;
    const canvas = canvasRef.current, ctx = canvas.getContext('2d');
    const input = { dx: 0, dy: 0, aim: { x: 735, y: 288 } }, keys = new Set(); inputRef.current = input;
    setLoading(true); setError(''); setPaused(false); setHud(null);
    function snapshot() {
      setHud({ teams: state.teams.map(team => team.map(f => ({ ...f, cds: { ...f.cds } }))), active: [...state.active], phase: state.phase, winner: state.winner, timeLeft: state.timeLeft });
    }
    function clearInput() { keys.clear(); Object.assign(input, { dx: 0, dy: 0, attack: false, q: false, e: false, dodge: false }); }
    function pause() { clearInput(); if (state && state.phase !== 'finished') { state.paused = true; setPaused(true); } }
    function movement() { input.dx = Number(keys.has('KeyD')) - Number(keys.has('KeyA')); input.dy = Number(keys.has('KeyS')) - Number(keys.has('KeyW')); }
    function keydown(event) {
      if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.code === 'Escape' && !event.repeat && state && state.phase !== 'finished') {
        event.preventDefault(); clearInput(); state.paused = !state.paused; setPaused(state.paused); return;
      }
      if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Space'].includes(event.code)) return;
      if (event.target.tagName === 'BUTTON') return;
      event.preventDefault(); if (!state || state.paused || state.phase === 'finished') return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) { keys.add(event.code); movement(); }
      if (!event.repeat && state.phase === 'fighting') {
        if (event.code === 'KeyQ') input.q = true;
        if (event.code === 'KeyE') input.e = true;
        if (event.code === 'Space') input.dodge = true;
      }
    }
    function keyup(event) { keys.delete(event.code); movement(); }
    function aim(event) { const r = canvas.getBoundingClientRect(); input.aim = { x: (event.clientX - r.left) * 960 / r.width, y: (event.clientY - r.top) * 540 / r.height }; }
    function down(event) { if (event.button !== 0 || event.pointerType === 'touch') return; event.preventDefault(); canvas.focus({ preventScroll: true }); aim(event); input.attack = true; }
    function up() { input.attack = false; }
    function hide() { if (document.hidden) pause(); }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function frame(now) {
      if (cancelled) return;
      const elapsed = last ? Math.min((now - last) / 1000, .1) : 0; last = now;
      if (!state.paused) {
        accumulator += elapsed;
        while (accumulator >= 1 / 60) { stepBattle(state, input, 1 / 60); accumulator -= 1 / 60; }
      } else accumulator = 0;
      renderBattle(ctx, state, assets, floor, input.aim, reducedMotion);
      if (now - updateTime > 80 || state.phase === 'finished') { snapshot(); updateTime = now; }
      if (state.phase !== 'finished') frameId = requestAnimationFrame(frame);
    }
    loadAssets().then(loaded => {
      if (cancelled) return;
      assets = loaded; floor = document.createElement('canvas'); floor.width = 960; floor.height = 540; renderArenaFloor(floor.getContext('2d'), assets);
      state = createBattle(room.team, room.botTeam); gameRef.current = state; setLoading(false); snapshot();
      canvas.focus({ preventScroll: true }); frameId = requestAnimationFrame(frame);
    }).catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', pause); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    document.addEventListener('visibilitychange', hide); canvas.addEventListener('pointermove', aim); canvas.addEventListener('pointerdown', down);
    return () => {
      cancelled = true; cancelAnimationFrame(frameId); gameRef.current = null;
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
    <div className="battle-heading"><span className="pixel-eyebrow">3 VS 3 · BOT TRAINING</span><span className="battle-clock">{hud ? `${Math.floor(Math.ceil(hud.timeLeft) / 60)}:${String(Math.ceil(hud.timeLeft) % 60).padStart(2, '0')}` : '3:00'}</span><button className="battle-pause" onClick={togglePause} disabled={loading || finished || !!error}>Ⅱ 일시정지 <kbd>ESC</kbd></button></div>
    <div className="battle-scoreboard">{[player, cpu].map((f, side) => <section className={`battle-health side-${side}`} key={side}><div className="battle-health-title"><span>{side ? 'CPU / 연습 봇' : `1P / ${user.username}`}</span><strong>{f && byId(f.id)?.name}</strong><span>{f ? `${Math.ceil(f.hp)} / ${f.maxHp}` : '…'}</span></div><div className="battle-health-bar"><i style={{ width: `${f ? 100 * f.hp / f.maxHp : 100}%` }} /></div><div className="battle-team">{(hud?.teams[side] || []).map((p, i) => <span key={p.id} className={`${p.hp <= 0 ? 'fainted' : ''} ${hud.active[side] === i ? 'active' : ''}`}><img src={`${UI}pokeball${p.hp <= 0 ? '-empty' : ''}.png`} alt="" />{byId(p.id)?.name}<small>{p.hp <= 0 ? '기절' : `${Math.ceil(p.hp / p.maxHp * 100)}%`}</small></span>)}</div></section>)}</div>
    <div className="battle-viewport"><canvas ref={canvasRef} width="960" height="540" tabIndex={0} aria-label="전투장. WASD 이동, 마우스 조준, 클릭 기본공격, Q E 기술, 스페이스 회피, ESC 일시정지" />
      {(loading || error) && <div className="battle-overlay"><div className="pixel-frame frame-paper battle-dialog"><img src={`${UI}pokeball.png`} alt="" /><h2>{error || '전투장 준비 중…'}</h2>{error && <GameButton onClick={() => setRun(v => v + 1)}>다시 불러오기</GameButton>}</div></div>}
      {paused && !finished && <div className="battle-overlay"><div className="pixel-frame frame-paper battle-dialog"><span className="pixel-eyebrow">TAKE A BREATH</span><h2>잠깐 쉬어가기</h2><p>전투가 일시정지됐어요.</p><GameButton onClick={togglePause}>전투 계속 ▶</GameButton><GameButton tone="blue" onClick={onBack}>팀 확인으로</GameButton></div></div>}
      {finished && <div className="battle-overlay"><div className={`pixel-frame ${won ? 'frame-gold' : 'frame-paper'} battle-dialog result-dialog`} role="status"><span className="pixel-eyebrow">TRAINING COMPLETE</span><h1>{hud.winner === 'draw' ? 'DRAW' : won ? 'VICTORY!' : 'GOOD TRY!'}</h1><p>{hud.winner === 'draw' ? '막상막하의 승부! 한 번 더 도전해 볼까?' : won ? '파트너와 함께 승리를 거뒀다!' : '멋진 승부였어. 다시 도전해 보자!'}</p><div className="result-partners">{room.team.map(id => <Sprite key={id} pokemon={byId(id)} size="slot" />)}</div><GameButton onClick={() => setRun(v => v + 1)}>같은 팀으로 재대결 ▶</GameButton><GameButton tone="blue" disabled={disabled} onClick={onEdit}>포켓몬 다시 선택</GameButton><button className="back-link" onClick={onBack}>팀 확인으로 돌아가기</button></div></div>}
    </div>
    <div className="battle-skills">{stats && <><div className="battle-partner"><Sprite pokemon={byId(player.id)} size="slot" /><div><small>YOUR PARTNER</small><strong>{byId(player.id)?.name}</strong><span>{player.slow > 0 ? '이동속도 감소' : player.sleeping > 0 ? '잠자는 중 · 피격 시 취소' : '마우스 방향으로 조준'}</span></div></div>{[['basic', 'CLICK'], ['q', 'Q'], ['e', 'E'], ['dodge', 'SPACE']].map(([slot, key]) => {
      const move = slot === 'dodge' ? { name: '회피', cooldown: DODGE.cooldown, fx: 10 } : stats[slot], cd = player.cds[slot];
      return <button className={`skill-tile ${cd > 0 ? 'cooling' : ''}`} key={slot} disabled={loading || hud?.phase !== 'fighting' || paused || cd > 0 || player.hp <= 0} onClick={() => trigger(slot === 'basic' ? 'attack' : slot)} onPointerUp={() => { if (slot === 'basic') setTimeout(() => { inputRef.current.attack = false; }, 80); }} aria-label={`${move.name}, ${key}${cd > 0 ? `, ${cd.toFixed(1)}초 후` : ', 사용 가능'}`}>
        <span className="skill-key">{key}</span><span className="skill-art" style={{ backgroundImage: `url(${UI}battle-fx.png)`, backgroundPosition: `${move.fx % 4 * 100 / 3}% ${Math.floor(move.fx / 4) * 100 / 3}%` }} /><strong>{move.name}</strong><small>{cd > 0 ? `${cd.toFixed(1)}s` : slot === 'dodge' ? '잔상 · 순간 무적' : `${move.cooldown}s`}</small>{cd > 0 && <span className="skill-cooldown" style={{ height: `${100 * cd / move.cooldown}%` }} />}
      </button>;
    })}</>}</div>
    <div className="touch-movement" aria-label="터치 이동">{[[0,-1,'↑'],[-1,0,'←'],[0,1,'↓'],[1,0,'→']].map(([dx,dy,label]) => <button key={label} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); touchMove(dx,dy); }} onPointerUp={() => touchMove(0,0)} onPointerCancel={() => touchMove(0,0)}>{label}</button>)}</div>
    <p className="battle-help"><span><kbd>W A S D</kbd> 이동</span><span><kbd>마우스</kbd> 조준 · 클릭 기본공격</span><span><kbd>Q</kbd> <kbd>E</kbd> 기술</span><span><kbd>SPACE</kbd> 이동 방향 회피</span><span>기절 시 다음 파트너 자동 출전</span></p>
  </section>;
}
