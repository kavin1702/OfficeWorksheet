'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User } from '@/shared/types';
import { ShieldCheck, UserCheck, ChevronDown, LogOut, UserSwitch, Settings, RefreshCw } from 'lucide-react';
import { AuthService } from '../auth.service';

interface UserProfileDropdownProps {
  user: User;
  onOpenAuthModal: () => void;
  onUserChanged: (user: User) => void;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  user,
  onOpenAuthModal,
  onUserChanged
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    AuthService.logout();
    onUserChanged(AuthService.getCurrentUser());
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
      >
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 border border-slate-200 dark:border-slate-700"
        />
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{user.name}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {user.role === 'ADMIN' ? 'Admin' : 'Team Member'}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Signed in as</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.email}</p>
            <div className="mt-1.5">
              {user.role === 'ADMIN' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> Administrator
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  <UserCheck className="w-3 h-3" /> Team Member
                </span>
              )}
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenAuthModal();
              }}
              className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <UserSwitch className="w-4 h-4 text-blue-500" />
              <span>Switch User Profile</span>
            </button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out / Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
