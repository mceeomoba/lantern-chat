import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as A from './src/api';
import { GlassBackdrop, Glass } from './src/glass';
const G = '#128C7E';
export default function App() {
  const [ok, setOk] = useState(null); const [tab, setTab] = useState('reports'); const [rows, setRows] = useState([]);
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');
  const check = async () => { const { data } = await A.sb.auth.getSession(); setOk(data.session ? ((await A.isAdmin()) ? 'admin' : 'denied') : 'out'); };
  useEffect(() => { check(); }, []);
  const load = async () => setRows(tab === 'reports' ? await A.getReports() : tab === 'users' ? await A.getUsers() : tab === 'config' ? await A.getConfig() : tab === 'feedback' ? await A.getFeedback() : await A.getAudit());
  useEffect(() => { if (ok === 'admin') load(); }, [ok, tab]);
  if (ok !== 'admin') return (
    <GlassBackdrop><View style={[s.c, { justifyContent: 'center', padding: 28 }]}>
      <Text style={s.h}>Lantern Admin</Text>
      {ok === 'denied' && <Text style={{ color: '#c00', marginBottom: 10 }}>This account is not an admin.</Text>}
      <TextInput style={s.f} placeholder="Email or username" autoCapitalize="none" autoCorrect={false} value={u} onChangeText={setU} />
      <TextInput style={s.f} placeholder="Password" autoCapitalize="none" autoCorrect={false} secureTextEntry value={p} onChangeText={setP} />
      {!!err && <Text style={{ color: '#c00' }}>{err}</Text>}
      <Pressable style={s.b} onPress={async () => { try { await A.signIn(u, p); await check(); } catch (e) { setErr(e.message); } }}><Text style={{ color: '#fff', fontWeight: '700' }}>Sign in</Text></Pressable>
    </View></GlassBackdrop>);
  const act = async (fn) => { const r = await fn(); if (r?.error) alert(r.error.message); load(); };
  return (
    <GlassBackdrop><View style={s.c}>
      <Text style={[s.h, { padding: 16 }]}>Admin · {tab}</Text>
      <FlatList data={rows} keyExtractor={(r, i) => String(r.id ?? r.key ?? i)} renderItem={({ item: r }) => (
        <Glass style={s.card}>
          {tab === 'reports' && (<><Text style={{ fontWeight: '600' }}>#{r.id} {r.target_type} {r.target_id} · {r.status}</Text><Text>{r.reason}</Text>
            <View style={s.r}><Pressable style={s.sm} onPress={() => act(() => A.setReport(r.id, 'actioned'))}><Text>Action</Text></Pressable><Pressable style={s.sm} onPress={() => act(() => A.setReport(r.id, 'dismissed'))}><Text>Dismiss</Text></Pressable>
              {r.target_type === 'message' && <Pressable style={s.sm} onPress={() => act(() => A.removeMsg(Number(r.target_id)))}><Text>Remove msg</Text></Pressable>}</View></>)}
          {tab === 'users' && (<><Text style={{ fontWeight: '600' }}>@{r.username} {r.role === 'admin' ? '(admin)' : ''}</Text><Text>{r.banned_until ? 'banned until ' + r.banned_until : 'active'}</Text>
            <View style={s.r}><Pressable style={s.sm} onPress={() => act(() => A.ban(r.id, 24, 'admin action'))}><Text>Ban 24h</Text></Pressable><Pressable style={s.sm} onPress={() => act(() => A.ban(r.id, null, 'unban'))}><Text>Unban</Text></Pressable></View></>)}
          {tab === 'config' && (<><Text style={{ fontWeight: '600' }}>{r.key}</Text><Text>{JSON.stringify(r.value)}</Text>
            {r.key === 'signups_open' && <Pressable style={s.sm} onPress={() => act(() => A.setConfig('signups_open', !(r.value === true || r.value === 'true')))}><Text>Toggle signups</Text></Pressable>}</>)}
          {tab === 'feedback' && <><Text style={{ color: '#555' }}>{r.created_at?.slice(0, 16)}</Text><Text>{r.body}</Text></>}
          {tab === 'audit' && <Text>{r.created_at?.slice(0, 19)} · {r.action} {JSON.stringify(r.detail)}</Text>}
        </Glass>)} />
      <Glass style={s.tabs} intensity={55}>{[['reports', 'flag'], ['users', 'people'], ['config', 'settings'], ['feedback', 'chatbubble-ellipses'], ['audit', 'document-text']].map(([t, ic]) => (
        <Pressable key={t} style={s.tab} onPress={() => setTab(t)}><Ionicons name={ic} size={24} color={tab === t ? G : '#555'} /><Text style={{ fontSize: 11, color: tab === t ? G : '#555' }}>{t}</Text></Pressable>))}</Glass>
    </View></GlassBackdrop>);
}
const s = StyleSheet.create({ c: { flex: 1, backgroundColor: 'transparent', paddingTop: Platform.OS === 'android' ? 36 : 8, minHeight: Platform.OS === 'web' ? '100vh' : undefined },
  h: { fontSize: 26, fontWeight: '800', marginBottom: 14 }, f: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: '#fff' },
  b: { backgroundColor: G, padding: 14, borderRadius: 10, alignItems: 'center' }, card: { margin: 8, marginHorizontal: 14, padding: 12, borderRadius: 18 },
  r: { flexDirection: 'row', marginTop: 8 }, sm: { borderWidth: 1, borderColor: G, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8, marginTop: 6 },
  tabs: { flexDirection: 'row', margin: 12, padding: 8, borderRadius: 28 }, tab: { flex: 1, alignItems: 'center' } });
