import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, PanResponder, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Glass } from './glass';

const G = '#25D366';
const fmt = (ms) => { const t = Math.floor(ms / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const lvl = (m) => (typeof m === 'number' ? Math.max(0, Math.min(1, (Math.max(-60, m) + 60) / 60)) : 0.1);
const Bars = ({ levels, n = 36, h = 28, color = '#555' }) => {
  const arr = levels.slice(-n); while (arr.length < n) arr.unshift(0);
  return <View style={{ flex: 1, height: h, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>{arr.map((v, i) => <View key={i} style={{ width: 3, borderRadius: 2, height: 3 + v * (h - 3), backgroundColor: v ? color : '#9AA0A6' }} />)}</View>;
};

export default function Composer({ t, onType, send, onPlus, onCamera, onSticker, stkOpen, onVoice, replyBar, onFocus }) {
  const rec = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const rs = useAudioRecorderState(rec, 100);
  const [ui, setUi] = useState('idle'); const modeRef = useRef('idle'); const [slide, setSlide] = useState(0); const [paused, setPaused] = useState(false);
  const levels = useRef([]); const [, force] = useState(0); const startP = useRef(null); const lastMs = useRef(0); const [hint, setHint] = useState(false);
  useEffect(() => { if (modeRef.current !== 'idle' && rs.isRecording) { levels.current.push(lvl(rs.metering)); lastMs.current = rs.durationMillis || lastMs.current; force((x) => x + 1); } else if (modeRef.current !== 'idle') { lastMs.current = rs.durationMillis || lastMs.current; } }, [rs.durationMillis, rs.metering]);
  const setMode = (m) => { modeRef.current = m; setUi(m); };
  const start = async () => {
    try {
      const p = await AudioModule.requestRecordingPermissionsAsync(); if (!p.granted) { Alert.alert('Lantern', 'Microphone permission is needed'); return false; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }); await rec.prepareToRecordAsync(); rec.record();
      levels.current = []; lastMs.current = 0; setPaused(false); setSlide(0); return true;
    } catch (e) { Alert.alert('Lantern', e?.message || 'Could not start recording'); return false; }
  };
  const finish = async (doSend) => {
    if (modeRef.current === 'idle') return; setMode('idle'); setPaused(false);
    const ms = lastMs.current; const lv = levels.current.slice();
    try { await rec.stop(); } catch (e) {}
    const uri = rec.uri;
    if (!doSend || !uri) return;
    if (ms < 900) { setHint(true); setTimeout(() => setHint(false), 1600); return; }
    const n = 40; const wave = Array.from({ length: n }, (_, i) => { const a = Math.floor((i * lv.length) / n), b = Math.max(a + 1, Math.floor(((i + 1) * lv.length) / n)); const sl = lv.slice(a, b); const v = sl.length ? Math.max(...sl) : 0; return String(Math.min(9, Math.round(v * 9))); }).join('');
    onVoice(uri, Math.max(1, Math.round(ms / 1000)), wave);
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { setMode('hold'); startP.current = start().then((ok) => { if (!ok) setMode('idle'); return ok; }); },
    onPanResponderMove: (_, g) => { if (modeRef.current !== 'hold') return; if (g.dy < -70) setMode('locked'); else if (g.dx < -100) { finish(false); } else setSlide(Math.min(0, g.dx)); },
    onPanResponderRelease: async () => { await startP.current; if (modeRef.current === 'hold') finish(true); },
    onPanResponderTerminate: async () => { await startP.current; if (modeRef.current === 'hold') finish(false); },
  })).current;
  const pause = async () => { try { if (paused) { rec.record(); setPaused(false); } else { rec.pause(); setPaused(true); } } catch (e) {} };

  const has = !!t.trim();
  if (ui === 'locked') {
    return (
      <Glass style={{ marginHorizontal: 8, marginBottom: 8, borderRadius: 26, padding: 12 }} intensity={50}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ width: 52, fontSize: 17 }}>{fmt(rs.durationMillis || lastMs.current)}</Text><Bars levels={levels.current} n={40} h={30} color="#222" /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <Pressable onPress={() => finish(false)} style={{ padding: 8 }}><Ionicons name="trash-outline" size={28} color="#111" /></Pressable>
          <Pressable onPress={pause} style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#E0143C', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={paused ? 'mic' : 'pause'} size={26} color="#E0143C" /></Pressable>
          <Pressable onPress={() => finish(true)} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: G, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="send" size={24} color="#fff" /></Pressable>
        </View>
      </Glass>
    );
  }
  return (
    <View>
      {replyBar}
      {hint ? <Text style={{ textAlign: 'center', color: '#444', marginBottom: 4 }}>Hold the mic to record, release to send</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
        {ui === 'hold' ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 44, paddingLeft: 8 }}>
            <Ionicons name="mic" size={22} color="#E0143C" /><Text style={{ marginLeft: 8, fontSize: 18, width: 56 }}>{fmt(rs.durationMillis || lastMs.current)}</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: slide / 3 }] }}><Text style={{ color: '#555', fontSize: 16 }}>slide to cancel</Text><Ionicons name="chevron-back" size={18} color="#555" /></View>
          </View>
        ) : (
          <>
            <Pressable onPress={onPlus} style={{ paddingHorizontal: 6 }}><Ionicons name="add" size={32} color="#111" /></Pressable>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 14, minHeight: 42, marginLeft: 6 }}>
              <TextInput style={{ flex: 1, fontSize: 17, paddingVertical: 8, maxHeight: 110 }} value={t} onChangeText={onType} placeholder="Message" multiline onFocus={onFocus} />
              <Pressable onPress={onSticker}><MaterialCommunityIcons name={stkOpen ? 'keyboard-outline' : 'sticker-emoji'} size={26} color="#111" /></Pressable>
            </View>
            {!has ? <Pressable onPress={onCamera} style={{ paddingHorizontal: 8 }}><Ionicons name="camera-outline" size={28} color="#111" /></Pressable> : null}
          </>
        )}
        {has && ui === 'idle' ? (
          <Pressable onPress={send} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: G, alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}><Ionicons name="send" size={20} color="#fff" /></Pressable>
        ) : (
          <View {...pan.panHandlers} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ui === 'hold' ? '#E0143C' : G, alignItems: 'center', justifyContent: 'center', marginLeft: 6, transform: [{ scale: ui === 'hold' ? 1.35 : 1 }] }}><Ionicons name="mic" size={22} color="#fff" /></View>
        )}
        {ui === 'hold' ? (
          <Glass style={{ position: 'absolute', right: 8, bottom: 62, width: 44, borderRadius: 22, alignItems: 'center', paddingVertical: 8 }} intensity={50}><Ionicons name="lock-open-outline" size={22} color="#444" /><Ionicons name="chevron-up" size={18} color="#444" /></Glass>
        ) : null}
      </View>
    </View>
  );
}
