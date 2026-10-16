import React, { useEffect, useState } from 'react';
import spriteData from './sprites.json';
import { login } from './auth.js';

export const UI = '/arena/ui/';
export const SHOWCASE = [
  { id: 'pikachu', dex: 25, name: '피카츄', types: ['전기'], role: '원거리' },
  { id: 'charizard', dex: 6, name: '리자몽', types: ['불꽃', '비행'], role: '원거리' },
  { id: 'blastoise', dex: 9, name: '거북왕', types: ['물'], role: '방어' },
  { id: 'venusaur', dex: 3, name: '이상해꽃', types: ['풀', '독'], role: '견제' },
  { id: 'gengar', dex: 94, name: '팬텀', types: ['고스트', '독'], role: '기습' },
  { id: 'machamp', dex: 68, name: '괴력몬', types: ['격투'], role: '근접' },
  { id: 'snorlax', dex: 143, name: '잠만보', types: ['노말'], role: '방어' },
  { id: 'lucario', dex: 448, name: '루카리오', types: ['격투', '강철'], role: '근접' },
  { id: 'garchomp', dex: 445, name: '한카리아스', types: ['드래곤', '땅'], role: '돌진' },
  { id: 'gardevoir', dex: 282, name: '가디안', types: ['에스퍼', '페어리'], role: '원거리' },
];
const TYPE_IDS = { 전기: 'electric', 불꽃: 'fire', 비행: 'flying', 물: 'water', 풀: 'grass', 독: 'poison', 고스트: 'ghost', 격투: 'fighting', 노말: 'normal', 강철: 'steel', 드래곤: 'dragon', 땅: 'ground', 에스퍼: 'psychic', 페어리: 'fairy' };

export function Sprite({ pokemon, size = 'card', facing = 'front', still = false }) {
  const info = spriteData[pokemon?.id];
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!info) return;
    setFrame(0);
    if (still || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer;
    let current = 0;
    const advance = () => {
      setFrame(current);
      timer = setTimeout(() => { current = (current + 1) % info.durations.length; advance(); }, Math.max(1, info.durations[current]) * 1000 / 60);
    };
    advance();
    return () => clearTimeout(timer);
  }, [info, still]);
  if (!info) return null;
  return <span className={`sprite sprite-${size} facing-${facing}`} aria-hidden="true"><span style={{
    width: info.width, height: info.height,
    backgroundImage: `url(/arena/sprites/${pokemon.id}/Idle-Anim.png)`,
    backgroundPosition: `${-(frame % info.durations.length) * info.width}px 0`,
    '--sprite-x': `${info.offsetX || 0}px`, '--sprite-y': `${info.offsetY || 0}px`,
  }} /></span>;
}
export function Type({ type }) {
  return <span className="type-tag"><img src={`${UI}type-${TYPE_IDS[type] || 'normal'}.png`} alt="" />{type}</span>;
}
export function GameButton({ children, tone = 'gold', className = '', ...props }) {
  return <button className={`game-button button-${tone} ${className}`} {...props}>{children}</button>;
}
export function BallSlots({ count = 0, total = 3 }) {
  return <span className="ball-slots" aria-label={`${total}마리 중 ${count}마리 선택`}>{Array.from({ length: total }, (_, index) => <img key={index} alt="" src={`${UI}pokeball${index < count ? '' : '-empty'}.png`} />)}</span>;
}
export function Platform({ children, className = '' }) {
  return <div className={`platform ${className}`}><img className="platform-base" src={`${UI}platform.png`} alt="" />{children}</div>;
}
export function Trainer({ name, bot = false, label, children }) {
  return <section className={`trainer-station ${bot ? 'is-cpu' : 'is-player'}`}>
    <div className={`player-ribbon ${bot ? 'cpu-ribbon' : ''}`}><span>{bot ? 'CPU' : '1P'}</span><strong>{name}</strong></div>
    <Platform><img className="trainer-sprite" src={`${UI}${bot ? 'bot' : 'trainer'}.png`} alt={bot ? '연습용 로봇 트레이너' : '빨간 모자의 트레이너'} /></Platform>
    <p className="trainer-status">{label}</p>{children}
  </section>;
}

