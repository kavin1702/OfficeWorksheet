'use client';

import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { AuthService, PRESET_USERS } from '../auth.service';
import { User, UserRole } from '@/shared/types';
import { ShieldCheck, UserCheck, LogIn, Sparkles, Building, Mail } from 'lucide-react';
import { useToast } from '@/shared/components/ui/ToastProvider';

interface AuthPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChanged: (user: User) => void;
  currentUser: User;
}

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  isOpen,
  onClose,
  onUserChanged,
  currentUser
}) => {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState<UserRole>('TEAM_MEMBER');
  const { addToast } = useToast();

  const handleSelectPreset = (user: User) => {
    AuthService.setCurrentUser(user);
    onUserChanged(user);
    addToast({
      title: 'Profile Switched',
      message: `Active session changed to ${user.name} (${user.role})`,
      type: 'success'
    });
    onClose();
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) {
      addToast({ title: 'Validation Error', message: 'Email address is required', type: 'error' });
      return;
    }
    const newUser: User = {
      id: `usr-${Date.now()}`,
      email: customEmail.trim(),
      name: customName.trim() || customEmail.split('@')[0],
      role: customRole,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(customEmail)}&backgroundColor=8b5cf6`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    AuthService.setCurrentUser(newUser);
    onUserChanged(newUser);
    addToast({
      title: 'Signed In',
      message: `Welcome, ${newUser.name}!`,
      type: 'success'
    });
    setCustomEmail('');
    setCustomName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Authentication & Profile Switching" size="md">
      <div className="space-y-6">
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
            Quick Switch Profiles
          </label>
          <div className="grid grid-cols-1 gap-3">
            {PRESET_USERS.map((user) => {
              const isSelected = currentUser.email.toLowerCase() === user.email.toLowerCase();
              return (
                <div
                  key={user.id}
                  onClick={() => handleSelectPreset(user)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</span>
                        {user.role === 'ADMIN' ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Team
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2.5 py-1 rounded-lg">
                      Active
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">Or Sign In with Custom Email</span>
          </div>
        </div>

        <form onSubmit={handleCustomLogin} className="space-y-4">
          <Input
            label="Work Email Address"
            type="email"
            placeholder="e.g. yourname@company.com"
            value={customEmail}
            onChange={(e) => setCustomEmail(e.target.value)}
            required
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Display Name"
              type="text"
              placeholder="e.g. Alex Smith"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Role Permissions
              </label>
              <select
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value as UserRole)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="TEAM_MEMBER">Team Member</option>
                <option value="ADMIN">Administrator</option>
                <option value="VIEWER">Viewer (Read-Only)</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="primary" className="w-full mt-2" leftIcon={<LogIn className="w-4 h-4" />}>
            Sign In & Set Active Session
          </Button>
        </form>
      </div>
    </Modal>
  );
};
