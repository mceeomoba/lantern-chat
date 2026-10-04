import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ScrollView, StyleSheet, Platform, StatusBar, Modal, Alert, Image, Linking, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { AudioModule, RecordingPresets, createAudioPlayer, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { sb, signIn, signUp, listChats, listMessages, sendMessage, openDm, reportMessage, peerReadAt, markRead, listGames, startGame, gameMove, startCall, setCall, listCalls, listStatuses, postStatus, uploadMedia, sendMedia, sendKind, signedUrl, postStatusPhoto, contacts } from './src/api';
import { runCall } from './src/call';
const notify = (m) => (Platform.OS === 'web' ? window.alert(m) : Alert.alert('Lantern', m));

const G = '#25D366', GD = '#128C7E', OUT = '#D9FDD3', BG = '#F2F2F7', CHATBG = '#EFEAE2';
const Avatar = ({ name, size = 52, color = '#DDD' }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 0, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="person" size={size * 0.55} color="#8A929C" />
  </View>
);
const Round = ({ name, onPress, lib = Ionicons, size = 22 }) => {
  const I = lib; return (<Pressable onPress={onPress} style={s.round}><I name={name} size={size} color="#111" /></Pressable>);
};

const STICKERS = [
  ['hello', 'hand-wave', '#FFB300', 'Hello'], ['love', 'heart', '#E91E63', 'Love'], ['lol', 'emoticon-excited', '#FF7043', 'LOL'], ['ok', 'thumb-up', '#43A047', 'Okay'],
  ['party', 'party-popper', '#7E57C2', 'Party'], ['sad', 'emoticon-sad', '#42A5F5', 'Sad'], ['fire', 'fire', '#F4511E', 'Fire'], ['sleep', 'sleep', '#5C6BC0', 'Night'],
  ['cool', 'sunglasses', '#26A69A', 'Cool'], ['think', 'head-question', '#8D6E63', 'Hmm'], ['cake', 'cake-variant', '#EC407A', 'Cake'], ['star', 'star', '#FDD835', 'Star'],
];
const StickerArt = ({ id, size = 110 }) => { const x = STICKERS.find((t) => t[0] === id) || STICKERS[0]; return (
  <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: x[2] + '22', alignItems: 'center', justifyContent: 'center' }}>
    <MaterialCommunityIcons name={x[1]} size={size * 0.55} color={x[2]} /><Text style={{ fontSize: size * 0.12, fontWeight: '700', color: x[2] }}>{x[3]}</Text></View>); };

function useSigned(path) { const [u, setU] = useState(null); useEffect(() => { let on = true; if (path) signedUrl(path).then((x) => on && setU(x)); return () => { on = false; }; }, [path]); return u; }
const MediaImg = ({ path, w = 220 }) => { const u = useSigned(path); return u ? <Image source={{ uri: u }} style={{ width: w, height: w * 0.75, borderRadius: 12 }} resizeMode="cover" /> : <View style={{ width: w, height: w * 0.75, borderRadius: 12, backgroundColor: '#ddd' }} />; };
function VoiceBubble({ m }) {
  const [on, setOn] = useState(false); const pl = useRef();
  const toggle = async () => { if (on) { pl.current?.pause(); setOn(false); return; } const u = await signedUrl(m.media_path); if (!u) return; try { await setAudioModeAsync({ playsInSilentMode: true }); } catch (e) {} pl.current?.remove?.(); pl.current = createAudioPlayer({ uri: u }); pl.current.addListener('playbackStatusUpdate', (st) => { if (st.didJustFinish) setOn(false); }); pl.current.play(); setOn(true); };
  useEffect(() => () => pl.current?.remove?.(), []);
  const d = m.duration || 0;
  return (<Pressable onPress={toggle} style={{ flexDirection: 'row', alignItems: 'center', width: 210 }}><Ionicons name={on ? 'pause' : 'play'} size={30} color="#555" /><View style={{ flex: 1, height: 4, backgroundColor: '#B0B6BB', borderRadius: 2, marginHorizontal: 8 }} /><Text style={{ fontSize: 12, color: '#667781' }}>{Math.floor(d / 60)}:{String(d % 60).padStart(2, '0')}</Text></Pressable>);
}
function MsgBody({ m }) {
  if (m.kind === 'image') return <MediaImg path={m.media_path} />;
  if (m.kind === 'voice') return <VoiceBubble m={m} />;
  if (m.kind === 'sticker') return <StickerArt id={m.body} />;
  if (m.kind === 'location') return (<Pressable onPress={() => Linking.openURL('https://www.google.com/maps?q=' + m.body)} style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="location" size={26} color="#34C38F" /><Text style={{ marginLeft: 6, fontSize: 16 }}>Shared location{'\n'}<Text style={{ color: '#0A7CFF', fontSize: 13 }}>Open in maps</Text></Text></Pressable>);
  if (m.kind === 'document') return (<Pressable onPress={async () => Linking.openURL(await signedUrl(m.media_path))} style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="document" size={26} color="#2196F3" /><Text style={{ marginLeft: 6, fontSize: 16, maxWidth: 180 }} numberOfLines={2}>{m.body}</Text></Pressable>);
  return <Text style={{ fontSize: 17 }}>{m.body}</Text>;
}

