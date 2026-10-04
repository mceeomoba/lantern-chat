import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { sb, signedUrl } from './api';
import { Glass } from './glass';
import { useSettings, setSetting } from './settings';

function Custom({ path, size }) {
  const [u, setU] = useState(null); useEffect(() => { let on = true; signedUrl(path).then((x) => on && setU(x)); return () => { on = false; }; }, [path]);
  return u ? <Image source={{ uri: u }} style={{ width: size, height: size, borderRadius: 14 }} /> : <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: '#ddd' }} />;
}
export default function StickerPanel({ me, STICKERS, StickerArt, onPick, onPickCustom, onCreate }) {
  const st = useSettings(); const [q, setQ] = useState(''); const [cat, setCat] = useState('all'); const [mine, setMine] = useState([]);
  useEffect(() => { sb.from('messages').select('media_path').eq('sender_id', me).eq('kind', 'sticker').not('media_path', 'is', null).order('created_at', { ascending: false }).limit(60).then(({ data }) => setMine([...new Set((data || []).map((d) => d.media_path))])); }, [cat]);
  const recent = st.recent_stickers || [];
  const list = useMemo(() => {
    const base = cat === 'recent' ? recent.map((id) => STICKERS.find((x) => x[0] === id)).filter(Boolean) : STICKERS;
    return base.filter((x) => !q.trim() || x[3].toLowerCase().includes(q.trim().toLowerCase()) || x[0].includes(q.trim().toLowerCase()));
  }, [q, cat, st.recent_stickers]);
  const pick = (id) => { setSetting('recent_stickers', [id, ...recent.filter((x) => x !== id)].slice(0, 12)); onPick(id); };
  const Cat = ({ k, icon }) => (<Pressable onPress={() => setCat(k)} style={{ width: 46, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: cat === k ? 'rgba(0,0,0,0.12)' : 'transparent', marginHorizontal: 4 }}><Ionicons name={icon} size={24} color="#111" /></Pressable>);
  return (
    <Glass style={{ height: 300, borderTopLeftRadius: 28, borderTopRightRadius: 28 }} intensity={60} fill="rgba(255,255,255,0.55)">
      <View style={{ flexDirection: 'row', alignItems: 'center', margin: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 18, paddingHorizontal: 12, height: 40 }}><Ionicons name="search" size={20} color="#555" /><TextInput style={{ flex: 1, marginLeft: 8, fontSize: 16 }} placeholder="Search stickers" value={q} onChangeText={setQ} /></View>
      {cat === 'mine' ? (
        <FlatList data={mine} numColumns={4} keyExtractor={(x) => x} contentContainerStyle={{ paddingHorizontal: 8 }} ListHeaderComponent={<Pressable onPress={onCreate} style={{ margin: 6, width: 72, height: 72, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="image-outline" size={24} color="#111" /><Text style={{ fontSize: 12, textAlign: 'center' }}>Create sticker</Text></Pressable>} renderItem={({ item }) => (<Pressable onPress={() => onPickCustom(item)} style={{ margin: 6 }}><Custom path={item} size={72} /></Pressable>)} ListEmptyComponent={<Text style={{ color: '#555', margin: 12 }}>Stickers you create show up here.</Text>} />
      ) : (
        <FlatList data={list} numColumns={4} keyExtractor={(x) => x[0]} contentContainerStyle={{ paddingHorizontal: 8 }} ListHeaderComponent={<Pressable onPress={onCreate} style={{ margin: 6, width: 72, height: 72, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="image-outline" size={24} color="#111" /><Text style={{ fontSize: 12, textAlign: 'center' }}>Create sticker</Text></Pressable>} renderItem={({ item }) => (<Pressable onPress={() => pick(item[0])} style={{ margin: 6 }}><StickerArt id={item[0]} size={72} /></Pressable>)} ListEmptyComponent={<Text style={{ color: '#555', margin: 12 }}>{cat === 'recent' ? 'No recent stickers yet.' : 'No stickers match.'}</Text>} />
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.8)' }}><Cat k="recent" icon="time-outline" /><Cat k="all" icon="happy-outline" /><Cat k="mine" icon="person-circle-outline" /></View>
    </Glass>
  );
}
