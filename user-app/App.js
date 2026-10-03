import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ScrollView, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { sb, signIn, signUp, listChats, listMessages, sendMessage, openDm, reportMessage, peerReadAt, markRead } from './src/api';

const G = '#25D366', GD = '#128C7E', OUT = '#D9FDD3', BG = '#F2F2F7', CHATBG = '#EFEAE2';
const Avatar = ({ name, size = 52, color = '#DDD' }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 0, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="person" size={size * 0.55} color="#8A929C" />
  </View>
);
const Round = ({ name, onPress, lib = Ionicons, size = 22 }) => {
  const I = lib; return (<Pressable onPress={onPress} style={s.round}><I name={name} size={size} color="#111" /></Pressable>);
};
const Wave = ({ dur, color = '#9a9a9a' }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
    {Array.from({ length: 30 }).map((_, i) => (<View key={i} style={{ width: 3, marginRight: 2, borderRadius: 2, backgroundColor: color, height: 4 + ((i * 7) % 5) * 5 + (i % 3) * 3 }} />))}
  </View>
);

function Auth() {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async (up) => { setBusy(true); setErr(''); try { await (up ? signUp(u, p) : signIn(u, p)); if (up) await signIn(u, p); } catch (e) { setErr(e.message); } setBusy(false); };
  return (
    <View style={[s.screen, { padding: 28, justifyContent: 'center', backgroundColor: '#fff' }]}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: G, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chatbubbles" size={42} color="#fff" /></View>
        <Text style={{ fontSize: 30, fontWeight: '700', marginTop: 14 }}>Lantern</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>Simple, fast messaging</Text>
      </View>
      <TextInput style={s.field} placeholder="Username (a-z, 0-9, _)" autoCapitalize="none" value={u} onChangeText={setU} />
      <TextInput style={s.field} placeholder="Password" secureTextEntry value={p} onChangeText={setP} />
      {!!err && <Text style={{ color: '#c00', marginBottom: 8 }}>{err}</Text>}
      <Pressable style={s.btn} disabled={busy} onPress={() => go(false)}><Text style={s.btnT}>Log in</Text></Pressable>
      <Pressable style={[s.btn, { backgroundColor: '#fff', borderWidth: 1, borderColor: G }]} disabled={busy} onPress={() => go(true)}><Text style={[s.btnT, { color: GD }]}>Create account</Text></Pressable>
            <Text style={{ color: '#888', fontSize: 12, marginTop: 24, textAlign: 'center' }}>Messages are not end-to-end encrypted. Admins can view reported content and moderate. No password recovery in this preview, keep your password safe.</Text>
    </View>
  );
}

function ChatRow({ c, onPress }) {
  return (
    <Pressable onPress={onPress} style={s.row}>
      <Avatar color={c.color || '#C9CED6'} />
      <View style={s.rowBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.rowName} numberOfLines={1}>{c.name}</Text>
          <Text style={[s.rowTime, c.accent && { color: G }]}>{c.time ? (/^\d{4}-/.test(String(c.time)) ? new Date(c.time).toLocaleDateString() : c.time) : ''}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {c.ticks && <Ionicons name="checkmark-done" size={16} color="#8696A0" style={{ marginRight: 3 }} />}
            {c.voice && <Ionicons name="mic" size={15} color={c.ticks ? '#8696A0' : '#34B7F1'} style={{ marginRight: 2 }} />}
            <Text style={s.rowLast} numberOfLines={2}>{c.last}</Text>
          </View>
          {c.unread ? <View style={s.badge}><Text style={s.badgeT}>{c.unread > 98 ? '99+' : c.unread}</Text></View> : c.pinned ? <MaterialCommunityIcons name="pin" size={16} color="#8696A0" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function Chats({ chats, open, newChat }) {
  const [q, setQ] = useState(''); const [chip, setChip] = useState('All');
  const list = chats.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) && (chip !== 'Unread' || c.unread));
  return (
    <View style={s.screen}>
      <View style={s.topBar}><Round name="ellipsis-horizontal" /><View style={{ flexDirection: 'row' }}><Round name="camera" /><Pressable onPress={newChat} style={[s.round, { backgroundColor: G, marginLeft: 10 }]}><Ionicons name="add" size={26} color="#fff" /></Pressable></View></View>
      <Text style={s.h1}>Chats</Text>
      <View style={s.search}><Ionicons name="search" size={18} color="#8E8E93" /><TextInput style={{ flex: 1, marginLeft: 8, fontSize: 16 }} placeholder="Search" value={q} onChangeText={setQ} /></View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 6 }}>
        {['All', 'Unread', 'Favorites', 'Groups'].map((t) => (
          <Pressable key={t} onPress={() => setChip(t)} style={[s.chip, chip === t && { backgroundColor: '#D9F5D5', borderColor: '#9AD79B' }]}><Text style={{ fontSize: 14, color: chip === t ? GD : '#555' }}>{t}</Text></Pressable>))}
      </View>
      <FlatList data={list} keyExtractor={(c) => c.id} renderItem={({ item }) => <ChatRow c={item} onPress={() => open(item)} />} ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>No chats yet. Tap + to start one.</Text>} />
    </View>
  );
}