function Auth() {
  const [em, setEm] = useState(''); const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [up, setUp] = useState(false);
  const go = async (up) => { setBusy(true); setErr(''); try { if (up) { await signUp(em, u, p); } else { await signIn(em, p); } } catch (e) { setErr(e.message); } setBusy(false); };
  return (
    <View style={[s.screen, { padding: 28, justifyContent: 'center', backgroundColor: '#fff' }]}>
      <View style={{ alignItems: 'center', marginBottom: 28 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: G, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chatbubbles" size={42} color="#fff" /></View>
        <Text style={{ fontSize: 30, fontWeight: '700', marginTop: 14 }}>Lantern</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>Simple, fast messaging</Text>
      </View>
      <TextInput style={s.field} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={em} onChangeText={setEm} />
      {up && <TextInput style={s.field} placeholder="Username (a-z, 0-9, _)" autoCapitalize="none" value={u} onChangeText={setU} />}
      <TextInput style={s.field} placeholder="Password" secureTextEntry value={p} onChangeText={setP} />
      {!!err && <Text style={{ color: '#c00', marginBottom: 8 }}>{err}</Text>}
      <Pressable style={s.btn} disabled={busy} onPress={() => (up ? setUp(false) : go(false))}><Text style={s.btnT}>Log in</Text></Pressable>
      <Pressable style={[s.btn, { backgroundColor: '#fff', borderWidth: 1, borderColor: G }]} disabled={busy} onPress={() => (up ? go(true) : setUp(true))}><Text style={[s.btnT, { color: GD }]}>Create account</Text></Pressable>
            <Text style={{ color: '#888', fontSize: 12, marginTop: 24, textAlign: 'center' }}>Messages are not end-to-end encrypted. Admins can view reported content and moderate. There is no password recovery yet, so keep your password safe.</Text>
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

function Chats({ chats, open, newChat, onCamera }) {
  const [q, setQ] = useState(''); const [chip, setChip] = useState('All');
  const list = chats.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) && (chip !== 'Unread' || c.unread) && (chip !== 'Groups' || c.kind === 'group'));
  return (
    <View style={s.screen}>
      <View style={s.topBar}><View /><View style={{ flexDirection: 'row' }}><Pressable onPress={onCamera} style={s.round}><Ionicons name="camera" size={22} color="#111" /></Pressable><Pressable onPress={newChat} style={[s.round, { backgroundColor: G, marginLeft: 10 }]}><Ionicons name="add" size={26} color="#fff" /></Pressable></View></View>
      <Text style={s.h1}>Chats</Text>
      <View style={s.search}><Ionicons name="search" size={18} color="#8E8E93" /><TextInput style={{ flex: 1, marginLeft: 8, fontSize: 16 }} placeholder="Search" value={q} onChangeText={setQ} /></View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 6 }}>
        {['All', 'Unread', 'Groups'].map((t) => (
          <Pressable key={t} onPress={() => setChip(t)} style={[s.chip, chip === t && { backgroundColor: '#D9F5D5', borderColor: '#9AD79B' }]}><Text style={{ fontSize: 14, color: chip === t ? GD : '#555' }}>{t}</Text></Pressable>))}
      </View>
      <FlatList data={list} keyExtractor={(c) => c.id} renderItem={({ item }) => <ChatRow c={item} onPress={() => open(item)} />} ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>No chats yet. Tap + to start one.</Text>} />
    </View>
  );
}


