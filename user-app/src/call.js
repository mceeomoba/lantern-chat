import { PermissionsAndroid, Platform } from 'react-native';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';
import { sb, setCall } from './api';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

// Voice-only call. Signaling goes over a Supabase Realtime broadcast channel named after the call id.
export async function runCall({ id, caller, onState }) {
  if (Platform.OS === 'android') {
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (r !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Microphone permission is needed for calls');
  }
  const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
  const pc = new RTCPeerConnection(ICE);
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  const ch = sb.channel('call-' + id, { config: { broadcast: { self: false } } });
  const send = (event, payload = {}) => ch.send({ type: 'broadcast', event, payload });
  let remoteSet = false; const queue = []; let done = false;
  const finish = (why) => { if (done) return; done = true; try { pc.close(); stream.getTracks().forEach((t) => t.stop()); } catch (e) {} sb.removeChannel(ch); onState(why); };
  pc.onicecandidate = (e) => { if (e.candidate) send('ice', e.candidate.toJSON ? e.candidate.toJSON() : e.candidate); };
  pc.onconnectionstatechange = () => { const st = pc.connectionState; if (st === 'connected') onState('connected'); if (st === 'failed') { setCall(id, 'ended'); finish('failed'); } };
  const addIce = async (c) => { if (remoteSet) await pc.addIceCandidate(new RTCIceCandidate(c)); else queue.push(c); };
  const flush = async () => { remoteSet = true; for (const c of queue.splice(0)) await pc.addIceCandidate(new RTCIceCandidate(c)); };
  ch.on('broadcast', { event: 'ice' }, ({ payload }) => addIce(payload));
  ch.on('broadcast', { event: 'end' }, () => finish('ended'));
  if (caller) {
    ch.on('broadcast', { event: 'ready' }, async () => { const o = await pc.createOffer({ offerToReceiveAudio: true }); await pc.setLocalDescription(o); send('offer', { sdp: o.sdp, type: o.type }); });
    ch.on('broadcast', { event: 'answer' }, async ({ payload }) => { await pc.setRemoteDescription(new RTCSessionDescription(payload)); await flush(); });
  } else {
    ch.on('broadcast', { event: 'offer' }, async ({ payload }) => { await pc.setRemoteDescription(new RTCSessionDescription(payload)); await flush(); const a = await pc.createAnswer(); await pc.setLocalDescription(a); send('answer', { sdp: a.sdp, type: a.type }); });
  }
  await new Promise((res) => ch.subscribe((s) => s === 'SUBSCRIBED' && res()));
  if (!caller) { await setCall(id, 'active'); send('ready'); }
  const hang = async () => { await send('end'); await setCall(id, 'ended'); finish('ended'); };
  const mute = (m) => stream.getAudioTracks().forEach((t) => { t.enabled = !m; });
  return { hang, mute };
}
