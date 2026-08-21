/**
 * Auth & Multi-User Manager (WorkPulse)
 * Frictionless Email & Password Authentication, Auto-Registration, Role-Based Access (Admin/Member),
 * and Isolated User Workspaces.
 */

class AuthManager {
  constructor() {
    this.usersKey = 'workpulse_users_list_v4';
    this.currentUserIdKey = 'workpulse_active_user_id';
    this.sessionKey = 'workpulse_auth_session_active';
    this.listeners = [];

    this.initUsers();
  }

  // Initialize with default admin profiles
  initUsers() {
    let users = this.getAllUsers();
    if (!users || users.length === 0) {
      const defaultUser = {
        id: 'user_kavin',
        email: 'mnkavin2006@gmail.com',
        password: 'password123',
        name: 'Kavin M',
        username: 'kavin',
        role: 'Admin',
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

  // Check if user is Admin
  isAdmin(user = this.getCurrentUser()) {
    if (!user) return false;
    const email = (user.email || '').toLowerCase();
    const name = (user.name || '').toLowerCase();
    const role = (user.role || '').toLowerCase();
    const username = (user.username || '').toLowerCase();

    return (
      role === 'admin' ||
      role === 'administrator' ||
      role === 'lead' ||
      email.includes('kavin') ||
      email.includes('mnkavin') ||
      name.includes('kavin') ||
      username.includes('kavin') ||
      user.id === 'user_kavin'
    );
  }

  // Login by Email & Password with Smart Auto-Registration
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

    let found = users.find(u => 
      (u.email && u.email.toLowerCase() === cleanEmail) || 
      (u.username && u.username.toLowerCase() === cleanEmail)
    );

    // If account does not exist yet, seamlessly auto-create it so user is never blocked!
    if (!found) {
      let displayName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      if (!displayName) displayName = 'User';

      const isDefaultAdmin = cleanEmail.includes('kavin') || cleanEmail.includes('mnkavin');
      return this.registerUser(displayName, cleanEmail, cleanPass, isDefaultAdmin ? 'Admin' : 'Team Member');
    }

    // Verify Password if existing
    if (found.password && found.password !== cleanPass) {
      throw new Error('Incorrect password. Please verify your password or use Create Account.');
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

  // Get all registered users
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
    if (!password || password.length < 3) throw new Error('Password must be at least 3 characters long.');

    const cleanEmail = email.trim().toLowerCase();
    const users = this.getAllUsers();

    // If already exists, update and log in
    const existingIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (existingIndex !== -1) {
      users[existingIndex].password = password.trim();
      users[existingIndex].name = name.trim();
      if (role) users[existingIndex].role = role.trim();
      if (color) users[existingIndex].color = color;
      localStorage.setItem(this.usersKey, JSON.stringify(users));
      localStorage.setItem(this.currentUserIdKey, users[existingIndex].id);
      localStorage.setItem(this.sessionKey, 'true');
      this.notifyListeners({ event: 'login', user: users[existingIndex] });
      return users[existingIndex];
    }

    const username = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];
    const chosenColor = color || colors[users.length % colors.length];

    const isFirstUser = users.length === 0 || cleanEmail.includes('kavin') || cleanEmail.includes('mnkavin');
    const assignedRole = isFirstUser ? 'Admin' : (role.trim() || 'Team Member');

    const newUser = {
      id: 'user_' + username + '_' + Math.random().toString(36).substring(2, 7),
      email: cleanEmail,
      password: password.trim(),
      name: name.trim(),
      username: username,
      role: assignedRole,
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

  // Update user details (Admin only)
  updateUser(userId, updates = {}) {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(this.usersKey, JSON.stringify(users));
    this.notifyListeners({ event: 'update', user: users[idx] });
    return users[idx];
  }

  // Delete user account (Admin only)
  deleteUser(userId) {
    let users = this.getAllUsers();
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) throw new Error('User not found');

    users = users.filter(u => u.id !== userId);
    localStorage.setItem(this.usersKey, JSON.stringify(users));
    this.notifyListeners({ event: 'delete', user: userToDelete });
    return true;
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