function You({ name, onOut }) {
  const rows = [['person-outline', 'Account: ' + name], ['lock-closed-outline', 'Messages are not end-to-end encrypted']];
  const rows2 = [];
  const Card = ({ r }) => (<View style={s.card}>{r.map(([ic, t], i) => (<View key={t} style={s.setRow}><Ionicons name={ic} size={24} color="#111" /><View style={[s.setBody, i === r.length - 1 && { borderBottomWidth: 0 }]}><Text style={{ fontSize: 17 }}>{t}</Text><Ionicons name="chevron-forward" size={18} color="#8E8E93" /></View></View>))}</View>);
  return (
    <ScrollView style={s.screen}>
      
      <View style={{ alignItems: 'center', marginBottom: 14 }}><Avatar size={72} color="#B8C0C8" /><Text style={{ fontSize: 20, fontWeight: '600', marginTop: 8 }}>{name}</Text></View>
      <Card r={rows} /><View style={{ height: 22 }} />
      <Pressable onPress={onOut} style={s.card}><Text style={{ color: '#D00', fontSize: 17, padding: 16 }}>Log out</Text></Pressable>
      <Text style={{ color: '#888', fontSize: 12, padding: 20, textAlign: 'center' }}>Not end-to-end encrypted. Admins can see reported content.</Text>
    </ScrollView>
  );
}

function GameCard({ g, me, move }) {
  const mine = g.p1 === me; const myTurn = g.turn === me; const over = g.status === 'done';
  const msg = over ? (g.winner ? (g.winner === me ? 'You won' : 'You lost') : 'Draw') : g.p2 == null ? (mine ? 'Waiting for opponent' : 'Tap a square to join') : myTurn ? 'Your turn' : "Opponent's turn";
  const can = !over && (g.p2 == null ? true : myTurn) && !(g.p2 == null && false);
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: '#fff', borderRadius: 18, padding: 12, marginVertical: 6, width: 220 }}>
      <Text style={{ fontWeight: '700', fontSize: 15, marginBottom: 8 }}>Tic-Tac-Toe</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 196 }}>
        {g.board.split('').map((c, i) => (
          <Pressable key={i} disabled={!can || c !== '-'} onPress={() => move(g.id, i)} style={{ width: 62, height: 62, margin: 1, borderRadius: 10, backgroundColor: '#F0F0F5', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: c === 'X' ? '#7B4DFF' : '#FF7A29' }}>{c === '-' ? '' : c}</Text>
          </Pressable>))}
      </View>
      <Text style={{ marginTop: 8, color: over ? GD : '#555', fontWeight: '600' }}>{msg}</Text>
    </View>);
}

const ago = (t) => { const d = new Date(t); const same = d.toDateString() === new Date().toDateString(); return same ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(); };

function Updates({ me }) {
  const [rows, setRows] = useState([]); const [t, setT] = useState('');
  const load = async () => setRows(await listStatuses());
  useEffect(() => { load(); const ch = sb.channel('st').on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, load).subscribe(); return () => { sb.removeChannel(ch); }; }, []);
  const post = async () => { const b = t.trim(); if (!b) return; setT(''); const { error } = await postStatus(b); if (error) notify(error.message); };
  return (
    <View style={s.screen}>
      <Text style={[s.h1, { marginTop: 50 }]}>Updates</Text>
      <View style={[s.search, { marginBottom: 10 }]}><TextInput style={{ flex: 1, fontSize: 16 }} placeholder="Share a status (disappears in 24h)" value={t} onChangeText={setT} onSubmitEditing={post} /><Pressable onPress={post}><Ionicons name="send" size={20} color={GD} /></Pressable></View>
      <Text style={{ fontSize: 20, fontWeight: '700', paddingHorizontal: 16, marginBottom: 6 }}>Status</Text>
      <FlatList data={rows} keyExtractor={(r) => String(r.id)} renderItem={({ item }) => (
        <View style={s.row}><View style={{ borderWidth: 2.5, borderColor: G, borderRadius: 30, padding: 2 }}><Avatar size={46} color="#C9CED6" /></View>
          <View style={s.rowBody}><Text style={s.rowName}>{item.user_id === me ? 'My status' : item.name}</Text>{item.media_path ? <MediaImg path={item.media_path} w={180} /> : <Text style={s.rowLast} numberOfLines={2}>{item.body}</Text>}<Text style={s.rowTime}>{ago(item.created_at)}</Text></View></View>)}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 30 }}>No recent updates.</Text>} />
    </View>);
}

