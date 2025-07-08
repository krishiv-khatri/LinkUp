import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

function generateWavePath(phase: number, amplitude = 30, width = 400, height = 100, points = 32) {
  let d = `M0,${height / 2}`;
  for (let i = 0; i <= points; i++) {
    const x = (i * width) / points;
    const y = height / 2 + Math.sin((i / points) * Math.PI * 2 + phase) * amplitude;
    d += ` L${x},${y}`;
  }
  d += ` V${height} H0 Z`;
  return d;
}

interface AnimatedWaveProps {
  style?: ViewStyle;
  color?: string;
  width?: number;
  height?: number;
  amplitude?: number;
}

export default function AnimatedWave({ style, color = '#0A0A0A', width = 400, height = 100, amplitude = 30 }: AnimatedWaveProps) {
  const [path, setPath] = useState(generateWavePath(0, amplitude, width, height));
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(phase, {
        toValue: Math.PI * 2,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    animation.start();

    const id = phase.addListener(({ value }) => {
      setPath(generateWavePath(value, amplitude, width, height));
    });

    return () => {
      animation.stop();
      phase.removeListener(id);
    };
  }, [phase, width, height, amplitude]);

  return (
    <Svg height={height} width="100%" viewBox={`0 0 ${width} ${height}`} style={style} preserveAspectRatio="none">
      <Path d={path} fill={color} />
    </Svg>
  );
} 