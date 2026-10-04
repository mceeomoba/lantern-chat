import { useEffect, useState } from 'react';
import { sb } from './api';
export const DEF = { read_receipts: true, show_online: true, notif_msg: true, notif_call: true, notif_preview: true, previews: true, autoload: true, wallpaper: 'glass', textsize: 'm' };
let cur = { ...DEF }; const subs = new Set(); let uid = null;
export const getSettings = () => cur;
export async function loadSettings(me) { uid = me; const { data } = await sb.from('profiles').select('settings').eq('id', me).maybeSingle(); cur = { ...DEF, ...(data?.settings || {}) }; subs.forEach((f) => f(cur)); }
export function resetSettings() { uid = null; cur = { ...DEF }; subs.forEach((f) => f(cur)); }
export async function setSetting(k, v) { cur = { ...cur, [k]: v }; subs.forEach((f) => f(cur)); if (uid) await sb.from('profiles').update({ settings: cur }).eq('id', uid); }
export function useSettings() { const [v, set] = useState(cur); useEffect(() => { subs.add(set); set(cur); return () => { subs.delete(set); }; }, []); return v; }
export const sizes = { s: 14, m: 16, l: 19 };
export const wallpapers = { glass: null, sand: '#EFE6D6', mint: '#DDF3E8', sky: '#DCE8FA', rose: '#F8E1E7', slate: '#E2E5EA' };
