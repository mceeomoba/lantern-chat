import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { SUPABASE_URL, SUPABASE_KEY } from './config';
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } });
export const resumeBus = new Set();
const fireResume = () => resumeBus.forEach((fn) => { try { fn(); } catch (e) {} });
const keepAlive = () => { try { if (!sb.realtime.isConnected()) sb.realtime.connect(); } catch (e) {} };
let appActive = true;
AppState.addEventListener('change', (st) => {
  appActive = st === 'active';
  if (appActive) { sb.auth.startAutoRefresh(); keepAlive(); setTimeout(fireResume, 1200); } else sb.auth.stopAutoRefresh();
});
setInterval(() => { if (appActive) keepAlive(); }, 15000);
sb.auth.startAutoRefresh();
async function resolveEmail(ident, p) {
  const id = ident.trim();
  const { data } = await sb.rpc('login_email', { ident: id, pass: p });
  return data || id.toLowerCase();
}
export async function signUp(email, u, p) {
  const { error } = await sb.auth.signUp({ email: email.trim().toLowerCase(), password: p, options: { data: { username: u.trim().toLowerCase() } } });
  if (error) throw error;
  const r = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: p });
  if (r.error) throw r.error;
}
export async function signIn(ident, p) {
  const { error } = await sb.auth.signInWithPassword({ email: await resolveEmail(ident, p), password: p });
  if (error) throw error;
}
export async function listChats(me) {
  const { data: mem } = await sb.from('chat_members').select('chat_id,last_read_at').eq('user_id', me);
  const ids = (mem || []).map((m) => m.chat_id);
  if (!ids.length) return [];
  const { data: chats } = await sb.from('chats').select('id,kind,title').in('id', ids);
  const { data: members } = await sb.from('chat_members').select('chat_id,user_id').in('chat_id', ids);
  const { data: profs } = await sb.from('profiles').select('id,username,display_name,avatar_path,status_text,bio,links');
  const pm = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  const out = [];
  for (const c of chats || []) {
    const { data: last } = await sb.from('messages').select('body,created_at,removed,kind').eq('chat_id', c.id).order('created_at', { ascending: false }).limit(1);
    const other = (members || []).find((m) => m.chat_id === c.id && m.user_id !== me);
    const name = c.kind === 'group' ? c.title : (pm[other?.user_id]?.display_name || pm[other?.user_id]?.username || 'Chat');
    const mine = (mem || []).find((m) => m.chat_id === c.id);
    const { count } = await sb.from('messages').select('id', { count: 'exact', head: true }).eq('chat_id', c.id).neq('sender_id', me).gt('created_at', mine?.last_read_at || '1970-01-01');
    out.push({ avatar: c.kind === 'group' ? null : pm[other?.user_id]?.avatar_path, other: c.kind === 'group' ? null : pm[other?.user_id], kind: c.kind, unread: count || 0, id: c.id, name, last: last?.[0]?.removed ? 'This message was removed' : ({ image: 'Photo', voice: 'Voice message', document: 'Document', location: 'Location', sticker: 'Sticker' })[last?.[0]?.kind] || last?.[0]?.body || '', time: last?.[0]?.created_at });
  }
  return out.sort((a, b) => String(b.time).localeCompare(String(a.time)));
}
export async function listMessages(chat) {
  const { data } = await sb.from('messages').select('id,sender_id,body,removed,created_at,kind,media_path,duration,reply_to,wave').eq('chat_id', chat).order('created_at', { ascending: true }).limit(200);
  return data || [];
}
export const sendMessage = (chat, me, body, replyTo) => sb.from('messages').insert({ chat_id: chat, sender_id: me, body, reply_to: replyTo || null });
export async function openDm(username) {
  const { data: p } = await sb.from('profiles').select('id').eq('username', username.trim().toLowerCase()).maybeSingle();
  if (!p) throw new Error('No such username');
  const { data, error } = await sb.rpc('open_dm', { other: p.id });
  if (error) throw error;
  return data;
}
export const reportMessage = (me, msgId, why) => sb.from('reports').insert({ reporter: me, target_type: 'message', target_id: String(msgId), reason: why });
export async function peerReadAt(chat, me) { const { data } = await sb.rpc('peer_read', { c: chat }); return data || null; }
export const markRead = (chat, me) => sb.from('chat_members').update({ last_read_at: new Date().toISOString() }).eq('chat_id', chat).eq('user_id', me);

