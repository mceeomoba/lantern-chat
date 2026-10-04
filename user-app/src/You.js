import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, Alert, Image, Switch, Share, StyleSheet, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { sb, avatarUrl, friendly } from './api';
import { Glass } from './glass';
import { useSettings, setSetting, wallpapers, sizes } from './settings';

const G = '#25D366', GD = '#128C7E';
const note = (m) => Alert.alert('Lantern', m);
const T = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: Platform.OS === 'android' ? 40 : 14, paddingBottom: 6 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 24, marginHorizontal: 14, marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 16, paddingVertical: 16, paddingRight: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(60,60,67,0.25)' },
  field: { borderWidth: 1, borderColor: '#D0D0D5', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, backgroundColor: '#fff' },
  btn: { backgroundColor: G, borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10 },
  btnT: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
const Row = ({ icon, title, value, onPress, last, valueGreen, right }) => (
  <Pressable onPress={onPress} style={T.row}>
    {icon ? <Ionicons name={icon} size={24} color="#111" /> : null}
    <View style={[T.body, !icon && { marginLeft: 0, paddingLeft: 0 }, last && { borderBottomWidth: 0 }]}>
      <Text style={{ fontSize: 17, flex: 1, color: '#111' }}>{title}</Text>
      {value ? <Text style={{ fontSize: 16, color: valueGreen ? GD : '#6B6B70', maxWidth: '55%' }} numberOfLines={1}>{value}</Text> : null}
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color="#8E8E93" style={{ marginLeft: 6 }} /> : null}
    </View>
  </Pressable>
);
const Toggle = ({ title, sub, k, st, last }) => (
  <View style={T.row}><View style={[T.body, { marginLeft: 0, paddingLeft: 0 }, last && { borderBottomWidth: 0 }]}>
    <View style={{ flex: 1, paddingRight: 10 }}><Text style={{ fontSize: 17, color: '#111' }}>{title}</Text>{sub ? <Text style={{ fontSize: 13, color: '#6B6B70', marginTop: 2 }}>{sub}</Text> : null}</View>
    <Switch value={!!st[k]} onValueChange={(v) => setSetting(k, v)} trackColor={{ true: G, false: '#C7C7CC' }} thumbColor="#fff" />
  </View></View>
);
const Card = ({ children, style }) => <Glass style={[T.card, style]}>{children}</Glass>;
const Av = ({ path, size, onPress }) => (
  <Pressable onPress={onPress} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {path ? <Image source={{ uri: avatarUrl(path) }} style={{ width: size, height: size }} /> : <Ionicons name="person" size={size * 0.55} color="#8A929C" />}
  </Pressable>
);
function Page({ title, onBack, children }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}>
      <View style={T.top}><Glass style={[T.round]} intensity={50}><Pressable onPress={onBack} style={T.round}><Ionicons name="chevron-back" size={24} color="#111" /></Pressable></Glass>
        <Text style={{ fontSize: 17, fontWeight: '700' }}>{title}</Text><View style={{ width: 44 }} /></View>
      <ScrollView contentContainerStyle={{ paddingBottom: 130, paddingTop: 10 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </View>
  );
}
function Ask({ vis, title, value, onClose, onSave, multiline, max, secure, keyboard, hint }) {
  const [v, setV] = useState(value || '');
  useEffect(() => { if (vis) setV(value || ''); }, [vis]);
  return (
    <Modal transparent visible={vis} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 22, padding: 18 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 10 }}>{title}</Text>
          <TextInput style={[T.field, multiline && { height: 90, textAlignVertical: 'top' }]} value={v} onChangeText={setV} maxLength={max} multiline={multiline} secureTextEntry={secure} keyboardType={keyboard} autoCapitalize="none" autoFocus />
          {hint ? <Text style={{ color: '#6B6B70', fontSize: 13, marginBottom: 10 }}>{hint}</Text> : null}
          <Pressable style={T.btn} onPress={() => onSave(v)}><Text style={T.btnT}>Save</Text></Pressable>
          <Pressable onPress={onClose}><Text style={{ textAlign: 'center', color: '#666', padding: 4 }}>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}
export function useMe(me, fallback) {
  const [p, setP] = useState({ username: fallback, display_name: '', bio: '', status_text: '', avatar_path: null, links: [], phone: '' });
  const load = useCallback(async () => {
    const { data } = await sb.from('profiles').select('username,display_name,bio,status_text,avatar_path,links').eq('id', me).maybeSingle();
    const { data: pr } = await sb.from('profile_private').select('phone').eq('id', me).maybeSingle();
    if (data) setP({ ...data, links: data.links || [], phone: pr?.phone || '' });
  }, [me]);
  useEffect(() => { load(); }, [load]);
  return [p, load];
}

