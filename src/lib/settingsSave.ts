import { storage } from './storage';
import { getSupabaseClient } from './supabase';
import type { AppSettings } from '../types/database';

/**
 * Fix for company settings not persisting.
 *
 * supabase-js does NOT throw when a write is rejected (RLS, no session, missing
 * table...). It returns `{ error }`. The previous saveSettings() ignored it, so a
 * rejected save looked successful, and the next hydrate() overwrote the form with
 * the old values from the database.
 *
 * This version checks the result, throws a visible error on failure, and only
 * updates the local cache / in-memory state after the database accepted the write.
 */
(storage as any).saveSettings = async function (newSettings: AppSettings): Promise<void> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const now = new Date().toISOString();
    const [company, pos] = await Promise.all([
      supabase.from('app_settings').upsert({ key: 'company_info', value: newSettings.company_info, updated_at: now }),
      supabase.from('app_settings').upsert({ key: 'pos_settings', value: newSettings.pos_settings, updated_at: now }),
    ]);

    const err = company.error || pos.error;
    if (err) {
      console.error('app_settings save failed:', err);
      throw new Error('تعذر حفظ الإعدادات في قاعدة البيانات: ' + (err.message || 'خطأ غير معروف'));
    }
  }

  try {
    localStorage.setItem('cached_app_settings', JSON.stringify(newSettings));
  } catch (e) {
    console.warn('Failed to cache settings locally', e);
  }

  (storage as any).settings = newSettings;
  storage.notify();
};
