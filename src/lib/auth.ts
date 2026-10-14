import { RoleType } from '../types/database';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export interface UserAccount {
  id: string;
  email: string;
  username?: string;
  fullName: string;
  role: RoleType;
  roleNameAr: string;
  phone?: string;
  description?: string;
  avatarColor: string;
  isActive: boolean;
  createdAt?: string;
}

export const ROLE_NAMES_AR: Record<RoleType, string> = {
  admin: 'المدير العام',
  supervisor: 'مشرف (قراءة ومتابعة فقط)',
  viewer: 'مشرف (قراءة ومتابعة فقط)',
};

// Definition of permissions per role - only General Manager (full) and Supervisor (read-only site access)
export const ROLE_ALLOWED_TABS: Record<RoleType, string[]> = {
  admin: [
    'dashboard',
    'customers',
    'debts',
    'customer_ledgers',
    'products',
    'invoices',
    'suppliers',
    'treasury',
    'old_ledgers',
    'reports',
    'users',
    'settings',
  ],
  supervisor: [
    'dashboard',
    'customers',
    'debts',
    'customer_ledgers',
    'products',
    'invoices',
    'suppliers',
    'treasury',
    'old_ledgers',
    'reports',
    'settings',
  ],
  viewer: [
    'dashboard',
    'customers',
    'debts',
    'customer_ledgers',
    'products',
    'invoices',
    'suppliers',
    'treasury',
    'old_ledgers',
    'reports',
    'settings',
  ],
};

let cachedCurrentUser: UserAccount | null = null;
const authListeners: Set<(user: UserAccount | null) => void> = new Set();

function notifyAuthListeners() {
  authListeners.forEach((fn) => fn(cachedCurrentUser));
}

function mapProfileToUserAccount(profile: any, email: string, userMetadata?: any): UserAccount {
  const rawRole = profile.role_id || userMetadata?.role_id;
  const role: RoleType = rawRole === 'admin' ? 'admin' : 'supervisor';
  return {
    id: profile.user_id || profile.id,
    email,
    username: email.split('@')[0],
    fullName: profile.full_name || userMetadata?.full_name || email,
    role,
    roleNameAr: ROLE_NAMES_AR[role] || 'مشرف',
    phone: profile.phone || userMetadata?.phone || '',
    description: userMetadata?.description || profile.description || '',
    avatarColor:
      userMetadata?.avatar_color ||
      profile.avatar_color ||
      (role === 'admin' ? 'bg-emerald-700' : 'bg-blue-700'),
    isActive: profile.is_active ?? true,
    createdAt: profile.created_at,
  };
}