export default function You({ me, name, onOut }) {
  const st = useSettings(); const [p, load] = useMe(me, name);
  const [page, setPage] = useState(null); const [ask, setAsk] = useState(null);
  const shown = p.display_name || p.username;
  const upd = async (patch) => { const { error } = await sb.from('profiles').update(patch).eq('id', me); if (error) return note(error.message); load(); };
  const pickPhoto = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1] });
      if (r.canceled) return; const a = r.assets[0]; const mime = a.mimeType === 'image/png' ? 'image/png' : 'image/jpeg'; const ext = mime === 'image/png' ? 'png' : 'jpg';
      const buf = await (await fetch(a.uri)).arrayBuffer(); const path = `${me}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await sb.storage.from('avatars').upload(path, buf, { contentType: mime }); if (error) throw error;
      const old = p.avatar_path; await upd({ avatar_path: path }); if (old) sb.storage.from('avatars').remove([old]);
    } catch (e) { note(e.message || 'Could not upload photo'); }
  };
  const savePhone = async (v) => { const x = v.trim(); const { error } = x ? await sb.from('profile_private').upsert({ id: me, phone: x }) : await sb.from('profile_private').delete().eq('id', me); if (error) return note('Enter a valid phone number (digits, optional +).'); setAsk(null); load(); };
  const saveUser = async (v) => { const { error } = await sb.rpc('change_username', { u: v }); if (error) return note(friendly(error)); setAsk(null); load(); };
  const close = () => { setPage(null); load(); };

  const main = (
    <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
      <View style={T.top}><View style={{ width: 44 }} /><Glass style={[T.round, { width: 'auto', paddingHorizontal: 6, flexDirection: 'row' }]} intensity={50}><Pressable onPress={() => setPage('profile')} style={T.round}><Ionicons name="create-outline" size={22} color="#111" /></Pressable></Glass></View>
      <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 14 }}>
        <Pressable onPress={() => setAsk('status')} style={{ marginBottom: 6 }}><Glass style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxWidth: 260 }} intensity={50}><Text style={{ color: p.status_text ? '#222' : '#6B6B70' }} numberOfLines={1}>{p.status_text || 'Set a status'}</Text></Glass></Pressable>
        <Av path={p.avatar_path} size={112} onPress={() => setPage('profile')} />
        <Text style={{ fontSize: 26, fontWeight: '800', marginTop: 10 }}>{shown}</Text>
        <Text style={{ color: '#6B6B70', fontSize: 16 }}>@{p.username}</Text>
      </View>
      <Card>
        <Row icon="key-outline" title="Account" onPress={() => setPage('account')} />
        <Row icon="lock-closed-outline" title="Privacy" onPress={() => setPage('privacy')} />
        <Row icon="chatbubble-outline" title="Chats" onPress={() => setPage('chats')} />
        <Row icon="color-palette-outline" title="Appearance" onPress={() => setPage('appearance')} />
        <Row icon="notifications-outline" title="Notifications" onPress={() => setPage('notif')} />
        <Row icon="swap-vertical" title="Storage and data" onPress={() => setPage('storage')} last />
      </Card>
      <Card>
        <Row icon="help-circle-outline" title="Help and feedback" onPress={() => setPage('help')} />
        <Row icon="heart-outline" title="Invite a friend" onPress={() => setPage('invite')} last />
      </Card>
      <Card><Pressable onPress={onOut}><Text style={{ color: '#D00', fontSize: 17, padding: 16 }}>Log out</Text></Pressable></Card>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1 }}>
      {main}
      {page === 'profile' && (
        <Page title="Profile" onBack={close}>
          <View style={{ alignItems: 'center', marginVertical: 14 }}><Av path={p.avatar_path} size={150} onPress={pickPhoto} /><Pressable onPress={pickPhoto}><Text style={{ color: GD, fontWeight: '700', fontSize: 17, marginTop: 12 }}>Edit photo</Text></Pressable>
            {p.avatar_path ? <Pressable onPress={async () => { const o = p.avatar_path; await upd({ avatar_path: null }); sb.storage.from('avatars').remove([o]); }}><Text style={{ color: '#D00', marginTop: 8 }}>Remove photo</Text></Pressable> : null}</View>
          <Card>
            <Row title="Name" value={p.display_name || p.username} onPress={() => setAsk('name')} />
            <Row title="About" value={p.bio || "What's happening?"} valueGreen={!p.bio} onPress={() => setAsk('about')} />
            <Row title="Username" value={p.username} onPress={() => setAsk('user')} />
            <Row title="Phone number" value={p.phone || 'Add number'} valueGreen={!p.phone} onPress={() => setAsk('phone')} />
            <Row title="Links" value={p.links.length ? `${p.links.length} link${p.links.length > 1 ? 's' : ''}` : 'Add links'} valueGreen={!p.links.length} onPress={() => setPage('links')} last />
          </Card>
          <Text style={{ marginHorizontal: 24, color: '#6B6B70', fontSize: 13 }}>Name, username, about, status, photo and links are visible to other Lantern users. Your phone number is private: only you can see it.</Text>
        </Page>)}
      {page === 'links' && <LinksPage links={p.links} onBack={() => setPage('profile')} save={(l) => upd({ links: l })} />}
      {page === 'account' && <AccountPage onBack={close} />}
      {page === 'privacy' && <PrivacyPage me={me} st={st} onBack={close} />}
      {page === 'chats' && (
        <Page title="Chats" onBack={close}>
          <Card><Toggle st={st} k="previews" title="Message previews" sub="Show the last message under each chat in your list." last /></Card>
          <Card style={{ padding: 16 }}><Text style={{ fontSize: 17, marginBottom: 10 }}>Text size</Text>
            <View style={{ flexDirection: 'row' }}>{[['s', 'Small'], ['m', 'Default'], ['l', 'Large']].map(([k, l]) => (<Pressable key={k} onPress={() => setSetting('textsize', k)} style={{ flex: 1, alignItems: 'center', padding: 10, borderRadius: 14, marginRight: 6, backgroundColor: st.textsize === k ? G : 'rgba(255,255,255,0.6)' }}><Text style={{ color: st.textsize === k ? '#fff' : '#111', fontWeight: '600' }}>{l}</Text></Pressable>))}</View>
            <View style={{ backgroundColor: 'rgba(217,253,211,0.9)', alignSelf: 'flex-end', borderRadius: 16, padding: 10, marginTop: 14 }}><Text style={{ fontSize: sizes[st.textsize] }}>This is how messages will look.</Text></View></Card>
        </Page>)}
      {page === 'appearance' && (
        <Page title="Appearance" onBack={close}>
          <Card style={{ padding: 16 }}><Text style={{ fontSize: 17, marginBottom: 12 }}>Chat wallpaper</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Object.entries(wallpapers).map(([k, c]) => (<Pressable key={k} onPress={() => setSetting('wallpaper', k)} style={{ width: 64, height: 64, borderRadius: 18, marginRight: 12, marginBottom: 12, backgroundColor: c || '#CFEFE3', borderWidth: st.wallpaper === k ? 3 : 1, borderColor: st.wallpaper === k ? GD : 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>{k === 'glass' ? <Ionicons name="water-outline" size={26} color="#4A6" /> : null}</Pressable>))}</View>
            <Text style={{ color: '#6B6B70', fontSize: 13 }}>Glass shows the frosted gradient behind your messages.</Text></Card>
        </Page>)}
      {page === 'notif' && (
        <Page title="Notifications" onBack={close}>
          <Card><Toggle st={st} k="notif_msg" title="Message notifications" sub="Push alerts for new messages." /><Toggle st={st} k="notif_preview" title="Show message text" sub="When off, alerts say only 'New message'." /><Toggle st={st} k="notif_call" title="Call notifications" sub="Push alerts for incoming voice calls." last /></Card>
          <Text style={{ marginHorizontal: 24, color: '#6B6B70', fontSize: 13 }}>Alerts also depend on the Android notification permission for Lantern in system settings.</Text>
        </Page>)}
      {page === 'storage' && <StoragePage st={st} onBack={close} />}
      {page === 'help' && <HelpPage me={me} onBack={close} />}
      {page === 'invite' && (
        <Page title="Invite a friend" onBack={close}>
          <Card style={{ padding: 18 }}><Text style={{ fontSize: 17, marginBottom: 8 }}>Tell a friend to join Lantern</Text><Text style={{ color: '#6B6B70', marginBottom: 14 }}>They sign up with an email, a username and a password, then find you by your username: @{p.username}</Text>
            <Pressable style={T.btn} onPress={() => Share.share({ message: `Join me on Lantern. Download: https://github.com/mceeomoba/lantern-chat/releases/latest - find me as @${p.username}` })}><Text style={T.btnT}>Share invite</Text></Pressable></Card>
        </Page>)}
      <Ask vis={ask === 'name'} title="Name" value={p.display_name} max={40} onClose={() => setAsk(null)} onSave={(v) => { upd({ display_name: v.trim().slice(0, 40) }); setAsk(null); }} />
      <Ask vis={ask === 'about'} title="About" value={p.bio} max={140} multiline onClose={() => setAsk(null)} onSave={(v) => { upd({ bio: v.trim().slice(0, 140) }); setAsk(null); }} />
      <Ask vis={ask === 'status'} title="Status" value={p.status_text} max={60} hint="Shown above your photo." onClose={() => setAsk(null)} onSave={(v) => { upd({ status_text: v.trim().slice(0, 60) }); setAsk(null); }} />
      <Ask vis={ask === 'user'} title="Username" value={p.username} max={20} hint="3-20 letters, numbers or underscore. People find you with it." onClose={() => setAsk(null)} onSave={saveUser} />
      <Ask vis={ask === 'phone'} title="Phone number" value={p.phone} max={20} keyboard="phone-pad" hint="Private. Only you can see it. Leave empty to remove." onClose={() => setAsk(null)} onSave={savePhone} />
    </View>
  );
}

