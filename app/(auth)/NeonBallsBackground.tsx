import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');
const BALLS = [
  { size: width * 0.7, initial: { x: 0.1, y: 0.1 }, opacity: 0.25 },
  { size: width * 0.5, initial: { x: 0.6, y: 0.2 }, opacity: 0.18 },
  { size: width * 0.3, initial: { x: 0.2, y: 0.7 }, opacity: 0.22 },
  { size: width * 0.2, initial: { x: 0.7, y: 0.7 }, opacity: 0.15 },
];

function getRandomTarget(size: number) {
  const maxX = width - size;
  const maxY = height - size;
  return {
    x: Math.random() * maxX,
    y: Math.random() * maxY,
  };
}

export default function NeonBallsBackground() {
  const positions = useRef(
    BALLS.map(ball => ({
      x: new Animated.Value(ball.initial.x * width),
      y: new Animated.Value(ball.initial.y * height),
    }))
  ).current;

  useEffect(() => {
    let isMounted = true;
    const animationIds: number[] = [];
    BALLS.forEach((ball, i) => {
      const animateBall = () => {
        if (!isMounted) return;
        const target = getRandomTarget(ball.size);
        Animated.parallel([
          Animated.timing(positions[i].x, {
            toValue: target.x,
            duration: 12000 + Math.random() * 6000,
            useNativeDriver: false,
          }),
          Animated.timing(positions[i].y, {
            toValue: target.y,
            duration: 12000 + Math.random() * 6000,
            useNativeDriver: false,
          }),
        ]).start(() => animateBall());
      };
      animateBall();
    });
    return () => {
      isMounted = false;
    };
  }, [positions]);

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BALLS.map((ball, i) => (
        <Animated.View
          key={i}
          style={[
            {
              width: ball.size,
              height: ball.size,
              opacity: ball.opacity,
              position: 'absolute',
              left: positions[i].x,
              top: positions[i].y,
              borderRadius: ball.size / 2,
              overflow: 'hidden',
            },
            styles.ball,
          ]}
        >
          <LinearGradient
            colors={['#A259FF', '#3A86FF', '#FF006E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ball: {
    // Additional shadow/glow if desired
    shadowColor: '#A259FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 32,
  },
}); 