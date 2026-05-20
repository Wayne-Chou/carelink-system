const USERS_KEY = "users";
const CURRENT_USER_KEY = "currentUser";

export function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser() {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentUser(user) {
  localStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
  );
}

export function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function isAuthenticated() {
  return !!getCurrentUser();
}

export function resolveRole(email) {
  return String(email).toLowerCase().includes("admin") ? "admin" : "user";
}

export function register({ name, email, password }) {
  const users = getUsers();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (users.some((u) => String(u.email).trim().toLowerCase() === normalizedEmail)) {
    return { ok: false, error: "此 Email 已被註冊" };
  }
  const user = {
    id: Date.now(),
    name: String(name).trim(),
    email: normalizedEmail,
    password,
    role: resolveRole(normalizedEmail),
  };
  users.push(user);
  saveUsers(users);
  setCurrentUser(user);
  return { ok: true, user };
}

export function login({ email, password }) {
  const users = getUsers();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.find(
    (u) =>
      String(u.email).trim().toLowerCase() === normalizedEmail && u.password === password
  );
  if (!user) {
    return { ok: false, error: "Email 或密碼錯誤" };
  }
  setCurrentUser(user);
  return { ok: true, user };
}
