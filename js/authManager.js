/**
 * Auth & Multi-User Manager (WorkPulse)
 * Handles user profiles, authentication, user switching, and separate data workspaces.
 */

class AuthManager {
  constructor() {
    this.usersKey = 'workpulse_users_list';
    this.currentUserIdKey = 'workpulse_active_user_id';
    this.listeners = [];

    this.initUsers();
  }

  // Initialize with default profiles
  initUsers() {
    let users = this.getAllUsers();
    if (!users || users.length === 0) {
      const defaultUser = {
        id: 'user_kavin',
        username: 'kavin',
        name: 'Kavin',
        email: 'kavin@office.com',
        role: 'Developer',
        color: '#3b82f6', // blue
        avatar: 'K',
        createdAt: '2026-08-01T00:00:00Z'
      };
      users = [defaultUser];
      localStorage.setItem(this.usersKey, JSON.stringify(users));
      localStorage.setItem(this.currentUserIdKey, defaultUser.id);
    }
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

  // Get active logged-in user
  getCurrentUser() {
    const users = this.getAllUsers();
    const activeId = localStorage.getItem(this.currentUserIdKey);
    const found = users.find(u => u.id === activeId);
    return found || users[0] || {
      id: 'user_guest',
      username: 'guest',
      name: 'Guest User',
      email: '',
      role: 'Member',
      color: '#64748b',
      avatar: 'G'
    };
  }

  // Switch active user
  switchUser(userId) {
    const users = this.getAllUsers();
    const user = users.find(u => u.id === userId || u.username.toLowerCase() === userId.toLowerCase());
    if (user) {
      localStorage.setItem(this.currentUserIdKey, user.id);
      this.notifyListeners(user);
      return user;
    }
    throw new Error('User not found.');
  }

  // Register / Add new friend or user profile
  registerUser(name, username, role = 'Team Member', email = '', color = null) {
    if (!name || !name.trim()) throw new Error('Please enter a display name.');
    if (!username || !username.trim()) throw new Error('Please enter a username.');

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
    const users = this.getAllUsers();

    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Username "${cleanUsername}" is already taken. Please choose another.`);
    }

    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];
    const chosenColor = color || colors[users.length % colors.length];

    const newUser = {
      id: 'user_' + cleanUsername + '_' + Math.random().toString(36).substring(2, 6),
      username: cleanUsername,
      name: name.trim(),
      email: email ? email.trim() : `${cleanUsername}@office.com`,
      role: role.trim() || 'Team Member',
      color: chosenColor,
      avatar: name.trim().charAt(0).toUpperCase(),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(this.usersKey, JSON.stringify(users));

    // Automatically switch to new user
    localStorage.setItem(this.currentUserIdKey, newUser.id);
    this.notifyListeners(newUser);

    return newUser;
  }

  // Delete user profile
  deleteUser(userId) {
    let users = this.getAllUsers();
    if (users.length <= 1) {
      throw new Error('Cannot delete the only user profile.');
    }

    users = users.filter(u => u.id !== userId);
    localStorage.setItem(this.usersKey, JSON.stringify(users));

    if (localStorage.getItem(this.currentUserIdKey) === userId) {
      localStorage.setItem(this.currentUserIdKey, users[0].id);
      this.notifyListeners(users[0]);
    }
    return true;
  }

  // Listen to user switch events
  onUserChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(user) {
    this.listeners.forEach(cb => {
      try { cb(user); } catch (e) { console.error('User listener error:', e); }
    });
  }
}

window.authManager = new AuthManager();
