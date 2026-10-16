import { getToken } from './auth.js';

// HTTP auth uses the existing /api proxy. WebSocket needs a direct WSS endpoint
// when that proxy does not support Upgrade (e.g. the current Netlify redirect).
export function arenaSocketUrl() {
  const configured = import.meta.env.VITE_ARENA_WS_URL;
  if (configured) {
    const url = new URL(configured);
    if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.search) {
      throw new Error('배틀 서버 주소 설정을 확인해 주세요.');
    }
    if (window.location.protocol === 'https:' && url.protocol !== 'wss:') {
      throw new Error('HTTPS에서는 보안 연결된 배틀 서버 주소가 필요합니다.');
    }
    return url.href;
  }
  if (window.location.protocol === 'https:') throw new Error('배틀 서버 연결 주소를 설정해 주세요.');
  return `ws://${window.location.host}/api/arena/ws`;
}

export async function checkArenaAccount() {
  const response = await fetch('/api/arena/me', {
    headers: { Authorization: `Bearer ${getToken()}` }, cache: 'no-store',
  });
  if (!response.ok) {
    const error = new Error(response.status === 401 ? '다시 로그인해 주세요.' : '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    error.status = response.status;
    throw error;
  }
  return (await response.json()).user;
}

export class ArenaConnection {
  constructor(onEvent, onStatus) {
    this.onEvent = onEvent;
    this.onStatus = onStatus;
    this.closed = false;
    this.attempt = 0;
    this.sequence = 0;
    this.pending = new Map();
    this.connect();
  }
  connect() {
    if (this.closed) return;
    this.onStatus('connecting');
    let socket;
    try { socket = new WebSocket(arenaSocketUrl()); } catch (error) {
      this.onStatus('offline', error.message);
      return;
    }
    this.socket = socket;
    this.authenticated = false;
    const timeout = setTimeout(() => socket.close(), 10_000);
    socket.onopen = () => socket.send(JSON.stringify({ event: 'auth', token: getToken() }));
    socket.onmessage = ({ data }) => {
      let packet;
      try { packet = JSON.parse(data); } catch { return; }
      if (packet.event === 'authenticated') {
        clearTimeout(timeout);
        this.authenticated = true;
        this.attempt = 0;
        this.onStatus('online');
      }
      const pending = this.pending.get(packet.requestId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(packet.requestId);
        if (packet.event === 'error') pending.reject(new Error(packet.message));
        else pending.resolve(packet);
      }
      this.onEvent(packet);
      if (packet.code === 'unauthorized') {
        this.closed = true;
        socket.close();
      }
    };
    socket.onerror = () => {}; // close handles retries and user-facing status
    socket.onclose = ({ code }) => {
      clearTimeout(timeout);
      this.authenticated = false;
      this.rejectPending('연결이 끊겼습니다. 다시 연결한 뒤 시도해 주세요.');
      if (this.closed) return;
      if (code === 4001 || code === 4003) {
        this.closed = true;
        this.onStatus('offline', code === 4001 ? '다른 창에서 아레나를 열었습니다. 이 창을 새로고침하면 다시 접속합니다.' : '다시 로그인해 주세요.');
        return;
      }
      this.attempt += 1;
      if (this.attempt > 4) {
        this.onStatus('offline', '배틀 서버에 연결하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.');
        return;
      }
      this.onStatus('reconnecting');
      this.retryTimer = setTimeout(() => this.connect(), Math.min(this.attempt * 1000, 4000));
    };
  }
  request(event, payload = {}) {
    if (!this.authenticated || this.socket?.readyState !== WebSocket.OPEN) return Promise.reject(new Error('배틀 서버 연결을 기다려 주세요.'));
    const requestId = String(++this.sequence);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('응답이 늦어지고 있습니다. 서버 상태를 다시 확인합니다.'));
        if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ event: 'room.resume' }));
      }, 8000);
      this.pending.set(requestId, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ event, requestId, ...payload }));
    });
  }
  rejectPending(message) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer); pending.reject(new Error(message));
    }
    this.pending.clear();
  }
  close() {
    this.closed = true;
    clearTimeout(this.retryTimer);
    this.rejectPending('연결을 종료했습니다.');
    this.socket?.close();
  }
}
