import { User, UserRole } from '@/shared/types';

const AUTH_STORAGE_KEY = 'workpulse_current_user';

export const PRESET_USERS: User[] = [
  {
    id: 'user-admin-1',
    email: 'mnkavin2006@gmail.com',
    name: 'M.N. Kavin (Admin)',
    role: 'ADMIN',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=mnkavin&backgroundColor=3b82f6',
    department: 'Core Operations & Lead',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'user-kavin-8chili',
    email: 'kavin@8chili.com',
    name: 'Kavin (8chili)',
    role: 'TEAM_MEMBER',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=kavin8chili&backgroundColor=10b981',
    department: 'VR Simulations & Engineering',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

export class AuthService {
  private static currentUser: User | null = null;

  static getCurrentUser(): User {
    if (this.currentUser) return this.currentUser;

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          this.currentUser = JSON.parse(saved);
          return this.currentUser!;
        }
      } catch (e) {
        console.warn('Failed to parse saved user from localStorage', e);
      }
    }

    // Default user is Kavin (Admin)
    this.currentUser = PRESET_USERS[0];
    return this.currentUser;
  }

  static setCurrentUser(user: User): void {
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('workpulse:auth-change', { detail: user }));
      } catch (e) {
        console.error('Failed to save user to localStorage', e);
      }
    }
  }

  static switchUserByEmail(email: string): User {
    const user = PRESET_USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) || {
      id: `user-${Date.now()}`,
      email,
      name: email.split('@')[0],
      role: (email.includes('admin') || email === 'mnkavin2006@gmail.com') ? 'ADMIN' : 'TEAM_MEMBER',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}&backgroundColor=6366f1`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.setCurrentUser(user);
    return user;
  }

  static isAdmin(user?: User | null): boolean {
    const u = user || this.getCurrentUser();
    return u?.role === 'ADMIN';
  }

  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    this.currentUser = PRESET_USERS[0];
    window.dispatchEvent(new CustomEvent('workpulse:auth-change', { detail: this.currentUser }));
  }
}
