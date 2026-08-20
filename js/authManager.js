/**
 * Auth & Multi-User Manager (WorkPulse)
 * Secure Email & Password Authentication, User Isolation, and Session Management.
 */

class AuthManager {
  constructor() {
    this.usersKey = 'workpulse_users_list_v2';
    this.currentUserIdKey = 'workpulse_active_user_id';
    this.sessionKey = 'workpulse_auth_session_active';
    this.listeners = [];

    this.initUsers();
  }

  // Initialize with default admin profile if empty
  initUsers() {
    let users = this.getAllUsers();
    if (!users || users.length === 0) {
      const defaultUser = {
        id: 'user_kavin',
        email: 'kavin@office.com',
        password: 'password123',
        name: 'Kavin',
        username: 'kavin',
        role: 'Developer',
        color: '#3b82f6',
        avatar: 'K',
        createdAt: '2026-08-01T00:00:00Z'
      };
      users = [defaultUser];
      localStorage.setItem(this.usersKey, JSON.stringify(users));
      localStorage.setItem(this.currentUserIdKey, defaultUser.id);
    }
  }

  // Check if session is logged in
  isLoggedIn() {
    const session = localStorage.getItem(this.sessionKey);
    const activeUser = this.getCurrentUser();
    return session === 'true' && !!activeUser;
  }

  // Login by Email & Password
  login(email, password) {
    if (!email || !email.trim()) {
      throw new Error('Please enter your email address.');
    }
    if (!password || !password.trim()) {
      throw new Error('Please enter your password.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const users = this.getAllUsers();

    const found = users.find(u => 
      u.email.toLowerCase() === cleanEmail || 
      (u.username && u.username.toLowerCase() === cleanEmail)
    );

    if (!found) {
      throw new Error('No account found with this email address. Please click Create Account.');
    }

    if (found.password && found.password !== cleanPass) {
      throw new Error('Incorrect password. Please check and try again.');
    }

    localStorage.setItem(this.currentUserIdKey, found.id);
    localStorage.setItem(this.sessionKey, 'true');
    this.notifyListeners({ event: 'login', user: found });
    return found;
  }

  // Logout
  logout() {
    localStorage.setItem(this.sessionKey, 'false');
    this.notifyListeners({ event: 'logout', user: null });
  }

  // Get all users
  getAllUsers() {
    try {
      const data = localStorage.getItem(this.usersKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // Get current active user
  getCurrentUser() {
    const users = this.getAllUsers();
    const activeId = localStorage.getItem(this.currentUserIdKey);
    const found = users.find(u => u.id === activeId);
    return found || users[0] || null;
  }

  // Register New User with Email & Password
  registerUser(name, email, password, role = 'Team Member', color = null) {
    if (!name || !name.trim()) throw new Error('Please enter your full name.');
    if (!email || !email.trim()) throw new Error('Please enter your email address.');
    if (!password || password.length < 4) throw new Error('Password must be at least 4 characters long.');

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. name@example.com).');
    }

    const users = this.getAllUsers();
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error(`An account with email "${cleanEmail}" already exists. Please Sign In.`);
    }

    const username = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];
    const chosenColor = color || colors[users.length % colors.length];

    const newUser = {
      id: 'user_' + username + '_' + Math.random().toString(36).substring(2, 7),
      email: cleanEmail,
      password: password.trim(),
      name: name.trim(),
      username: username,
      role: role.trim() || 'Team Member',
      color: chosenColor,
      avatar: name.trim().charAt(0).toUpperCase(),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(this.usersKey, JSON.stringify(users));

    // Automatically set as active user & log in
    localStorage.setItem(this.currentUserIdKey, newUser.id);
    localStorage.setItem(this.sessionKey, 'true');
    this.notifyListeners({ event: 'register', user: newUser });

    return newUser;
  }

  // Switch user
  switchUser(userId) {
    const users = this.getAllUsers();
    const user = users.find(u => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (user) {
      localStorage.setItem(this.currentUserIdKey, user.id);
      localStorage.setItem(this.sessionKey, 'true');
      this.notifyListeners({ event: 'switch', user });
      return user;
    }
    throw new Error('User account not found.');
  }

  onUserChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(payload) {
    this.listeners.forEach(cb => {
      try { cb(payload); } catch (e) { console.error('Auth listener error:', e); }
    });
  }
}

window.authManager = new AuthManager();