function Calls({ me, call }) {
  const [rows, setRows] = useState([]);
  const load = async () => setRows(await listCalls(me));
  useEffect(() => { load(); const ch = sb.channel('cl').on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, load).subscribe(); return () => { sb.removeChannel(ch); }; }, []);
  const label = (r) => (r.status === 'ringing' || r.status === 'missed') ? (r.out ? 'No answer' : 'Missed') : r.status === 'declined' ? 'Declined' : r.out ? 'Outgoing' : 'Incoming';
  return (
    <View style={s.screen}>
      <Text style={[s.h1, { marginTop: 50 }]}>Calls</Text>
      <Text style={{ fontSize: 20, fontWeight: '700', paddingHorizontal: 16, marginBottom: 6 }}>Recent</Text>
      <FlatList data={rows} keyExtractor={(r) => String(r.id)} renderItem={({ item }) => {
        const bad = !item.out && (item.status === 'missed' || item.status === 'ringing');
        return (<Pressable onPress={() => call(item)} style={s.row}><Avatar color="#C9CED6" />
          <View style={[s.rowBody, { flexDirection: 'row', alignItems: 'center' }]}><View style={{ flex: 1 }}><Text style={[s.rowName, bad && { color: '#E0143C' }]}>{item.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name={item.out ? 'arrow-up' : 'arrow-down'} size={14} color="#8E8E93" /><Text style={s.rowLast}> {label(item)}</Text></View></View>
            <Text style={s.rowTime}>{ago(item.created_at)}</Text></View></Pressable>); }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 30 }}>No calls yet. Open a chat and tap the phone icon.</Text>} />
    </View>);
}

function CallScreen({ c, me, end }) {
  const [state, setState] = useState(c.caller ? 'Calling...' : 'Connecting...'); const [muted, setMuted] = useState(false); const h = useRef();
  useEffect(() => {
    let alive = true;
    runCall({ id: c.id, caller: c.caller, onState: (x) => { if (!alive) return; if (x === 'connected') setState('Connected'); else { setState(x === 'failed' ? 'Call failed' : 'Call ended'); setTimeout(end, 900); } } })
      .then((x) => { h.current = x; }).catch((e) => { notify(e.message); setCall(c.id, 'ended'); end(); });
    return () => { alive = false; };
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#1C1C1E', alignItems: 'center', paddingTop: 120 }}>
      <Avatar size={110} color="#3A3A3C" /><Text style={{ color: '#fff', fontSize: 28, fontWeight: '600', marginTop: 20 }}>{c.name}</Text><Text style={{ color: '#aaa', fontSize: 17, marginTop: 6 }}>{state}</Text>
      <View style={{ flexDirection: 'row', position: 'absolute', bottom: 80 }}>
        <Pressable onPress={() => { const m = !muted; setMuted(m); h.current?.mute(m); }} style={[s.round, { width: 64, height: 64, borderRadius: 32, marginHorizontal: 20, backgroundColor: muted ? '#fff' : '#3A3A3C' }]}><Ionicons name={muted ? 'mic-off' : 'mic'} size={28} color={muted ? '#111' : '#fff'} /></Pressable>
        <Pressable onPress={() => (h.current ? h.current.hang() : (setCall(c.id, 'ended'), end()))} style={[s.round, { width: 64, height: 64, borderRadius: 32, marginHorizontal: 20, backgroundColor: '#E0143C' }]}><Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} /></Pressable>
      </View>
    </View>);
}

