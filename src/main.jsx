import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { login, getToken, clearToken } from './auth.js';
import { ArenaConnection, checkArenaAccount } from './client.js';
import spriteData from './sprites.json';
import './styles.css';

function Sprite({ pokemon, large = false }) {
  const info = spriteData[pokemon.id];
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    let timer;
    let current = 0;
    const advance = () => {
      setFrame(current);
      timer = setTimeout(() => { current = (current + 1) % info.durations.length; advance(); }, Math.max(1, info.durations[current]) * 1000 / 60);
    };
    advance();
    return () => clearTimeout(timer);
  }, [info]);
  const scale = large ? 3 : 2;
  return <span className={`sprite-stage ${large ? 'large' : ''}`} aria-hidden="true"><span style={{
    width: info.width, height: info.height,
    backgroundImage: `url(/arena/sprites/${pokemon.id}/Idle-Anim.png)`,
    backgroundPosition: `${-frame * info.width}px 0`,
    transform: `translate(${info.offsetX * scale}px, ${info.offsetY * scale}px) scale(${scale})`,
  }} /></span>;
}
function Type({ type }) { return <span className="type" data-type={type}>{type}</span>; }
function Login({ onLogin }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const data = new FormData(e.currentTarget);
    try { onLogin(await login(data.get('username'), data.get('password'))); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="login-layout"><section className="intro">
    <span className="eyebrow">REAL-TIME POKÉMON ACTION</span>
    <h1>너의 팀으로,<br /><em>새로운 아레나.</em></h1>
    <p>함께할 포켓몬 세 마리를 선택하세요.<br />타입을 읽고, 팀을 바꾸는 액션 배틀의 시작.</p>
    <div className="pixel-field" aria-hidden="true"><span className="pixel-pokeball" /><span className="field-label">TRAINING GROUNDS · 01</span></div>
    <div className="intro-meta"><span>10 POKÉMON</span><span>3 MEMBER TEAM</span><span>BOT TRAINING</span></div>
  </section><section className="panel login-panel"><span className="eyebrow">TRAINER ACCESS</span><h2>트레이너 로그인</h2>
    <p className="muted">포케스톤에서 사용하던 계정으로 입장하세요.</p>
    <form onSubmit={submit}><label>아이디<input name="username" autoComplete="username" placeholder="트레이너 아이디" required maxLength={20} disabled={busy} /></label>
      <label>비밀번호<input name="password" type="password" autoComplete="current-password" placeholder="비밀번호" required maxLength={200} disabled={busy} /></label>
      {error && <p role="alert" className="error">{error}</p>}<button className="primary" disabled={busy}>{busy ? '계정 확인 중…' : '아레나 입장 →'}</button>
    </form><div className="login-note"><i />첫 테스트 · 봇전 팀 선택까지 플레이할 수 있어요.</div>
  </section></div>;
}
function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!getToken());
  const [sessionError, setSessionError] = useState('');
  const [roster, setRoster] = useState([]);
  const [room, setRoom] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [roomName, setRoomName] = useState('첫 번째 연습방');
  const [focusId, setFocusId] = useState(null);
  const [connectionVersion, setConnectionVersion] = useState(0);
  const connection = useRef(null);
  useEffect(() => {
    if (!getToken()) return;
    let active = true;
    checkArenaAccount().then((account) => { if (active) setUser(account); }).catch((err) => {
      if (!active) return;
      if (err.status === 401) clearToken();
      setSessionError(err.message);
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!user) return;
    setError('');
    const client = new ArenaConnection((packet) => {
      if (packet.event === 'authenticated') { setRoster(packet.roster); setRoom(packet.room); }
      if (packet.event === 'state') setRoom(packet.room);
      if (packet.event === 'error') setError(packet.message);
      if (packet.code === 'unauthorized') { clearToken(); setUser(null); }
    }, (next, message) => { setStatus(next); if (message) setError(message); });
    connection.current = client;
    return () => { client.close(); connection.current = null; };
  }, [user, connectionVersion]);
  async function command(event, payload = {}) {
    if (busy) return;
    setBusy(true); setError('');
    try { await connection.current.request(event, payload); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function logout() { connection.current?.close(); clearToken(); setUser(null); setRoom(null); setRoster([]); setError(''); }
  const online = status === 'online';
  const disabled = busy || !online;
  const team = room?.team || [];
  const focused = roster.find((p) => p.id === focusId) || roster[0];
  const getPokemon = (id) => roster.find((p) => p.id === id);
  const step = !user ? 0 : !room || room.phase === 'lobby' ? 1 : room.phase === 'selecting' ? 2 : 3;
  const labels = ['로그인', '연습방', '포켓몬 선택', '팀 준비 완료'];
  return <div className="app"><header className="topbar"><a className="brand" href="/" aria-label="포케 아레나 홈"><span className="brand-icon" />POKÉ<span>ARENA</span></a><span className="edition">BOT TRAINING / EARLY BUILD</span>
    {user && <div className="account"><span>{user.username}</span><button onClick={logout} className="text-button">로그아웃</button></div>}</header>
    <main><nav className="steps" aria-label="진행 단계">{labels.map((label, index) => <span key={label} className={index === step ? 'current' : index < step ? 'done' : ''} aria-current={index === step ? 'step' : undefined}><b>{String(index + 1).padStart(2, '0')}</b>{label}</span>)}</nav>
    {checking ? <div className="panel loading">계정 확인 중…</div> : !user ? <>{sessionError && <p role="alert" className="error">{sessionError}</p>}<Login onLogin={(account) => { setSessionError(''); setUser(account); }} /></> : <>
      <div className="section-heading"><div><span className="eyebrow">{step < 2 ? 'MAKE YOUR NEXT MOVE' : 'BUILD YOUR SQUAD'}</span><h1>{!room ? '연습방 만들기' : room.phase === 'lobby' ? '연습 준비' : room.phase === 'selecting' ? '함께할 3마리를 골라주세요.' : '팀 준비가 끝났어요.'}</h1></div>
        <div className={`connection ${online ? 'online' : ''}`}><i />{({ online: '서버 연결됨', connecting: '연결 중', reconnecting: '다시 연결 중', offline: '연결 끊김' })[status]}{status === 'offline' && <button className="text-button" onClick={() => setConnectionVersion((v) => v + 1)}>재연결</button>}</div></div>
      {error && <div className="error" role="alert">{error}</div>}
      {!room ? <div className="room-layout"><section className="panel create-panel"><span className="panel-number">01 / PRIVATE ROOM</span><h2>우리 팀의 첫 연습</h2><p className="muted">나만의 방에서 봇을 상대로 팀을 준비하세요.</p><form onSubmit={(e) => { e.preventDefault(); command('room.create', { name: roomName }); }}><label>방 이름<input value={roomName} onChange={(e) => setRoomName(e.target.value)} maxLength={24} required disabled={disabled} /></label><button className="primary" disabled={disabled}>방 만들기 →</button></form></section><aside className="panel rules"><span className="eyebrow">HOW TO PLAY</span><h2>작은 팀, 다양한 가능성.</h2><p><b>01</b> 연습방을 만들고 봇전을 시작해요.</p><p><b>02</b> 10종 중 서로 다른 3마리를 골라요.</p><p><b>03</b> 첫 번째 포켓몬이 선발로 출전해요.</p><small>이번 버전은 팀 선택 완료까지 제공됩니다.</small></aside></div>
      : room.phase === 'lobby' ? <section className="panel lobby"><div className="lobby-title"><span className="eyebrow">PRIVATE TRAINING ROOM</span><h2>{room.name}</h2></div><div className="versus"><div><div className="trainer-avatar">{user.username.slice(0, 1).toUpperCase()}</div><h3>{user.username}</h3><span className="status-tag">방장 · 준비됨</span></div><b className="vs">VS</b><div><div className="trainer-avatar bot">⌘</div><h3>연습 봇</h3><span className="muted">시작하면 참가합니다</span></div></div><div className="lobby-actions"><button className="secondary" disabled={disabled} onClick={() => command('room.leave')}>방 나가기</button><button className="primary" disabled={disabled} onClick={() => command('bot.start')}>봇전 시작 · 포켓몬 선택 →</button></div></section>
      : room.phase === 'selecting' ? <><div className="selection-layout"><section className="panel roster-panel"><div className="panel-heading"><h2>포켓몬 라인업 <small>10</small></h2><span>{team.length} / 3 SELECTED</span></div><div className="roster">{roster.map((pokemon) => { const index = team.indexOf(pokemon.id); return <button key={pokemon.id} disabled={disabled || (team.length === 3 && index < 0)} className={`pokemon-card ${index >= 0 ? 'selected' : ''}`} aria-pressed={index >= 0} onMouseEnter={() => setFocusId(pokemon.id)} onFocus={() => setFocusId(pokemon.id)} onClick={() => command('team.select', { team: index >= 0 ? team.filter((id) => id !== pokemon.id) : [...team, pokemon.id] })}><span className="dex">#{String(pokemon.dex).padStart(3, '0')}</span>{index >= 0 && <span className="selected-number">{index + 1}</span>}<Sprite pokemon={pokemon} /><strong>{pokemon.name}</strong><div>{pokemon.types.map((type) => <Type key={type} type={type} />)}</div></button>; })}</div></section><aside className="panel detail-panel">{focused && <><span className="eyebrow">POKÉMON PROFILE</span><Sprite pokemon={focused} large /><span className="dex">#{String(focused.dex).padStart(3, '0')}</span><h2>{focused.name}</h2><div>{focused.types.map((type) => <Type key={type} type={type} />)}</div><p className="role-label">플레이 스타일 <strong>{focused.role}</strong></p><p className="muted">다양한 타입으로 팀을 구성해 보세요.<br />기술과 전투 능력치는 다음 버전에서 추가됩니다.</p></>}</aside></div><section className="panel team-panel"><div><span className="eyebrow">YOUR SQUAD</span><h2>나의 팀 <small>{team.length}/3</small></h2></div><div className="team-slots">{[0, 1, 2].map((index) => { const pokemon = getPokemon(team[index]); return <div className="team-slot" key={index}><span className="slot-number">{index === 0 ? '선발' : `교체 ${index}`}</span>{pokemon ? <><Sprite pokemon={pokemon} /><strong>{pokemon.name}</strong><button aria-label={`${pokemon.name} 선택 해제`} className="remove" disabled={disabled} onClick={() => command('team.select', { team: team.filter((id) => id !== pokemon.id) })}>×</button></> : <span className="empty">＋<small>포켓몬 선택</small></span>}</div>; })}</div><div className="team-confirm"><p className="muted">선택 순서가 출전 순서예요.</p><button className="primary" disabled={disabled || team.length !== 3} onClick={() => command('team.confirm')}>이 팀으로 확정 →</button></div></section><button className="text-button leave" disabled={disabled} onClick={() => command('room.leave')}>연습방 나가기</button></>
      : <section className="panel ready-panel"><span className="eyebrow">SQUAD LOCKED IN</span><h2>출전 팀이 확정됐어요.</h2><p className="muted">여기까지가 이번 테스트 범위예요. 실제 전투는 다음 단계에서 연결됩니다.</p><div className="ready-teams">{[{ name: user.username, ids: team }, { name: '연습 봇', ids: room.botTeam }].map((entry) => <div key={entry.name}><h3>{entry.name}</h3><div className="ready-line">{entry.ids.map((id, index) => { const pokemon = getPokemon(id); return <div key={id}><Sprite pokemon={pokemon} /><strong>{pokemon.name}</strong><small>{index === 0 ? '선발' : `교체 ${index}`}</small></div>; })}</div></div>)}</div><div className="lobby-actions"><button className="secondary" disabled={disabled} onClick={() => command('room.leave')}>대기 화면으로</button><button className="primary" disabled={disabled} onClick={() => command('team.edit')}>팀 다시 고르기</button></div></section>}
    </>}</main><footer><span>POKÉ ARENA · FAN PROJECT</span><a href="/arena/credits.html" target="_blank" rel="noreferrer">스프라이트 제작자 크레딧 ↗</a><span>TEAM SELECTION PROTOTYPE / 0.1</span></footer></div>;
}
createRoot(document.getElementById('root')).render(<App />);
