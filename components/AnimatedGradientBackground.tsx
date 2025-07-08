import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';

const COLOR_SETS: [string, string, string][] = [
  ['#FF006E', '#8338EC', '#3A86FF'],
  ['#FEE140', '#FA709A', '#FF61A6'],
  ['#42E695', '#3BB2B8', '#1E3C72'],
  ['#F7971E', '#FFD200', '#21D4FD'],
  ['#00F2FE', '#4FACFE', '#43E97B'],
  ['#F54EA2', '#FF7676', '#17EAD9'],
];

function lerpColor(a: string, b: string, t: number): string {
  const ah = a.replace('#', '');
  const bh = b.replace('#', '');
  const ar = parseInt(ah.substring(0, 2), 16);
  const ag = parseInt(ah.substring(2, 4), 16);
  const ab = parseInt(ah.substring(4, 6), 16);
  const br = parseInt(bh.substring(0, 2), 16);
  const bg = parseInt(bh.substring(2, 4), 16);
  const bb = parseInt(bh.substring(4, 6), 16);
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1)}`;
}

interface AnimatedGradientBackgroundProps {
  style?: ViewStyle;
  height?: DimensionValue;
}

export default function AnimatedGradientBackground({ style, height = '100%' }: AnimatedGradientBackgroundProps) {
  const [colorIdx, setColorIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.008;
      if (t > 1) {
        t = 0;
        setColorIdx((idx) => (idx + 1) % COLOR_SETS.length);
      }
      setProgress(t);
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  const current = COLOR_SETS[colorIdx];
  const next = COLOR_SETS[(colorIdx + 1) % COLOR_SETS.length];
  const colors: [string, string, string] = [
    lerpColor(current[0], next[0], progress),
    lerpColor(current[1], next[1], progress),
    lerpColor(current[2], next[2], progress),
  ];

  return (
    <View style={[{ width: '100%', height: height as DimensionValue }, style]} pointerEvents="none">
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
} 