function Thread({ chat, me, back, onCall }) {
  const [msgs, setMsgs] = useState([]); const [peerRead, setPeerRead] = useState(null); const [t, setT] = useState(''); const ref = useRef(); const [games, setGames] = useState([]); const [sheet, setSheet] = useState(false); const [stk, setStk] = useState(false); const [recing, setRecing] = useState(false); const rec = useAudioRecorder(RecordingPresets.HIGH_QUALITY); const t0 = useRef(0);
  useEffect(() => {
    let on = true;
    const load = async () => { if (!on) return; setMsgs(await listMessages(chat.id)); setPeerRead(await peerReadAt(chat.id, me)); setGames(await listGames(chat.id)); markRead(chat.id, me); };
    load();
    const ch = sb.channel('t' + chat.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `chat_id=eq.${chat.id}` }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_members', filter: `chat_id=eq.${chat.id}` }, load)
      .subscribe();
    return () => { on = false; sb.removeChannel(ch); };
  }, [chat.id]);
  const send = async () => { const b = t.trim(); if (!b) return; setT('');
    const { error } = await sendMessage(chat.id, me, b); if (error) notify(error.message); };
  const fail = (e) => notify(e?.message || String(e));
  const sendPhoto = async (cam) => { setSheet(false); try {
    const perm = cam ? await ImagePicker.requestCameraPermissionsAsync() : { granted: true };
    if (!perm.granted) return notify('Camera permission is needed');
    const r = cam ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled) return; const a = r.assets[0]; const ext = (a.mimeType || 'image/jpeg').split('/')[1] || 'jpg';
    const path = await uploadMedia(me, a.uri, a.mimeType || 'image/jpeg', ext, chat.id); const { error } = await sendMedia(chat.id, me, 'image', path, 'Photo'); if (error) throw error; } catch (e) { fail(e); } };
  const sendDoc = async () => { setSheet(false); try { const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true }); if (r.canceled) return; const a = r.assets[0];
    const ext = (a.name.split('.').pop() || 'bin').slice(0, 8); const path = await uploadMedia(me, a.uri, a.mimeType || 'application/octet-stream', ext, chat.id); const { error } = await sendMedia(chat.id, me, 'document', path, a.name); if (error) throw error; } catch (e) { fail(e); } };
  const sendLoc = async () => { setSheet(false); try { const p = await Location.requestForegroundPermissionsAsync(); if (!p.granted) return notify('Location permission is needed'); const pos = await Location.getCurrentPositionAsync({}); const { error } = await sendKind(chat.id, me, 'location', `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`); if (error) throw error; } catch (e) { fail(e); } };
  const sendSticker = async (id) => { setStk(false); const { error } = await sendKind(chat.id, me, 'sticker', id); if (error) fail(error); };
  const micTap = async () => { try {
    if (!recing) { const p = await AudioModule.requestRecordingPermissionsAsync(); if (!p.granted) return notify('Microphone permission is needed'); await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }); await rec.prepareToRecordAsync(); rec.record(); t0.current = Date.now(); setRecing(true); }
    else { setRecing(false); await rec.stop(); const uri = rec.uri; const d = Math.max(1, Math.round((Date.now() - t0.current) / 1000)); if (!uri) return; const path = await uploadMedia(me, uri, 'audio/mp4', 'm4a', chat.id); const { error } = await sendMedia(chat.id, me, 'voice', path, 'Voice message', d); if (error) throw error; }
  } catch (e) { setRecing(false); fail(e); } };
  const newGame = async () => { setSheet(false); try { await startGame(chat.id); setGames(await listGames(chat.id)); } catch (e) { notify(e.message); } };
  const move = async (id, i) => { try { await gameMove(id, i); } catch (e) { notify(e.message); } };
  const gitems = games.map((g) => ({ id: 'g' + g.id, game: g, time: new Date(g.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), ts: g.created_at }));
  const items0 = msgs.map((m) => ({ id: m.id, mine: m.sender_id === me, body: m.removed ? 'This message was removed' : m.body, raw: m.removed ? { body: 'This message was removed', kind: 'text' } : m, time: new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), ticks: m.sender_id === me, read: peerRead && new Date(peerRead) >= new Date(m.created_at), ts: m.created_at, orig: m }));
  const items = [...items0, ...gitems].sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  return (
    <View style={[s.screen, { backgroundColor: CHATBG }]}>
      <View style={[s.topBar, { backgroundColor: 'transparent' }]}>
        <Pressable onPress={back} style={[s.round, { width: 66, flexDirection: 'row' }]}><Ionicons name="chevron-back" size={24} color="#111" /></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 8 }}><Avatar size={36} color="#D7B9A5" /><Text style={{ fontSize: 17, fontWeight: '600', marginLeft: 8 }} numberOfLines={1}>{chat.name}</Text></View>
        <Pressable onPress={() => onCall(chat)} style={s.round}><Ionicons name="call-outline" size={22} color="#111" /></Pressable>
      </View>
      <FlatList ref={ref} data={items} keyExtractor={(m) => String(m.id)} contentContainerStyle={{ padding: 10 }} onContentSizeChange={() => ref.current?.scrollToEnd?.({ animated: false })}
        renderItem={({ item: m }) => m.game ? <GameCard g={m.game} me={me} move={move} /> : (
          <Pressable onLongPress={() => !m.mine && m.orig && reportMessage(me, m.orig.id, 'Reported from chat').then(() => notify('Reported to admins'))} style={[s.bubble, m.mine ? s.out : s.inn]}>
                        <MsgBody m={m.raw || { body: m.body }} />
            <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center' }}><Text style={s.tm}>{m.time}</Text>{m.ticks && <Ionicons name={m.read ? 'checkmark-done' : 'checkmark'} size={15} color={m.read ? '#34B7F1' : '#8696A0'} style={{ marginLeft: 3 }} />}</View>
          </Pressable>)} />
      <Modal transparent visible={sheet} animationType="slide" onRequestClose={() => setSheet(false)}><Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0003' }} onPress={() => setSheet(false)}><View style={{ backgroundColor: '#DDE0E8', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, flexDirection: 'row', flexWrap: 'wrap' }}>
        {[['Photos', 'images', '#1E88E5', () => sendPhoto(false)], ['Camera', 'camera', '#455A64', () => sendPhoto(true)], ['Location', 'location', '#26A69A', sendLoc], ['Document', 'document', '#2196F3', sendDoc], ['Games', 'game-controller', '#7B4DFF', newGame]].map(([l, ic, col, fn]) => (
          <Pressable key={l} onPress={fn} style={{ alignItems: 'center', width: '25%', marginVertical: 10 }}><View style={s.sheetIc}><Ionicons name={ic} size={28} color={col} /></View><Text style={{ marginTop: 6, fontSize: 13 }}>{l === 'Games' ? 'Tic-Tac-Toe' : l}</Text></Pressable>))}
      </View></Pressable></Modal>
      <Modal transparent visible={stk} animationType="slide" onRequestClose={() => setStk(false)}><Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0003' }} onPress={() => setStk(false)}><View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
        {STICKERS.map((x) => (<Pressable key={x[0]} onPress={() => sendSticker(x[0])} style={{ margin: 6 }}><StickerArt id={x[0]} size={78} /></Pressable>))}
      </View></Pressable></Modal>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
        <Pressable onPress={() => setSheet(true)} style={{ paddingHorizontal: 6 }}><Ionicons name="add" size={32} color="#111" /></Pressable>
        <View style={s.input}><TextInput style={{ flex: 1, fontSize: 17 }} value={recing ? 'Recording... tap the mic to send' : t} editable={!recing} onChangeText={setT} placeholder="Message" onSubmitEditing={send} /><Pressable onPress={() => setStk(true)}><MaterialCommunityIcons name="sticker-emoji" size={24} color="#666" /></Pressable></View>
        {!t.trim() && !recing && <Pressable onPress={() => sendPhoto(true)} style={{ paddingHorizontal: 8 }}><Ionicons name="camera-outline" size={28} color="#111" /></Pressable>}
        {t.trim() ? <Pressable onPress={send} style={[s.round, { backgroundColor: G, width: 40, height: 40 }]}><Ionicons name="send" size={20} color="#fff" /></Pressable>
          : <Pressable onPress={micTap} style={[s.round, { backgroundColor: recing ? '#E0143C' : G, width: 40, height: 40 }]}><Ionicons name={recing ? 'stop' : 'mic'} size={22} color="#fff" /></Pressable>}
      </View>
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
  const [live, setLive] = useState(null); const [incoming, setIncoming] = useState(null);
  const placeCall = async (x) => { try { const id = await startCall(x.chat_id || x.id); setLive({ id, caller: true, name: x.name }); } catch (e) { notify(e.message); } };
  useEffect(() => { if (!me) return; const ch = sb.channel('inc' + me).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls', filter: `callee=eq.${me}` }, async (p) => { const r = p.new; const { data } = await sb.from('profiles').select('username,display_name').eq('id', r.caller).maybeSingle(); setIncoming({ id: r.id, name: data?.display_name || data?.username || 'Unknown' }); }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: `callee=eq.${me}` }, (p) => { if (p.new.status !== 'ringing') setIncoming((i) => (i && i.id === p.new.id ? null : i)); }).subscribe(); return () => { sb.removeChannel(ch); }; }, [me]);
  const [askOpen, setAskOpen] = useState(false); const [askU, setAskU] = useState(''); const [cons, setCons] = useState([]);
  const newChat = async () => { setAskU(''); setAskOpen(true); setCons(await contacts(me)); };
  const postPhotoStatus = async () => { try { const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 }); if (r.canceled) return; const a = r.assets[0]; const path = await uploadMedia(me, a.uri, a.mimeType || 'image/jpeg', (a.mimeType || 'image/jpeg').split('/')[1] || 'jpg', 'status'); const { error } = await postStatusPhoto(me, path); if (error) throw error; setTab('updates'); } catch (e) { notify(e.message); } };
  const goDm = async (name) => { const u = typeof name === 'string' ? name : askU; setAskOpen(false); if (!u.trim()) return; try { const id = await openDm(u); await refresh(); setCur({ id, name: u }); } catch (e) { notify(e.message); } };
  if (!session) return <Auth />;
  const list = chats; const name = session.user.user_metadata?.username || session.user.email.split('@')[0];
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      <Modal transparent visible={askOpen} animationType="fade" onRequestClose={() => setAskOpen(false)}><View style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 30 }}><View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 18 }}><Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 10 }}>New chat</Text>{cons.length ? <ScrollView style={{ maxHeight: 180, marginBottom: 8 }}>{cons.map((c) => (<Pressable key={c.id} onPress={() => goDm(c.username)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}><Avatar size={36} color="#C9CED6" /><Text style={{ marginLeft: 10, fontSize: 16 }}>{c.display_name || c.username}</Text></Pressable>))}</ScrollView> : null}<Text style={{ color: '#666', marginBottom: 6 }}>Or message a new username</Text><TextInput style={s.field} placeholder="Username" autoCapitalize="none" value={askU} onChangeText={setAskU} /><Pressable style={s.btn} onPress={() => goDm()}><Text style={s.btnT}>Start chat</Text></Pressable><Pressable onPress={() => setAskOpen(false)}><Text style={{ textAlign: 'center', color: '#666' }}>Cancel</Text></Pressable></View></View></Modal>
      {live ? <CallScreen c={live} me={me} end={() => setLive(null)} /> : null}
      {incoming && !live ? (<View style={{ position: 'absolute', top: 40, left: 12, right: 12, zIndex: 9, backgroundColor: '#1C1C1E', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{incoming.name}</Text><Text style={{ color: '#aaa' }}>Lantern voice call</Text></View><Pressable onPress={() => { setCall(incoming.id, 'declined'); setIncoming(null); }} style={[s.round, { backgroundColor: '#E0143C', marginRight: 10 }]}><Ionicons name="call" size={22} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} /></Pressable><Pressable onPress={() => { setLive({ id: incoming.id, caller: false, name: incoming.name }); setIncoming(null); }} style={[s.round, { backgroundColor: G }]}><Ionicons name="call" size={22} color="#fff" /></Pressable></View>) : null}
      {live ? null : cur ? <Thread chat={cur} me={me} back={() => setCur(null)} onCall={placeCall} /> : (
        <>
          {tab === 'updates' && <Updates me={me} />}
          {tab === 'calls' && <Calls me={me} call={placeCall} />}
          {tab === 'chats' && <Chats chats={list} open={setCur} newChat={newChat} onCamera={postPhotoStatus} />}
          {tab === 'you' && <You name={name} onOut={() => sb.auth.signOut()} />}
          <View style={s.tabbar}>
            <Tab icon="aperture-outline" label="Updates" on={tab === 'updates'} press={() => setTab('updates')} />
            <Tab icon="call-outline" label="Calls" on={tab === 'calls'} press={() => setTab('calls')} />
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
