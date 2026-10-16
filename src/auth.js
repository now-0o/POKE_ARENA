const KEY = 'poke_arena_token';
export const getToken = () => localStorage.getItem(KEY);
export const clearToken = () => localStorage.removeItem(KEY);
export async function login(username, password) {
  const response = await fetch('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || '로그인하지 못했습니다.');
  if (typeof result.token !== 'string' || !result.user) throw new Error('로그인 응답을 확인해 주세요.');
  localStorage.setItem(KEY, result.token);
  return result.user;
}
