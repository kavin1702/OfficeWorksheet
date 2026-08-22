/**
 * Authentication & User Management Service (WorkPulse)
 * Handles Email/Password authentication, user session persistence,
 * strict Admin (mnkavin2006@gmail.com) vs Team Member (kavin@8chili.com) role enforcement,
 * and user switching.
 */

class AuthManager {
  constructor() {
    this.sessionKey = 'workpulse_session_logged_in';
    this.currentUserIdKey = 'workpulse_current_user_id';
    this.usersKey = 'workpulse_registered_users';
    this.listeners = [];
    this.initUsers();
  }

  // Initialize with strict Admin (mnkavin2006@gmail.com) and User (kavin@8chili.com)
  initUsers() {
    let users = this.getAllUsers();
    if (!users || users.length === 0) {
      const adminUser = {
        id: 'user_admin_mnkavin',
        email: 'mnkavin2006@gmail.com',
        password: 'password123',
        name: 'Kavin M (Admin)',
        username: 'mnkavin',
        role: 'Admin',
        color: '#f59e0b',
        avatar: 'K',
        createdAt: '2026-08-01T00:00:00Z'
      };
      const memberUser = {
        id: 'user_8chili_kavin',
        email: 'kavin@8chili.com',
        password: 'password123',
        name: 'Kavin (8chili)',
        username: 'kavin8chili',
        role: 'Team Member',
        color: '#3b82f6',
        avatar: 'K',
        createdAt: '2026-08-01T00:00:00Z'
      };
      users = [adminUser, memberUser];
      localStorage.setItem(this.usersKey, JSON.stringify(users));
      localStorage.setItem(this.currentUserIdKey, memberUser.id);
      localStorage.setItem(this.sessionKey, 'true');
    } else {
      // Enforce strict roles on existing stored accounts
      let changed = false;
      users.forEach(u => {
        const em = (u.email || '').toLowerCase().trim();
        if (em === 'mnkavin2006@gmail.com' && u.role !== 'Admin') {
          u.role = 'Admin';
          changed = true;
        } else if (em === 'kavin@8chili.com' && u.role !== 'Team Member') {
          u.role = 'Team Member';
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(this.usersKey, JSON.stringify(users));
      }
      if (!localStorage.getItem(this.currentUserIdKey)) {
        localStorage.setItem(this.currentUserIdKey, 'user_8chili_kavin');
      }
    }
  }

  // Check if session is logged in - Auto-login enabled by default
  isLoggedIn() {
    const session = localStorage.getItem(this.sessionKey);
    if (session === 'false') return false;
    
    // Default to true and make sure kavin@8chili.com is active
    if (!session) {
      localStorage.setItem(this.sessionKey, 'true');
      if (!localStorage.getItem(this.currentUserIdKey)) {
        localStorage.setItem(this.currentUserIdKey, 'user_8chili_kavin');
      }
    }
    const activeUser = this.getCurrentUser();
    return !!activeUser;
  }

  // Check if user is Admin - STRICT: ONLY mnkavin2006@gmail.com or role 'Admin' (NOT kavin@8chili.com)
  isAdmin(user = this.getCurrentUser()) {
    if (!user) return false;
    const email = (user.email || '').toLowerCase().trim();
    
    // Explicit: Only mnkavin2006@gmail.com is Admin
    if (email === 'mnkavin2006@gmail.com') return true;

    // Explicit: kavin@8chili.com is NEVER an Admin
    if (email === 'kavin@8chili.com') return false;

    // Check explicit role
    return user.role === 'Admin' || user.role === 'Administrator';
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

    // If account does not exist yet, auto-create it with proper role
    if (!found) {
      let displayName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      if (!displayName) displayName = 'User';

      const isDefaultAdmin = cleanEmail === 'mnkavin2006@gmail.com';
      return this.registerUser(displayName, cleanEmail, cleanPass, isDefaultAdmin ? 'Admin' : 'Team Member');
    }

    // Verify Password if existing - with self-healing for owner accounts
    if (found.password && found.password !== cleanPass) {
      if (cleanEmail === 'kavin@8chili.com' || cleanEmail === 'mnkavin2006@gmail.com' || found.password === 'password123') {
        found.password = cleanPass;
        localStorage.setItem(this.usersKey, JSON.stringify(users));
      } else {
        throw new Error('Incorrect password. Click "Forgot Password?" below to reset it in 1 second.');
      }
    }

    localStorage.setItem(this.currentUserIdKey, found.id);
    localStorage.setItem(this.sessionKey, 'true');
    this.notifyListeners({ event: 'login', user: found });
    return found;
  }

  // Reset Password for any user account
  resetPassword(email, newPassword) {
    if (!email || !email.trim()) throw new Error('Please enter your email address.');
    if (!newPassword || !newPassword.trim()) throw new Error('Please enter your new password.');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = newPassword.trim();
    const users = this.getAllUsers();

    let found = users.find(u => 
      (u.email && u.email.toLowerCase() === cleanEmail) || 
      (u.username && u.username.toLowerCase() === cleanEmail)
    );

    if (!found) {
      let displayName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      const isDefaultAdmin = cleanEmail === 'mnkavin2006@gmail.com';
      return this.registerUser(displayName, cleanEmail, cleanPass, isDefaultAdmin ? 'Admin' : 'Team Member');
    }

    found.password = cleanPass;
    localStorage.setItem(this.usersKey, JSON.stringify(users));
    localStorage.setItem(this.currentUserIdKey, found.id);
    localStorage.setItem(this.sessionKey, 'true');
    this.notifyListeners({ event: 'login', user: found });
    return found;
  }

  // Register New User
  registerUser(name, email, password, role = 'Team Member', color = '#3b82f6') {
    if (!name || !name.trim()) throw new Error('Please enter a display name.');
    if (!email || !email.trim()) throw new Error('Please enter an email address.');
    if (!password || !password.trim()) throw new Error('Please enter a password.');

    const cleanEmail = email.trim().toLowerCase();
    const users = this.getAllUsers();

    if (users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    // Strict role check
    const finalRole = (cleanEmail === 'mnkavin2006@gmail.com') ? 'Admin' : (cleanEmail === 'kavin@8chili.com' ? 'Team Member' : role);

    const newUser = {
      id: 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      username: cleanEmail.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase(),
      email: cleanEmail,
      password: password.trim(),
      role: finalRole,
      color: color || '#3b82f6',
      avatar: name.trim().charAt(0).toUpperCase(),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(this.usersKey, JSON.stringify(users));
    localStorage.setItem(this.currentUserIdKey, newUser.id);
    localStorage.setItem(this.sessionKey, 'true');

    this.notifyListeners({ event: 'register', user: newUser });
    return newUser;
  }

  // Update existing user profile
  updateUser(id, updates) {
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');

    // Never demote mnkavin2006@gmail.com, never promote kavin@8chili.com
    if (users[index].email === 'mnkavin2006@gmail.com') {
      updates.role = 'Admin';
    } else if (users[index].email === 'kavin@8chili.com') {
      updates.role = 'Team Member';
    }

    users[index] = { ...users[index], ...updates };
    localStorage.setItem(this.usersKey, JSON.stringify(users));
    this.notifyListeners({ event: 'update', user: users[index] });
    return users[index];
  }

  // Delete user profile
  deleteUser(id) {
    let users = this.getAllUsers();
    const target = users.find(u => u.id === id);
    if (target && target.email === 'mnkavin2006@gmail.com') {
      throw new Error('Cannot delete primary Admin account.');
    }

    users = users.filter(u => u.id !== id);
    localStorage.setItem(this.usersKey, JSON.stringify(users));

    if (localStorage.getItem(this.currentUserIdKey) === id) {
      if (users.length > 0) {
        localStorage.setItem(this.currentUserIdKey, users[0].id);
      } else {
        this.logout();
      }
    }
    this.notifyListeners({ event: 'delete', userId: id });
  }

  // Get current active user
  getCurrentUser() {
    const users = this.getAllUsers();
    const activeId = localStorage.getItem(this.currentUserIdKey);
    if (activeId) {
      const found = users.find(u => u.id === activeId);
      if (found) return found;
    }
    return users.length > 0 ? users[0] : null;
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

  // Switch to another registered account
  switchUser(userId) {
    const users = this.getAllUsers();
    const target = users.find(u => u.id === userId);
    if (!target) throw new Error('Target user account not found');

    localStorage.setItem(this.currentUserIdKey, target.id);
    localStorage.setItem(this.sessionKey, 'true');
    this.notifyListeners({ event: 'switch', user: target });
    return target;
  }

  // Log Out Current Session
  logout() {
    localStorage.setItem(this.sessionKey, 'false');
    this.notifyListeners({ event: 'logout', user: null });
  }

  // Subscribe to auth state changes
  onUserChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notifyListeners(data) {
    this.listeners.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error('Auth listener error:', err);
      }
    });
  }
}

window.authManager = new AuthManager();
