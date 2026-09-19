import { User, WorkEntry } from '@/shared/types';
import { PRESET_USERS } from '@/modules/auth/auth.service';

export class AdminService {
  static getRegisteredUsers(): User[] {
    return PRESET_USERS;
  }
}
