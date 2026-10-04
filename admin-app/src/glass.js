import React, { createContext, useContext, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView, BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
const Ctx = createContext(null);
export function GlassBackdrop({ children }) {
  const ref = useRef(null);
  return (
    <Ctx.Provider value={ref}>
      <View style={{ flex: 1 }}>
        <BlurTargetView ref={ref} style={StyleSheet.absoluteFill}>
          <LinearGradient colors={['#FFE9CF', '#D6F5E8', '#D9E4FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={{ position: 'absolute', top: -60, left: -50, width: 260, height: 260, borderRadius: 130, backgroundColor: '#FFB36B', opacity: 0.55 }} />
          <View style={{ position: 'absolute', top: 260, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: '#5ED6A6', opacity: 0.45 }} />
          <View style={{ position: 'absolute', bottom: 40, left: -70, width: 280, height: 280, borderRadius: 140, backgroundColor: '#8DA8FF', opacity: 0.45 }} />
        </BlurTargetView>
        {children}
      </View>
    </Ctx.Provider>
  );
}
export function Glass({ style, children, intensity = 40, tint = 'light', fill = 'rgba(255,255,255,0.42)', ...rest }) {
  const ref = useContext(Ctx);
  return (
    <View {...rest} style={[{ overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' }, style]}>
      <BlurView blurTarget={ref} blurMethod="dimezisBlurView" intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.95)' }} />
      {children}
    </View>
  );
}