function Simple({ title, icon, text }) {
  return (<View style={s.screen}><View style={s.topBar}><Round name="search" /><Round name="ellipsis-horizontal" /></View><Text style={s.h1}>{title}</Text><View style={{ alignItems: 'center', marginTop: 80 }}><Ionicons name={icon} size={56} color="#B0B5BA" /><Text style={{ color: '#777', marginTop: 12, textAlign: 'center', paddingHorizontal: 40 }}>{text}</Text></View></View>);
}

function You({ name, onOut }) {
  const rows = [['key-outline', 'Account'], ['lock-closed-outline', 'Privacy'], ['chatbubble-outline', 'Chats'], ['color-palette-outline', 'Appearance'], ['notifications-outline', 'Notifications'], ['swap-vertical', 'Storage and data']];
  const rows2 = [['help-circle-outline', 'Help and feedback'], ['heart-outline', 'Invite a friend']];
  const Card = ({ r }) => (<View style={s.card}>{r.map(([ic, t], i) => (<View key={t} style={s.setRow}><Ionicons name={ic} size={24} color="#111" /><View style={[s.setBody, i === r.length - 1 && { borderBottomWidth: 0 }]}><Text style={{ fontSize: 17 }}>{t}</Text><Ionicons name="chevron-forward" size={18} color="#8E8E93" /></View></View>))}</View>);
  return (
    <ScrollView style={s.screen}>
      <View style={s.topBar}><Round name="search" /><View style={{ flexDirection: 'row' }}><Round name="qr-code-outline" /><Round name="pencil" /></View></View>
      <View style={{ alignItems: 'center', marginBottom: 14 }}><Avatar size={72} color="#B8C0C8" /><Text style={{ fontSize: 20, fontWeight: '600', marginTop: 8 }}>{name}</Text></View>
      <Card r={rows} /><View style={{ height: 22 }} /><Card r={rows2} /><View style={{ height: 22 }} />
      <Pressable onPress={onOut} style={s.card}><Text style={{ color: '#D00', fontSize: 17, padding: 16 }}>Log out</Text></Pressable>
      <Text style={{ color: '#888', fontSize: 12, padding: 20, textAlign: 'center' }}>Not end-to-end encrypted. Admins can see reported content.</Text>
    </ScrollView>
  );
}