export async function listGames(chat) {
  const { data } = await sb.from('games').select('id,p1,p2,board,turn,status,winner,created_at').eq('chat_id', chat).order('created_at', { ascending: true }).limit(50);
  return data || [];
}
export async function startGame(chat) {
  const { data, error } = await sb.rpc('start_game', { c: chat }); if (error) throw error; return data;
}
export async function gameMove(id, cell) {
  const { error } = await sb.rpc('game_move', { g: id, cell }); if (error) throw error;
}
export async function startCall(chat) { const { data, error } = await sb.rpc('start_call', { c: chat }); if (error) throw error; return data; }
export const setCall = (id, s) => sb.rpc('set_call', { g: id, s });
export async function listCalls(me) {
  const { data } = await sb.from('calls').select('id,chat_id,caller,callee,status,created_at,answered_at,ended_at').order('created_at', { ascending: false }).limit(50);
  const rows = data || [];
  const ids = [...new Set(rows.map((r) => (r.caller === me ? r.callee : r.caller)))];
  const { data: profs } = ids.length ? await sb.from('profiles').select('id,username,display_name').in('id', ids) : { data: [] };
  const pm = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  return rows.map((r) => { const other = r.caller === me ? r.callee : r.caller; return { ...r, out: r.caller === me, name: pm[other]?.display_name || pm[other]?.username || 'User' }; });
}
export async function listStatuses() {
  const { data } = await sb.from('statuses').select('id,user_id,body,media_path,created_at').order('created_at', { ascending: false }).limit(100);
  const rows = data || [];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: profs } = ids.length ? await sb.from('profiles').select('id,username,display_name').in('id', ids) : { data: [] };
  const pm = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, name: pm[r.user_id]?.display_name || pm[r.user_id]?.username || 'User' }));
}
export const postStatus = (body) => sb.from('statuses').insert({ body });

export async function uploadMedia(me, uri, mime, ext, scope) {
  const buf = await (await fetch(uri)).arrayBuffer();
  const path = `${scope}/${me}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await sb.storage.from('media').upload(path, buf, { contentType: mime });
  if (error) throw error;
  return path;
}
export const sendMedia = (chat, me, kind, path, body, duration, wave) => sb.from('messages').insert({ chat_id: chat, sender_id: me, body, kind, media_path: path, duration, wave: wave || null });
export const sendKind = (chat, me, kind, body) => sb.from('messages').insert({ chat_id: chat, sender_id: me, body, kind });
export async function signedUrl(path) { const { data } = await sb.storage.from('media').createSignedUrl(path, 3600); return data?.signedUrl; }
export async function postStatusPhoto(me, path) { return sb.from('statuses').insert({ body: 'Photo', media_path: path }); }
export async function contacts(me) {
  const { data: mem } = await sb.from('chat_members').select('chat_id').eq('user_id', me);
  const ids = (mem || []).map((m) => m.chat_id); if (!ids.length) return [];
  const { data: others } = await sb.from('chat_members').select('user_id').in('chat_id', ids).neq('user_id', me);
  const uids = [...new Set((others || []).map((o) => o.user_id))]; if (!uids.length) return [];
  const { data: profs } = await sb.from('profiles').select('id,username,display_name').in('id', uids);
  return profs || [];
}

export async function myProfile(me) { const { data } = await sb.from('profiles').select('username,display_name,bio').eq('id', me).maybeSingle(); return data || {}; }
export const saveProfile = (me, display_name, bio) => sb.from('profiles').update({ display_name, bio }).eq('id', me);

export const registerPush = (t) => sb.rpc('register_push_token', { t, a: 'chat' });
export const unregisterPush = (t) => sb.rpc('unregister_push_token', { t });
export const avatarUrl = (p) => (p ? `${SUPABASE_URL}/storage/v1/object/public/avatars/${p}` : null);
export function friendly(e) {
  const m = String((e && e.message) || e || '');
  if (/profiles_username_key|duplicate key|already (taken|exists)|Database error saving new user/i.test(m)) return 'That username is taken. Try another one.';
  if (/User already registered|already been registered/i.test(m)) return 'An account with that email already exists. Log in instead.';
  if (/Invalid login credentials/i.test(m)) return 'Wrong email/username or password.';
  return m;
}