export function LoginScreen({ onLogin }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try { onLogin(await login(data.get('username').trim(), data.get('password'))); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="title-screen screen-enter">
    <section className="title-art"><p className="pixel-eyebrow">POKÉMON ACTION BATTLE</p>
      <img className="title-logo" src={`${UI}logo.png`} alt="POKÉ ARENA" />
      <h1>세 마리의 파트너.<br />하나의 아레나.</h1>
      <div className="title-pokemon" aria-label="피카츄, 리자몽, 루카리오"><Platform className="title-side"><Sprite pokemon={SHOWCASE[1]} size="hero" /></Platform><Platform className="title-center"><Sprite pokemon={SHOWCASE[0]} size="hero" /></Platform><Platform className="title-side"><Sprite pokemon={SHOWCASE[7]} size="hero" facing="left" /></Platform></div>
      <span className="press-start">YOUR PARTNERS ARE WAITING</span>
    </section>
    <section className="pixel-frame frame-paper login-dialog"><div className="dialog-heading"><img src={`${UI}pokeball.png`} alt="" /><span>트레이너 등록 확인</span></div>
      <p className="dialog-copy">어서 와!<br />포케스톤 계정으로 아레나에 입장하자.</p>
      <form onSubmit={submit}><label htmlFor="login-id">트레이너 ID</label><input id="login-id" name="username" autoComplete="username" maxLength={20} placeholder="아이디를 입력하세요" required disabled={busy} />
        <label htmlFor="login-password">비밀번호</label><input id="login-password" name="password" type="password" autoComplete="current-password" maxLength={200} placeholder="비밀번호를 입력하세요" required disabled={busy} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <GameButton disabled={busy} type="submit">{busy ? '계정 확인 중…' : '▶ 아레나 입장'}</GameButton>
      </form><p className="dialog-note">포케스톤의 기존 아이디 · 비밀번호를 사용해요.</p>
    </section>
  </div>;
}

export function RoomScreen({ user, room, roomName, setRoomName, command, disabled }) {
  return <div className="room-screen screen-enter">
    <section className="room-stage"><div className="stage-nameplate"><span>TRAINING GROUND</span><h2>{room ? room.name : '다음 대결의 시작은 여기서.'}</h2></div>
      <div className="trainer-versus"><Trainer name={user.username} label="준비된 트레이너"><BallSlots /></Trainer><img className="vs-image" src={`${UI}vs.png`} alt="대" /><Trainer name="연습 봇" bot label={room ? '입장 대기 중' : '너의 도전을 기다리고 있어!'}><BallSlots /></Trainer></div>
      <div className="pixel-frame stage-dialog"><img src={`${UI}pokeball.png`} alt="" /><p>{room ? '상대는 연습 봇! 준비됐다면 함께할 포켓몬을 고르자.' : '연습방을 만들고 나만의 포켓몬 팀을 준비해 보자!'}</p><span className="dialog-triangle">▼</span></div>
    </section>
    <section className="pixel-frame frame-gold room-menu"><div className="menu-tab">{room ? 'ROOM STANDBY' : 'CREATE ROOM'}</div><p className="pixel-eyebrow">{room ? 'BOT TRAINING' : 'BATTLE LOBBY'}</p><h1>{room ? '대결 준비!' : '연습방 만들기'}</h1>
      <div className="mode-ticket"><img src={`${UI}bot.png`} alt="" /><div><strong>봇 트레이닝</strong><p>플레이어 1명 + 연습 봇</p></div><span>1 VS 1</span></div>
      {room ? <><div className="room-info"><span>방 이름</span><strong>{room.name}</strong><span>팀 구성</span><strong>각자 포켓몬 3마리</strong><span>선택 가능</span><strong>포켓몬 10종</strong></div><GameButton disabled={disabled} onClick={() => command('bot.start')}>▶ 포켓몬 선택으로</GameButton><GameButton tone="blue" disabled={disabled} onClick={() => command('room.leave')}>방 나가기</GameButton></>
        : <form onSubmit={(event) => { event.preventDefault(); command('room.create', { name: roomName.trim() }); }}><label htmlFor="room-name">방 이름</label><input id="room-name" value={roomName} onChange={(event) => setRoomName(event.target.value)} maxLength={24} required disabled={disabled} placeholder="연습방 이름을 입력하세요" /><div className="rule-ticket"><span>룰</span><p>10종 중 3마리 선택<br />같은 팀 중복 선택 불가</p></div><GameButton type="submit" disabled={disabled || !roomName.trim()}>▶ 연습방 만들기</GameButton></form>}
      <p className="menu-note">현재 버전은 포켓몬 팀 선택까지 진행돼요.</p>
    </section>
  </div>;
}

function FighterPreview({ pokemon, user, cpu = false }) {
  return <section className={`fighter-preview ${cpu ? 'cpu-preview' : ''}`}>
    <div className={`player-ribbon ${cpu ? 'cpu-ribbon' : ''}`}><span>{cpu ? 'CPU' : '1P'}</span><strong>{cpu ? '연습 봇' : user.username}</strong></div>
    <Platform>{cpu ? <span className="mystery-fighter">?<small>HIDDEN TEAM</small></span> : <Sprite pokemon={pokemon} size="hero" />}</Platform>
    <div className={`pixel-frame ${cpu ? 'frame-red' : 'frame-cyan'} fighter-description`}>{cpu ? <><span className="fighter-number">OPPONENT</span><h2>어떤 팀이 기다릴까?</h2><p>네 팀을 확정하면<br />봇의 포켓몬이 공개돼!</p><BallSlots /></> : pokemon && <><span className="fighter-number">NO. {String(pokemon.dex).padStart(3, '0')}</span><h2>{pokemon.name}</h2><div className="fighter-types">{pokemon.types.map((type) => <Type type={type} key={type} />)}</div><p className="fighter-role"><span>플레이 스타일</span><strong>{pokemon.role}</strong></p></>}</div>
  </section>;
}

export function SelectionScreen({ user, room, roster, focused, setFocusId, command, disabled }) {
  const team = room.team;
  const byId = (id) => roster.find((pokemon) => pokemon.id === id);
  const choose = (id) => {
    if (disabled) return;
    const index = team.indexOf(id);
    if (index < 0 && team.length >= 3) return;
    command('team.select', { team: index >= 0 ? team.filter((entry) => entry !== id) : [...team, id] });
  };
  useEffect(() => {
    function keydown(event) {
      if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable || event.ctrlKey || event.altKey || event.metaKey) return;
      const index = Math.max(0, roster.findIndex((pokemon) => pokemon.id === focused?.id));
      const directions = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 };
      if (event.key in directions) {
        event.preventDefault();
        const next = roster[(index + directions[event.key] + roster.length) % roster.length];
        if (next) setFocusId(next.id);
      } else if (['z', 'Z'].includes(event.key) && !event.repeat && focused && !team.includes(focused.id)) {
        event.preventDefault(); choose(focused.id);
      } else if (['x', 'X'].includes(event.key) && !event.repeat && focused && team.includes(focused.id)) {
        event.preventDefault(); choose(focused.id);
      }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [roster, focused, team, disabled, command]);
  return <div className="selection-screen screen-enter"><div className="select-title"><span className="pixel-eyebrow">CHOOSE YOUR PARTNERS</span><h1>포켓몬을 선택하라!</h1><p>함께 싸울 세 마리를 골라 팀을 완성하세요.</p></div>
    <div className="character-select"><FighterPreview pokemon={focused} user={user} /><section className="pixel-frame roster-panel"><div className="roster-heading"><span>CHARACTER SELECT</span><BallSlots count={team.length} /></div><div className="roster-grid" aria-label="선택 가능한 포켓몬">{roster.map((pokemon) => {
      const index = team.indexOf(pokemon.id); const isFocused = focused?.id === pokemon.id;
      return <button key={pokemon.id} className={`roster-card ${index >= 0 ? 'picked' : ''} ${isFocused ? 'focused' : ''} ${team.length === 3 && index < 0 ? 'team-full' : ''}`} aria-pressed={index >= 0} aria-label={`${pokemon.name}${index >= 0 ? `, ${index + 1}번 슬롯 선택됨` : ''}`} disabled={disabled} onMouseEnter={() => setFocusId(pokemon.id)} onFocus={() => setFocusId(pokemon.id)} onClick={() => choose(pokemon.id)}>
        <span className="roster-dex">{String(pokemon.dex).padStart(3, '0')}</span><Sprite pokemon={pokemon} size="card" still />
        <strong>{pokemon.name}</strong><img className="roster-type" src={`${UI}type-${TYPE_IDS[pokemon.types[0]] || 'normal'}.png`} alt={pokemon.types[0]} />
        {index >= 0 && <span className="pick-number">{index + 1}</span>}{isFocused && <span className="pixel-cursor" aria-hidden="true" />}
      </button>;
    })}</div><p className="roster-instruction"><img src={`${UI}pokeball.png`} alt="" />{team.length === 3 ? '팀 완성! 아래에서 선발을 정하고 확정하세요.' : `파트너를 ${3 - team.length}마리 더 선택하세요.`}</p></section><FighterPreview user={user} cpu /></div>
    <section className="pixel-frame frame-gold squad-panel"><div className="squad-label"><span>PLAYER 1</span><h2>나의 출전 팀</h2><strong>{team.length}<small> / 3</small></strong></div><div className="squad-slots">{[0, 1, 2].map((index) => {
      const pokemon = byId(team[index]);
      return <div key={index} className={`squad-slot ${pokemon ? 'has-pokemon' : ''}`}><span className="slot-tag">{index === 0 ? '선발' : `교체 ${index}`}</span>{pokemon ? <><Sprite pokemon={pokemon} size="slot" /><div className="slot-details"><strong>{pokemon.name}</strong>{index > 0 && <button disabled={disabled} className="lead-button" onClick={() => command('team.select', { team: [pokemon.id, ...team.filter((id) => id !== pokemon.id)] })}>선발로</button>}</div><button className="remove-pokemon" aria-label={`${pokemon.name} 선택 해제`} disabled={disabled} onClick={() => choose(pokemon.id)}>×</button></> : <div className="empty-slot"><img src={`${UI}pokeball-empty.png`} alt="" /><span>파트너 선택</span></div>}</div>;
    })}</div><div className="squad-confirm"><p>첫 번째 포켓몬이 선발!</p><GameButton disabled={disabled || team.length !== 3} onClick={() => command('team.confirm')}>이 팀으로 확정 ▶</GameButton></div></section>
    <div className="select-controls"><button className="back-link" disabled={disabled} onClick={() => command('room.leave')}>◀ 연습방 나가기</button><p><kbd>방향키</kbd> 이동 <kbd>Z</kbd> 선택 <kbd>X</kbd> 해제 <span>· 마우스로도 선택 가능</span></p></div>
  </div>;
}

export function ReadyScreen({ user, room, roster, disabled, command }) {
  const byId = (id) => roster.find((pokemon) => pokemon.id === id);
  return <section className="ready-screen screen-enter"><div className="select-title"><span className="pixel-eyebrow">TEAM SELECTION COMPLETE</span><h1>TEAM READY!</h1><p>세 마리의 파트너, 출전 준비 완료!</p></div><div className="ready-matchup">{[{ name: user.username, ids: room.team, cpu: false }, { name: '연습 봇', ids: room.botTeam, cpu: true }].map((side) => <section className={`pixel-frame ${side.cpu ? 'frame-red' : 'frame-cyan'} ready-side`} key={side.cpu ? 'cpu' : 'player'}><div className={`player-ribbon ${side.cpu ? 'cpu-ribbon' : ''}`}><span>{side.cpu ? 'CPU' : '1P'}</span><strong>{side.name}</strong></div><div className="ready-lineup">{side.ids.map((id, index) => <div className={index === 0 ? 'ready-lead' : ''} key={id}><Platform><Sprite pokemon={byId(id)} size={index === 0 ? 'hero' : 'slot'} /></Platform><strong>{byId(id)?.name}</strong><span>{index === 0 ? '선발 포켓몬' : `교체 ${index}`}</span></div>)}</div></section>)}<img className="ready-vs" src={`${UI}vs.png`} alt="대" /></div><div className="pixel-frame frame-paper ready-dialog"><img src={`${UI}pokeball.png`} alt="" /><p>팀 선택 테스트 완료!<br /><span>실시간 전투는 다음 업데이트에서 이어집니다.</span></p></div><div className="ready-actions"><GameButton tone="blue" disabled={disabled} onClick={() => command('room.leave')}>연습방으로</GameButton><GameButton disabled={disabled} onClick={() => command('team.edit')}>팀 다시 고르기 ▶</GameButton></div></section>;
}