function Thread({ chat, me, back }) {
  const [msgs, setMsgs] = useState([]); const [peerRead, setPeerRead] = useState(null); const [t, setT] = useState(''); const [sheet, setSheet] = useState(false); const ref = useRef();
  useEffect(() => {
    let on = true;
    const load = async () => { if (!on) return; setMsgs(await listMessages(chat.id)); setPeerRead(await peerReadAt(chat.id, me)); markRead(chat.id, me); };
    load();
    const ch = sb.channel('t' + chat.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_members', filter: `chat_id=eq.${chat.id}` }, load)
      .subscribe();
    return () => { on = false; sb.removeChannel(ch); };
  }, [chat.id]);
  const send = async () => { const b = t.trim(); if (!b) return; setT('');
    const { error } = await sendMessage(chat.id, me, b); if (error) alert(error.message); };
  const items = msgs.map((m) => ({ id: m.id, mine: m.sender_id === me, body: m.removed ? 'This message was removed' : m.body, time: new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), ticks: m.sender_id === me, read: peerRead && new Date(peerRead) >= new Date(m.created_at), raw: m }));
  const games = [['images', '#1E7BF2', 'Photos'], ['camera', '#333', 'Camera'], ['location-sharp', '#25B28A', 'Location'], ['person-circle', '#777', 'Contact'], ['document', '#2A93E0', 'Document'], ['stats-chart', '#F5A623', 'Poll'], ['calendar', '#E0334C', 'Event'], ['game-controller', '#7A4DE0', 'Games']];
  return (
    <View style={[s.screen, { backgroundColor: CHATBG }]}>
      <View style={[s.topBar, { backgroundColor: 'transparent' }]}>
        <Pressable onPress={back} style={[s.round, { width: 66, flexDirection: 'row' }]}><Ionicons name="chevron-back" size={24} color="#111" /></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 8 }}><Avatar size={36} color="#D7B9A5" /><Text style={{ fontSize: 17, fontWeight: '600', marginLeft: 8 }} numberOfLines={1}>{chat.name}</Text></View>
        <View style={[s.round, { width: 100, flexDirection: 'row', justifyContent: 'space-around' }]}><Ionicons name="videocam-outline" size={24} /><Ionicons name="call-outline" size={22} /></View>
      </View>
      <FlatList ref={ref} data={items} keyExtractor={(m) => String(m.id)} contentContainerStyle={{ padding: 10 }} onContentSizeChange={() => ref.current?.scrollToEnd?.({ animated: false })}
        renderItem={({ item: m }) => (
          <Pressable onLongPress={() => !m.mine && m.raw && reportMessage(me, m.raw.id, 'Reported from chat').then(() => alert('Reported to admins'))} style={[s.bubble, m.mine ? s.out : s.inn]}>
            {m.reply && <View style={s.quote}><Text style={{ color: GD, fontWeight: '600' }}>Reply</Text><Text style={{ color: '#444' }}>{m.reply}</Text></View>}
            {m.voice ? (<View style={{ flexDirection: 'row', alignItems: 'center', width: 230 }}><Ionicons name="play" size={26} color="#555" /><View style={{ width: 8 }} /><Wave /><View style={{ width: 6 }} /></View>) : <Text style={{ fontSize: 17 }}>{m.body}</Text>}
            <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center' }}>{m.voice && <Text style={s.tm}>{m.voice}  </Text>}<Text style={s.tm}>{m.time}</Text>{m.ticks && <Ionicons name={m.read ? 'checkmark-done' : 'checkmark'} size={15} color={m.read ? '#34B7F1' : '#8696A0'} style={{ marginLeft: 3 }} />}</View>
          </Pressable>)} />
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
        <Pressable onPress={() => setSheet(!sheet)}><Ionicons name={sheet ? 'close' : 'add'} size={30} color="#111" /></Pressable>
        <View style={s.input}><TextInput style={{ flex: 1, fontSize: 17 }} value={t} onChangeText={setT} placeholder="Message" onSubmitEditing={send} /><Ionicons name="happy-outline" size={22} color="#444" /></View>
        <Ionicons name="camera-outline" size={26} color="#111" style={{ marginHorizontal: 8 }} />
        <Pressable onPress={send} style={[s.round, { backgroundColor: G, width: 40, height: 40 }]}><Ionicons name={t.trim() ? 'send' : 'mic'} size={20} color="#fff" /></Pressable>
      </View>
      {sheet && (<View style={s.sheet}>{games.map(([ic, col, lb]) => (<View key={lb} style={{ width: '25%', alignItems: 'center', marginBottom: 20 }}><View style={s.sheetIc}><Ionicons name={ic} size={26} color={col} /></View><Text style={{ fontSize: 13, marginTop: 6 }}>{lb}</Text></View>))}</View>)}
    </View>
  );
}

const Tab = ({ icon, label, on, badge, press }) => (
  <Pressable onPress={press} style={[s.tab, on && { backgroundColor: '#E4E4E8' }]}>
    <Ionicons name={icon} size={26} color="#111" />{!!badge && <View style={s.tabBadge}><Text style={s.badgeT}>{badge}</Text></View>}
    <Text style={{ fontSize: 11, fontWeight: on ? '700' : '400' }}>{label}</Text>
  </Pressable>);

