const TOKEN_KEY = "clickup_api_token";

export function getClickUpToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function setClickUpToken(token) {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearClickUpToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isClickUpConnected() {
  return !!getClickUpToken();
}