function LinksPage({ links, onBack, save }) {
  const [l, setL] = useState(links || []); const [t, setT] = useState('');
  const add = () => { let u = t.trim(); if (!u) return; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(u)) return note('Enter a valid link.'); if (l.length >= 3) return note('You can add up to 3 links.'); const n = [...l, { url: u.slice(0, 200) }]; setL(n); setT(''); save(n); };
  const del = (i) => { const n = l.filter((_, j) => j !== i); setL(n); save(n); };
  return (
    <Page title="Links" onBack={onBack}>
      <Card>{l.length ? l.map((x, i) => (<View key={i} style={T.row}><View style={[T.body, { marginLeft: 0, paddingLeft: 0 }, i === l.length - 1 && { borderBottomWidth: 0 }]}><Text style={{ flex: 1, color: GD, fontSize: 16 }} numberOfLines={1}>{x.url}</Text><Pressable onPress={() => del(i)}><Ionicons name="trash-outline" size={20} color="#D00" /></Pressable></View></View>)) : <Text style={{ padding: 16, color: '#6B6B70' }}>No links yet.</Text>}</Card>
      <Card style={{ padding: 16 }}><TextInput style={T.field} placeholder="example.com/me" value={t} onChangeText={setT} autoCapitalize="none" keyboardType="url" /><Pressable style={T.btn} onPress={add}><Text style={T.btnT}>Add link</Text></Pressable></Card>
    </Page>
  );
}
function AccountPage({ onBack }) {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(false);
  useEffect(() => { sb.auth.getUser().then(({ data }) => setEmail(data?.user?.email || '')); }, []);
  const change = async (v) => { if (v.length < 8) return note('Use at least 8 characters.'); const { error } = await sb.auth.updateUser({ password: v }); if (error) return note(error.message); setPw(false); note('Password changed.'); };
  const del = () => Alert.alert('Delete account', 'This permanently deletes your account, your chats you created and your messages. This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { const { error } = await sb.rpc('delete_my_account'); if (error) return note(error.message); sb.auth.signOut(); } }]);
  return (
    <Page title="Account" onBack={onBack}>
      <Card><Row title="Email" value={email} /><Row title="Change password" onPress={() => setPw(true)} last /></Card>
      <Card><Pressable onPress={del}><Text style={{ color: '#D00', fontSize: 17, padding: 16 }}>Delete account</Text></Pressable></Card>
      <Ask vis={pw} title="New password" value="" secure onClose={() => setPw(false)} onSave={change} hint="At least 8 characters." />
    </Page>
  );
}
function PrivacyPage({ me, st, onBack }) {
  const [bl, setBl] = useState([]);
  const load = async () => { const { data } = await sb.from('blocks').select('blocked').eq('blocker', me); const ids = (data || []).map((b) => b.blocked); if (!ids.length) return setBl([]); const { data: pr } = await sb.from('profiles').select('id,username,display_name').in('id', ids); setBl(pr || []); };
  useEffect(() => { load(); }, []);
  const unb = async (id) => { await sb.from('blocks').delete().eq('blocker', me).eq('blocked', id); load(); };
  return (
    <Page title="Privacy" onBack={onBack}>
      <Card><Toggle st={st} k="read_receipts" title="Read receipts" sub="If off, you don't send or see blue ticks." /><Toggle st={st} k="show_online" title="Online and typing" sub="If off, others don't see when you are online or typing." last /></Card>
      <Card><Text style={{ padding: 16, paddingBottom: 6, fontSize: 17, fontWeight: '600' }}>Blocked</Text>
        {bl.length ? bl.map((b) => (<View key={b.id} style={T.row}><View style={[T.body, { marginLeft: 0 }]}><Text style={{ flex: 1, fontSize: 16 }}>{b.display_name || b.username} @{b.username}</Text><Pressable onPress={() => unb(b.id)}><Text style={{ color: GD, fontWeight: '700' }}>Unblock</Text></Pressable></View></View>)) : <Text style={{ padding: 16, paddingTop: 0, color: '#6B6B70' }}>No blocked people. Block someone from their chat (tap their name).</Text>}</Card>
      <Text style={{ marginHorizontal: 24, color: '#444', lineHeight: 20, fontSize: 14 }}>Messages are not end-to-end encrypted. Lantern admins cannot browse your chats: they can see a message and its attachment only after it is reported. Admins can see profile details (name, username, about, status, photo). Your phone number is visible only to you.</Text>
    </Page>
  );
}
function StoragePage({ st, onBack }) {
  const [u, setU] = useState(null);
  const load = async () => { const { data } = await sb.rpc('my_storage_usage'); setU(Array.isArray(data) ? data[0] : data); };
  useEffect(() => { load(); }, []);
  const mb = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB');
  const clear = () => Alert.alert('Delete my status updates', 'Remove all your status updates now?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { const { error } = await sb.rpc('clear_my_statuses'); note(error ? error.message : 'Status updates deleted.'); } }]);
  return (
    <Page title="Storage and data" onBack={onBack}>
      <Card><Row title="Files you uploaded" value={u ? `${u.files} (${mb(Number(u.bytes))})` : '...'} last /></Card>
      <Card><Toggle st={st} k="autoload" title="Auto-load photos" sub="When off, photos load only when you tap them (saves data)." last /></Card>
      <Card><Pressable onPress={clear}><Text style={{ color: '#D00', fontSize: 17, padding: 16 }}>Delete my status updates</Text></Pressable></Card>
    </Page>
  );
}
function HelpPage({ me, onBack }) {
  const [t, setT] = useState(''); const [open, setOpen] = useState(null);
  const faq = [['How do I start a chat?', 'Open Chats, tap + and pick a contact or type a username.'], ['Who can see my messages?', 'Only the people in the chat. Admins can see a message only after it is reported.'], ['Are chats end-to-end encrypted?', 'No. Messages are protected in transit and by access rules, but are not end-to-end encrypted.'], ['How do calls work?', 'Lantern voice calls need internet on both sides and the app open to ring. Push alerts can wake your phone.']];
  const send = async () => { const b = t.trim(); if (!b) return; const { error } = await sb.from('feedback').insert({ user_id: me, body: b.slice(0, 1000) }); if (error) return note(error.message); setT(''); note('Thanks. Your feedback was sent to the Lantern team.'); };
  return (
    <Page title="Help and feedback" onBack={onBack}>
      <Card>{faq.map(([q, a], i) => (<Pressable key={q} onPress={() => setOpen(open === i ? null : i)} style={{ padding: 16, borderBottomWidth: i < faq.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: 'rgba(60,60,67,0.25)' }}><Text style={{ fontSize: 16, fontWeight: '600' }}>{q}</Text>{open === i ? <Text style={{ color: '#444', marginTop: 6, lineHeight: 20 }}>{a}</Text> : null}</Pressable>))}</Card>
      <Card style={{ padding: 16 }}><Text style={{ fontSize: 17, marginBottom: 8 }}>Send feedback</Text><TextInput style={[T.field, { height: 100, textAlignVertical: 'top' }]} multiline value={t} onChangeText={setT} maxLength={1000} placeholder="Tell us what to fix or add" /><Pressable style={T.btn} onPress={send}><Text style={T.btnT}>Send</Text></Pressable></Card>
    </Page>
  );
}