export default function App() {
  const [session, setSession] = useState(null);   const [tab, setTab] = useState('chats'); const [chats, setChats] = useState([]); const [cur, setCur] = useState(null);
  useEffect(() => { sb.auth.getSession().then(({ data }) => setSession(data.session)); const { data } = sb.auth.onAuthStateChange((_e, ss) => setSession(ss)); return () => data.subscription.unsubscribe(); }, []);
  const me = session?.user?.id;
  const refresh = async () => me && setChats(await listChats(me));
  useEffect(() => {
    refresh(); if (!me) return;
    const ch = sb.channel('list' + me).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refresh).on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members' }, refresh).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [me, cur]);
  const newChat = async () => { const u = prompt('Username to message'); if (!u) return; try { const id = await openDm(u); await refresh(); setCur({ id, name: u }); } catch (e) { alert(e.message); } };
  if (!session) return <Auth />;
  const list = chats; const name = session.user.email.split('@')[0];
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      {cur ? <Thread chat={cur} me={me} back={() => setCur(null)} /> : (
        <>
          {tab === 'chats' && <Chats chats={list} open={setCur} newChat={newChat} />}
          {tab === 'updates' && <Simple title="Updates" icon="aperture-outline" text="Status updates will appear here." />}
          {tab === 'calls' && <Simple title="Calls" icon="call-outline" text="Voice and video calls are not part of this preview." />}
          {tab === 'communities' && <Simple title="Communities" icon="people-outline" text="Communities are coming later." />}
          {tab === 'you' && <You name={name} onOut={() => sb.auth.signOut()} />}
          <View style={s.tabbar}>
            <Tab icon="aperture-outline" label="Updates" on={tab === 'updates'} press={() => setTab('updates')} />
            <Tab icon="call-outline" label="Calls" on={tab === 'calls'} press={() => setTab('calls')} />
            <Tab icon="people-outline" label="Communities" on={tab === 'communities'} press={() => setTab('communities')} />
            <Tab icon="chatbubbles" label="Chats" on={tab === 'chats'} badge={chats.reduce((a, c) => a + (c.unread || 0), 0)} press={() => setTab('chats')} />
            <Tab icon="person-circle-outline" label="You" on={tab === 'you'} press={() => setTab('you')} />
          </View>
        </>)}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, minHeight: Platform.OS === 'web' ? '100vh' : undefined, backgroundColor: BG, maxWidth: 480, width: '100%', alignSelf: 'center' },
  screen: { flex: 1, backgroundColor: BG, paddingTop: Platform.OS === 'android' ? 36 : 10 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, marginLeft: 4 },
  h1: { fontSize: 34, fontWeight: '800', paddingHorizontal: 16, marginBottom: 8 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8E8EA', borderRadius: 22, marginHorizontal: 16, paddingHorizontal: 14, height: 44, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: '#C7C7CC', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  row: { flexDirection: 'row', paddingLeft: 16, paddingTop: 10 },
  rowBody: { flex: 1, marginLeft: 12, paddingRight: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C7C7CC' },
  rowName: { fontSize: 18, fontWeight: '600', flex: 1 }, rowTime: { fontSize: 15, color: '#8E8E93' }, rowLast: { fontSize: 16, color: '#8E8E93', flex: 1 },
  badge: { backgroundColor: G, borderRadius: 11, minWidth: 22, height: 22, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }, badgeT: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tabbar: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 14, marginBottom: 14, borderRadius: 32, padding: 6, elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 26 },
  tabBadge: { position: 'absolute', top: 2, right: 8, backgroundColor: G, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  card: { backgroundColor: '#fff', borderRadius: 22, marginHorizontal: 14 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18 },
  setBody: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 16, paddingVertical: 17, paddingRight: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D1D1D6' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginVertical: 4 },
  out: { backgroundColor: OUT, alignSelf: 'flex-end' }, inn: { backgroundColor: '#fff', alignSelf: 'flex-start' },
  tm: { fontSize: 12, color: '#667781' }, quote: { backgroundColor: '#C5EBC0', borderLeftWidth: 4, borderLeftColor: GD, borderRadius: 8, padding: 8, marginBottom: 4 },
  input: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: '#bbb', paddingHorizontal: 14, height: 42, marginLeft: 6 },
  sheet: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#DDE0E8', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 28 },
  sheetIc: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  field: { borderWidth: 1, borderColor: '#D0D0D5', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12 },
  btn: { backgroundColor: G, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }, btnT: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
