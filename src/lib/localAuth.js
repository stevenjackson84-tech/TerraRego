const USERS_KEY = 'tr_app_users';
const SESSION_KEY = 'tr_app_session';

// Simple obfuscation — not production crypto, suitable for a local demo
function hashPassword(str) {
  return btoa(encodeURIComponent(str + '__tr_2025__'));
}

export function getDomain(email) {
  return email.split('@')[1]?.toLowerCase().trim() || '';
}

export function getOrgName(domain) {
  const base = domain.split('.')[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// ─── User Store ──────────────────────────────────────────────────────────────

export function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ─── Session ─────────────────────────────────────────────────────────────────

export function getSession() {
  try {
    const s = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY + '_persist');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function setSession(user, remember = false) {
  const data = JSON.stringify(user);
  sessionStorage.setItem(SESSION_KEY, data);
  if (remember) {
    localStorage.setItem(SESSION_KEY + '_persist', data);
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY + '_persist');
}

// ─── Auth Actions ─────────────────────────────────────────────────────────────

export function signup({ name, email, password }) {
  const users = getUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some(u => u.email === normalizedEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const domain = getDomain(normalizedEmail);
  // First person from a domain automatically becomes the org admin
  const isFirstInOrg = !users.some(u => getDomain(u.email) === domain);

  const newUser = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    domain,
    role: isFirstInOrg ? 'admin' : 'member',
    joinedAt: new Date().toISOString(),
    status: 'active',
  };

  saveUsers([...users, newUser]);

  const { passwordHash, ...sessionUser } = newUser;
  setSession(sessionUser, false);
  return sessionUser;
}

export function login(email, password, remember = false) {
  const users = getUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email === normalizedEmail);

  if (!user) throw new Error('No account found with that email address.');
  if (user.passwordHash !== hashPassword(password)) throw new Error('Incorrect password.');
  if (user.status === 'suspended') throw new Error('This account has been suspended. Contact your admin.');

  const { passwordHash, ...sessionUser } = user;
  setSession(sessionUser, remember);
  return sessionUser;
}

export function logout() {
  clearSession();
}

// ─── Org Utilities ────────────────────────────────────────────────────────────

export function getOrgMembers(domain) {
  return getUsers()
    .filter(u => getDomain(u.email) === domain)
    .map(({ passwordHash, ...safe }) => safe)
    .sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      return a.name.localeCompare(b.name);
    });
}

export function updateMemberRole(userId, role) {
  const users = getUsers();
  saveUsers(users.map(u => u.id === userId ? { ...u, role } : u));
  // Refresh session if it's the current user
  const session = getSession();
  if (session?.id === userId) {
    setSession({ ...session, role });
  }
}

export function suspendMember(userId) {
  const users = getUsers();
  saveUsers(users.map(u => u.id === userId ? { ...u, status: 'suspended' } : u));
}

export function removeMember(userId) {
  saveUsers(getUsers().filter(u => u.id !== userId));
}
