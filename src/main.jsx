import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getToken, clearToken } from './auth.js';
import { ArenaConnection, checkArenaAccount } from './client.js';
import { UI, LoginScreen, RoomScreen, SelectionScreen, ReadyScreen } from './pixel-ui.jsx';
import './styles.css';
import { BattleScreen } from './battle.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [battling, setBattling] = useState(false);
  const [checking, setChecking] = useState(!!getToken());
  const [sessionError, setSessionError] = useState('');
  const [roster, setRoster] = useState([]);
  const [room, setRoom] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [roomName, setRoomName] = useState('트레이너의 연습방');
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
  useEffect(() => { if (!room || room.phase !== 'ready') setBattling(false); }, [room?.id, room?.phase]);
  function logout() { setBattling(false); connection.current?.close(); clearToken(); setUser(null); setRoom(null); setRoster([]); setError(''); }
  const online = status === 'online';
  const disabled = busy || !online;
  const focused = roster.find((p) => p.id === focusId) || roster[0];
  const step = battling && user && room?.phase === 'ready' ? 4 : !user ? 0 : !room || room.phase === 'lobby' ? 1 : room.phase === 'selecting' ? 2 : 3;
  const labels = ['TRAINER LOGIN', 'TRAINING LOBBY', 'CHARACTER SELECT', 'TEAM READY', 'BATTLE ARENA'];
  const cabinetRef = useRef(null);
  useEffect(() => {
    const cabinet = cabinetRef.current;
    if (!cabinet) return;
    if (step === 4) { cabinet.style.removeProperty('--cabinet-scale'); return; }
    const fit = () => {
      const height = cabinet.offsetHeight;
      const available = (window.visualViewport?.height || window.innerHeight) - 16;
      cabinet.style.setProperty('--cabinet-scale', String(Math.min(1, available / Math.max(1, height))));
    };
    const observer = new ResizeObserver(fit); observer.observe(cabinet);
    window.addEventListener('resize', fit); window.visualViewport?.addEventListener('resize', fit); fit();
    return () => { observer.disconnect(); window.removeEventListener('resize', fit); window.visualViewport?.removeEventListener('resize', fit); };
  }, [step]);
  return <div className={`game-app phase-${step}`}>
    <div className="game-cabinet" ref={cabinetRef}>
      <header className="game-header"><a className="brand-link" href="/" aria-label="포케 아레나 홈"><img src={`${UI}logo.png`} alt="POKÉ ARENA" /></a><div className="header-mode"><span className="header-dot" />{labels[step]}<small>BOT TRAINING / VER. 0.5</small></div>
        {user ? <div className="header-account"><img src={`${UI}trainer-red.png`} alt="" /><span>{user.username}</span><button onClick={logout}>나가기</button></div> : <span className="header-badge">3 POKÉMON · 1 TEAM</span>}
      </header>
      <main className="game-main">
        {checking ? <div className="pixel-frame frame-paper loading-dialog"><img src={`${UI}pokeball.png`} alt="" /><p>트레이너 정보를 확인하고 있어요…</p></div> : !user ? <>{sessionError && <div role="alert" className="pixel-frame frame-paper message-dialog">{sessionError}</div>}<LoginScreen onLogin={(account) => { setSessionError(''); setUser(account); }} /></> : <>
          <div className="session-strip"><span>{room ? `ROOM / ${room.name}` : 'TRAINING MODE / BOT MATCH'}</span><div className={`connection ${online ? 'online' : ''}`} role="status"><i />{({ online: '서버 연결됨', connecting: '연결 중', reconnecting: '다시 연결 중', offline: '연결 끊김' })[status]}{status === 'offline' && <button onClick={() => setConnectionVersion((v) => v + 1)}>재연결</button>}</div></div>
          {error && <div className="pixel-frame frame-paper message-dialog" role="alert">{error}</div>}
          {!room || room.phase === 'lobby' ? <RoomScreen {...{ user, room, roomName, setRoomName, command, disabled }} /> : room.phase === 'selecting' ? <SelectionScreen {...{ user, room, roster, focused, setFocusId, command, disabled }} /> : battling ? <BattleScreen {...{ user, room, roster, disabled }} onBack={() => setBattling(false)} onEdit={() => command('team.edit')} /> : <ReadyScreen {...{ user, room, roster, disabled, command }} onStart={() => setBattling(true)} />}
        </>}
      </main>
      <footer className="game-footer"><span>POKÉ ARENA <b>◆</b> FAN GAME</span><a href="/arena/credits.html" target="_blank" rel="noreferrer">제작자 크레딧</a><span>BOT TRAINING · ACTION BATTLE</span></footer>
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
