(function () {
  const KEYS = {
    session: "shopscript.session",
    pages: "shopscript.pages",
    users: "shopscript.users"
  };

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getSession() {
    return readJson(KEYS.session, null);
  }

  function setSession(session) {
    writeJson(KEYS.session, session);
  }

  function clearSession() {
    localStorage.removeItem(KEYS.session);
  }

  function getUsers() {
    return readJson(KEYS.users, []);
  }

  function saveUser(user) {
    const users = getUsers();
    const existing = users.find((item) => item.email.toLowerCase() === user.email.toLowerCase());
    if (existing) return { ok: false, reason: "A local user already exists for this email." };
    const nextUser = {
      ...user,
      userId: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    writeJson(KEYS.users, [nextUser, ...users]);
    return { ok: true, user: nextUser };
  }

  function findUser(email, accessCode) {
    return getUsers().find((user) =>
      user.email.toLowerCase() === String(email).toLowerCase() &&
      user.accessCode === accessCode
    ) || null;
  }

  function getPages() {
    return readJson(KEYS.pages, []);
  }

  function savePage(page) {
    const pages = getPages();
    const nextPage = {
      ...page,
      id: page.id || crypto.randomUUID(),
      savedAt: page.savedAt || new Date().toISOString()
    };
    writeJson(KEYS.pages, [nextPage, ...pages].slice(0, 12));
    return nextPage;
  }

  window.ShopScriptStorage = {
    KEYS,
    getSession,
    setSession,
    clearSession,
    getUsers,
    saveUser,
    findUser,
    getPages,
    savePage
  };
})();
