import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, EMAIL_DOMAIN } from './config';
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const mail = (u) => `${u.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
export async function signUp(u, p) {
  const { error } = await sb.auth.signUp({ email: mail(u), password: p, options: { data: { username: u.trim().toLowerCase() } } });
  if (error) throw error;
}
export async function signIn(u, p) {
  const { error } = await sb.auth.signInWithPassword({ email: mail(u), password: p });
  if (error) throw error;
}
export async function listChats(me) {
  const { data: mem } = await sb.from('chat_members').select('chat_id,last_read_at').eq('user_id', me);
  const ids = (mem || []).map((m) => m.chat_id);
  if (!ids.length) return [];
  const { data: chats } = await sb.from('chats').select('id,kind,title').in('id', ids);
  const { data: members } = await sb.from('chat_members').select('chat_id,user_id').in('chat_id', ids);
  const { data: profs } = await sb.from('profiles').select('id,username,display_name');
  const pm = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  const out = [];
  for (const c of chats || []) {
    const { data: last } = await sb.from('messages').select('body,created_at,removed').eq('chat_id', c.id).order('created_at', { ascending: false }).limit(1);
    const other = (members || []).find((m) => m.chat_id === c.id && m.user_id !== me);
    const name = c.kind === 'group' ? c.title : (pm[other?.user_id]?.display_name || pm[other?.user_id]?.username || 'Chat');
    const mine = (mem || []).find((m) => m.chat_id === c.id);
    const { count } = await sb.from('messages').select('id', { count: 'exact', head: true }).eq('chat_id', c.id).neq('sender_id', me).gt('created_at', mine?.last_read_at || '1970-01-01');
    out.push({ unread: count || 0, id: c.id, name, last: last?.[0]?.removed ? 'This message was removed' : last?.[0]?.body || '', time: last?.[0]?.created_at });
  }
  return out.sort((a, b) => String(b.time).localeCompare(String(a.time)));
}
export async function listMessages(chat) {
  const { data } = await sb.from('messages').select('id,sender_id,body,removed,created_at').eq('chat_id', chat).order('created_at', { ascending: true }).limit(200);
  return data || [];
}
export const sendMessage = (chat, me, body) => sb.from('messages').insert({ chat_id: chat, sender_id: me, body });
export async function openDm(username) {
  const { data: p } = await sb.from('profiles').select('id').eq('username', username.trim().toLowerCase()).maybeSingle();
  if (!p) throw new Error('No such username');
  const { data, error } = await sb.rpc('open_dm', { other: p.id });
  if (error) throw error;
  return data;
}
export const reportMessage = (me, msgId, why) => sb.from('reports').insert({ reporter: me, target_type: 'message', target_id: String(msgId), reason: why });
export async function peerReadAt(chat, me) {
  const { data } = await sb.from('chat_members').select('last_read_at').eq('chat_id', chat).neq('user_id', me);
  const t = (data || []).map((d) => d.last_read_at).sort();
  return t.length ? t[0] : null;
}
export const markRead = (chat, me) => sb.from('chat_members').update({ last_read_at: new Date().toISOString() }).eq('chat_id', chat).eq('user_id', me);