export const authService = {
  getCurrentUser(): UserAccount | null {
    if (cachedCurrentUser) return cachedCurrentUser;
    try {
      const cached = localStorage.getItem('cached_current_user') || localStorage.getItem('last_active_user_profile');
      if (cached) {
        cachedCurrentUser = JSON.parse(cached);
        return cachedCurrentUser;
      }
    } catch {}
    return null;
  },

  setCurrentUser(user: UserAccount | null) {
    cachedCurrentUser = user;
    if (user) {
      try {
        localStorage.setItem('cached_current_user', JSON.stringify(user));
        localStorage.setItem('last_active_user_profile', JSON.stringify(user));
        localStorage.setItem(`user_profile_${user.id}`, JSON.stringify(user));
      } catch {}
    }
    notifyAuthListeners();
  },

  onAuthStateChange(callback: (user: UserAccount | null) => void): () => void {
    authListeners.add(callback);
    return () => authListeners.delete(callback);
  },

  async initSession(): Promise<UserAccount | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      cachedCurrentUser = null;
      notifyAuthListeners();
      return null;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        cachedCurrentUser = null;
        notifyAuthListeners();
        return null;
      }

      // Fetch profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      // Check localStorage for saved profile overrides
      let localOverride: Partial<UserAccount> | null = null;
      try {
        const raw = localStorage.getItem(`user_profile_${session.user.id}`) || localStorage.getItem('last_active_user_profile');
        if (raw) localOverride = JSON.parse(raw);
      } catch {}

      if (profileErr || !profile) {
        // Fallback user if profile row pending
        const role = (localOverride?.role || session.user.user_metadata?.role_id || 'admin') as RoleType;
        cachedCurrentUser = {
          id: session.user.id,
          email: session.user.email || '',
          username: (session.user.email || '').split('@')[0],
          fullName: localOverride?.fullName || session.user.user_metadata?.full_name || session.user.email || 'المدير العام',
          role,
          roleNameAr: ROLE_NAMES_AR[role] || 'المدير العام',
          phone: localOverride?.phone || session.user.user_metadata?.phone || '',
          description: localOverride?.description || session.user.user_metadata?.description || '',
          avatarColor: localOverride?.avatarColor || session.user.user_metadata?.avatar_color || 'bg-emerald-700',
          isActive: true,
        };
      } else {
        if (profile.is_active === false) {
          await supabase.auth.signOut();
          cachedCurrentUser = null;
          notifyAuthListeners();
          return null;
        }
        const mapped = mapProfileToUserAccount(profile, session.user.email || '', session.user.user_metadata);
        cachedCurrentUser = {
          ...mapped,
          fullName: localOverride?.fullName || mapped.fullName,
          phone: localOverride?.phone !== undefined ? localOverride.phone : mapped.phone,
          description: localOverride?.description !== undefined ? localOverride.description : mapped.description,
          avatarColor: localOverride?.avatarColor || mapped.avatarColor,
        };
      }

      notifyAuthListeners();
      return cachedCurrentUser;
    } catch (err) {
      console.warn('Failed to get current auth session:', err);
      cachedCurrentUser = null;
      notifyAuthListeners();
      return null;
    }
  },

  async checkHasAnyUsers(): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.warn('Could not check profiles count:', error);
        return true; // Default to true so we don't inappropriately expose setup
      }
      return (count ?? 0) > 0;
    } catch {
      return true;
    }
  },

  async loginWithEmail(email: string, password: string): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'الاتصال بقاعدة بيانات Supabase غير متوفر' };
    }

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
        }
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'فشل استرجاع بيانات المستخدم' };
      }

      // Check localStorage for saved profile overrides
      let localOverride: Partial<UserAccount> | null = null;
      try {
        const raw = localStorage.getItem(`user_profile_${data.user.id}`) || localStorage.getItem('last_active_user_profile');
        if (raw) localOverride = JSON.parse(raw);
      } catch {}

      // Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        return { success: false, error: 'هذا الحساب معطل من قبل إدارة النظام، برجاء مراجعة المدير العام' };
      }

      let userAccount: UserAccount;
      if (profile) {
        const mapped = mapProfileToUserAccount(profile, data.user.email || trimmedEmail, data.user.user_metadata);
        userAccount = {
          ...mapped,
          fullName: localOverride?.fullName || mapped.fullName,
          phone: localOverride?.phone !== undefined ? localOverride.phone : mapped.phone,
          description: localOverride?.description !== undefined ? localOverride.description : mapped.description,
          avatarColor: localOverride?.avatarColor || mapped.avatarColor,
        };
      } else {
        userAccount = {
          id: data.user.id,
          email: data.user.email || trimmedEmail,
          username: (data.user.email || trimmedEmail).split('@')[0],
          fullName: data.user.user_metadata?.full_name || 'المدير العام',
          role: (data.user.user_metadata?.role_id || 'admin') as RoleType,
          roleNameAr: ROLE_NAMES_AR[(data.user.user_metadata?.role_id || 'admin') as RoleType] || 'المدير العام',
          phone: data.user.user_metadata?.phone || '',
          description: data.user.user_metadata?.description || '',
          avatarColor: 'bg-emerald-700',
          isActive: true,
        };
      }

      this.setCurrentUser(userAccount);
      return { success: true, user: userAccount };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول' };
    }
  },

  async createInitialAdmin(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'الاتصال بقاعدة البيانات غير متوفر' };
    }

    try {
      const trimmedEmail = data.email.trim().toLowerCase();

      // Call secure setup RPC
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_create_system_user', {
        p_email: trimmedEmail,
        p_password: data.password,
        p_full_name: data.fullName.trim(),
        p_phone: data.phone?.trim() || '',
        p_role_id: 'admin',
        p_description: 'المدير العام والمؤسس الأول للنظام',
      });

      if (rpcErr) {
        // If RPC isn't found yet or errored, try standard signUp
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName.trim(),
              phone: data.phone?.trim() || '',
              role_id: 'admin',
              description: 'المدير العام والمؤسس الأول للنظام',
            },
          },
        });

        if (signUpErr) {
          return { success: false, error: signUpErr.message };
        }

        // Now sign in
        return await this.loginWithEmail(trimmedEmail, data.password);
      }

      // Login immediately with created credentials
      return await this.loginWithEmail(trimmedEmail, data.password);
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل إنشاء حساب المدير الأول' };
    }
  },

  async logout(): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out warning:', err);
      }
    }
    this.setCurrentUser(null);
  },

  async getProfiles(): Promise<UserAccount[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((p) => {
        const role: RoleType = p.role_id === 'admin' ? 'admin' : 'supervisor';
        return {
          id: p.id,
          email: p.user_id ? `${p.full_name?.replace(/\s+/g, '_') || 'user'}@alzahraa.internal` : '',
          fullName: p.full_name,
          role,
          roleNameAr: ROLE_NAMES_AR[role] || 'مشرف',
          phone: p.phone || '',
          description: p.description || '',
          avatarColor: p.avatar_color || (role === 'admin' ? 'bg-emerald-700' : 'bg-blue-700'),
          isActive: p.is_active ?? true,
          createdAt: p.created_at,
        };
      });
    } catch {
      return [];
    }
  },

  async updateCurrentUserProfile(data: {
    fullName: string;
    phone?: string;
    description?: string;
    avatarColor?: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const supabase = getSupabaseClient();
    let current = this.getCurrentUser();
    if (!current) {
      try {
        const raw = localStorage.getItem('cached_current_user') || localStorage.getItem('last_active_user_profile');
        if (raw) current = JSON.parse(raw);
      } catch {}
    }
    if (!current) {
      return { success: false, error: 'جلسة المستخدم غير متوفرة' };
    }

    const trimmedFullName = data.fullName.trim();
    if (!trimmedFullName) {
      return { success: false, error: 'يرجى إدخال اسم المستخدم بالكامل' };
    }

    const trimmedPhone = data.phone?.trim() || '';
    const trimmedDescription = data.description?.trim() || '';
    const selectedColor = data.avatarColor || current.avatarColor || 'bg-emerald-700';

    const updatedUser: UserAccount = {
      ...current,
      fullName: trimmedFullName,
      phone: trimmedPhone,
      description: trimmedDescription,
      avatarColor: selectedColor,
    };

    const isValidUuid = (str?: string): boolean =>
      typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    let authUserId: string | null = null;
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          authUserId = session.user.id;
        }
      } catch {}
    }

    // 1. Save immediately to localStorage with all candidate keys for rock-solid persistence
    try {
      localStorage.setItem('cached_current_user', JSON.stringify(updatedUser));
      localStorage.setItem('last_active_user_profile', JSON.stringify(updatedUser));
      localStorage.setItem(`user_profile_${current.id}`, JSON.stringify(updatedUser));
      if (authUserId) {
        localStorage.setItem(`user_profile_${authUserId}`, JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.warn('Failed to save user profile to localStorage', e);
    }

    // 2. Persist to Supabase if connected
    if (supabase) {
      try {
        // A. Update Supabase auth user metadata (stores full_name, phone, description, avatar_color)
        if (authUserId) {
          await supabase.auth.updateUser({
            data: {
              full_name: trimmedFullName,
              phone: trimmedPhone,
              description: trimmedDescription,
              avatar_color: selectedColor,
            },
          });
        }

        // B. Update profiles table safely without UUID syntax errors
        let profileRowId: string | null = null;

        if (authUserId && isValidUuid(authUserId)) {
          const { data: p } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', authUserId)
            .maybeSingle();
          if (p?.id) profileRowId = p.id;
        }

        if (!profileRowId && isValidUuid(current.id)) {
          const { data: p1 } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', current.id)
            .maybeSingle();
          if (p1?.id) {
            profileRowId = p1.id;
          } else {
            const { data: p2 } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', current.id)
              .maybeSingle();
            if (p2?.id) profileRowId = p2.id;
          }
        }

        if (profileRowId) {
          await supabase
            .from('profiles')
            .update({
              full_name: trimmedFullName,
              phone: trimmedPhone || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profileRowId);
        } else {
          const targetUid = (authUserId && isValidUuid(authUserId)) ? authUserId : (isValidUuid(current.id) ? current.id : null);
          if (targetUid) {
            await supabase
              .from('profiles')
              .insert({
                user_id: targetUid,
                full_name: trimmedFullName,
                phone: trimmedPhone || null,
                role_id: current.role || 'admin',
                is_active: true,
                updated_at: new Date().toISOString(),
              });
          }
        }
      } catch (cloudErr) {
        console.warn('Cloud sync notice for profile:', cloudErr);
      }

      // Also try saving to app_settings as backup key
      try {
        await supabase.from('app_settings').upsert({
          key: `user_profile_${current.id}`,
          value: updatedUser,
          updated_at: new Date().toISOString(),
        });
      } catch {}
    }

    // 3. Update memory state and notify all listeners
    this.setCurrentUser(updatedUser);
    return { success: true, user: updatedUser };
  },

  async updateCurrentUserPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'الاتصال بقاعدة البيانات غير متوفر' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء تحديث كلمة المرور' };
    }
  },

  async adminCreateUser(data: {
    email: string;
    password: string;
    fullName: string;
    role?: RoleType;
    phone?: string;
    description?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'الاتصال بقاعدة البيانات غير متوفر' };
    }

    // القيمة المخزنة في قاعدة البيانات لدور المشرف هي 'viewer' (الموجودة في جدول roles)
    // بينما الواجهة تعرضه باسم "مشرف". لا يوجد دور اسمه 'supervisor' في الجدول.
    const dbRole = 'viewer';

    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_create_system_user', {
        p_email: data.email.trim().toLowerCase(),
        p_password: data.password,
        p_full_name: data.fullName.trim(),
        p_phone: data.phone?.trim() || '',
        p_role_id: dbRole,
        p_description: data.description?.trim() || 'مشرف (قراءة ومتابعة فقط)',
      });

      // ملاحظة: لا يوجد fallback إلى auth.signUp عن قصد، لأن signUp يبدّل جلسة
      // المدير الحالية بجلسة المستخدم الجديد وينشئ حساباً معطلاً.
      if (rpcErr) {
        return { success: false, error: rpcErr.message || 'فشل إنشاء المستخدم' };
      }
      if (rpcRes && rpcRes.success === false) {
        return { success: false, error: rpcRes.message || 'فشل إنشاء المستخدم' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء إنشاء المستخدم المشرف' };
    }
  },

  async adminUpdateUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال غير متوفر' };

    try {
      const { error } = await supabase.rpc('admin_update_user_password', {
        p_target_user_id: userId,
        p_new_password: newPassword,
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل تحديث كلمة المرور' };
    }
  },

  async adminToggleUserStatus(profileId: string, currentStatus: boolean): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', profileId);

      return !error;
    } catch {
      return false;
    }
  },

  async adminUpdateUserRole(profileId: string, newRole: RoleType): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'الاتصال بقاعدة البيانات غير متوفر' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role_id: newRole === 'admin' ? 'admin' : 'viewer', updated_at: new Date().toISOString() })
        .eq('id', profileId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'فشل تحديث الدور' };
    }
  },

  canAccessTab(tabId: string, role: RoleType): boolean {
    const allowed = ROLE_ALLOWED_TABS[role] || [];
    return allowed.includes(tabId);
  },

  getAllowedTabs(role: RoleType): string[] {
    return ROLE_ALLOWED_TABS[role] || [];
  },

  // Supervisor Read-Only Helpers: Only General Manager (admin) can add, edit, or delete!
  canModify(role?: RoleType): boolean {
    return role === 'admin';
  },

  isSupervisor(role?: RoleType): boolean {
    return role === 'supervisor' || role === 'viewer';
  },

  isReadOnly(role?: RoleType): boolean {
    return role !== 'admin';
  },
};
