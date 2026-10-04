import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { SUPABASE_URL, SUPABASE_KEY} from './config';
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } });
AppState.addEventListener('change', (st) => { if (st === 'active') sb.auth.startAutoRefresh(); else sb.auth.stopAutoRefresh(); });
sb.auth.startAutoRefresh();
async function resolveEmail(ident, p) {
  const id = ident.trim();
  const { data } = await sb.rpc('login_email', { ident: id, pass: p });
  return data || id.toLowerCase();
}
export const signIn = async (u, p) => { const { error } = await sb.auth.signInWithPassword({ email: await resolveEmail(u, p), password: p }); if (error) throw error; };
export const isAdmin = async () => { const { data } = await sb.rpc('is_admin'); return data === true; };
export const getReports = async () => (await sb.from('reports').select('*').order('created_at', { ascending: false }).limit(100)).data || [];
export const setReport = (id, status) => sb.from('reports').update({ status }).eq('id', id);
export const getUsers = async () => (await sb.from('profiles').select('id,username,display_name,role,banned_until,created_at').order('created_at', { ascending: false }).limit(200)).data || [];
export const ban = (uid, hours, why) => sb.rpc('admin_ban', { uid, hours, why });
export const removeMsg = (mid) => sb.rpc('admin_remove_message', { mid });
export const getConfig = async () => (await sb.from('app_config').select('*')).data || [];
export const setConfig = (key, value) => sb.from('app_config').upsert({ key, value });
export const getAudit = async () => (await sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100)).data || [];
export const getFeedback = async () => { const { data } = await sb.from('feedback').select('id,body,created_at').order('created_at', { ascending: false }).limit(100); return data || []; };
