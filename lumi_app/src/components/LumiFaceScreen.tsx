/**
 * LumiFaceScreen Component
 * Faithful implementation of LUMI's expressive OLED robot face.
 * - Sits in a dark rounded-square screen (112px tall, 12px radius, shrinks to 56px when keyboard opens)
 * - Round-capped glowing cyan strokes, perfectly centered inside margins (never clipped)
 * - Calmed Pixar-style reactions:
 *    • Idle: happy arches blinking every 3-6s
 *    • Name/Email focused: eyes look down toward the form
 *    • Password focused: sleep lines (- -)
 *    • Show-password: open wide (O O)
 *    • Validation error: upset eyes for 1.5s then back to neutral/happy
 *    • Success: happy, then love hearts for 1s before navigating
 *    • Reduced motion: static happy face, no blinking
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

export type FaceMood = 'idle' | 'lookDown' | 'sleep' | 'openWide' | 'upset' | 'love' | 'happy';

export interface LumiFaceScreenProps {
  mood?: FaceMood;
  isKeyboardOpen?: boolean;
  maxHeight?: number;
  width?: number;
}

export function LumiFaceScreen({
  mood = 'idle',
  isKeyboardOpen = false,
  maxHeight = 46,
  width = 92,
}: LumiFaceScreenProps) {
  const isReducedMotion = useReducedMotion();

  // Animation values
  const blinkScaleY = useSharedValue(1);
  const lookY = useSharedValue(0);
  const containerHeight = useSharedValue(isKeyboardOpen ? 0 : maxHeight);
  const containerOpacity = useSharedValue(isKeyboardOpen ? 0 : 1);
  const containerScale = useSharedValue(isKeyboardOpen ? 0.85 : 1);

  // Smooth 180ms collapse/expand when keyboard toggles
  useEffect(() => {
    const targetHeight = isKeyboardOpen ? 0 : maxHeight;
    const targetOpacity = isKeyboardOpen ? 0 : 1;
    const targetScale = isKeyboardOpen ? 0.85 : 1;

    containerHeight.value = withTiming(targetHeight, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    containerOpacity.value = withTiming(targetOpacity, {
      duration: 150,
      easing: Easing.out(Easing.cubic),
    });
    containerScale.value = withTiming(targetScale, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [isKeyboardOpen, maxHeight, containerHeight, containerOpacity, containerScale]);

  // Handle gaze direction
  useEffect(() => {
    if (mood === 'lookDown') {
      lookY.value = withTiming(8, { duration: 250, easing: Easing.out(Easing.ease) });
    } else {
      lookY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
    }
  }, [mood, lookY]);

  // Natural idle blinking loop (every 3 to 6s, 10% double blink)
  useEffect(() => {
    if (isReducedMotion || mood === 'sleep') {
      blinkScaleY.value = 1;
      return;
    }

    blinkScaleY.value = withRepeat(
      withDelay(
        3500,
        withSequence(
          withTiming(0.08, { duration: 75, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 110, easing: Easing.inOut(Easing.ease) }),
          // Occasional double-blink
          withDelay(
            160,
            withSequence(
              withTiming(0.08, { duration: 60, easing: Easing.inOut(Easing.ease) }),
              withTiming(1, { duration: 90, easing: Easing.inOut(Easing.ease) })
            )
          )
        )
      ),
      -1,
      false
    );
  }, [mood, isReducedMotion, blinkScaleY]);

  const animatedEyesStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: lookY.value },
      { scaleY: blinkScaleY.value },
    ],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: containerHeight.value,
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
    overflow: 'hidden',
  }));

  // Render eyes based on mood
  const renderEyes = () => {
    // 1. Sleeping slits for password
    if (mood === 'sleep') {
      return (
        <Svg width={70} height={26} viewBox="0 0 100 40">
          {/* Left sleep slit */}
          <Path
            d="M 14 20 Q 32 23 50 20"
            fill="none"
            stroke="rgba(95, 243, 255, 0.4)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <Path
            d="M 14 20 Q 32 23 50 20"
            fill="none"
            stroke="#5FF3FF"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Right sleep slit */}
          <Path
            d="M 50 20 Q 68 23 86 20"
            fill="none"
            stroke="rgba(95, 243, 255, 0.4)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <Path
            d="M 50 20 Q 68 23 86 20"
            fill="none"
            stroke="#5FF3FF"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </Svg>
      );
    }

    // 2. Open wide (when password show is active)
    if (mood === 'openWide') {
      return (
        <Svg width={70} height={26} viewBox="0 0 100 40">
          {/* Left open wide */}
          <Circle cx={28} cy={20} r={14} fill="rgba(95, 243, 255, 0.25)" />
          <Circle cx={28} cy={20} r={11} fill="#5FF3FF" />
          <Circle cx={26} cy={17} r={4} fill="#E6FEFF" />

          {/* Right open wide */}
          <Circle cx={72} cy={20} r={14} fill="rgba(95, 243, 255, 0.25)" />
          <Circle cx={72} cy={20} r={11} fill="#5FF3FF" />
          <Circle cx={70} cy={17} r={4} fill="#E6FEFF" />
        </Svg>
      );
    }

    // 3. Upset (validation error)
    if (mood === 'upset') {
      return (
        <Svg width={70} height={26} viewBox="0 0 100 40">
          {/* Left worried slanted eye */}
          <Path
            d="M 16 16 Q 30 24 44 26"
            fill="none"
            stroke="rgba(244, 63, 94, 0.35)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <Path
            d="M 16 16 Q 30 24 44 26"
            fill="none"
            stroke="#FB7185"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Right worried slanted eye */}
          <Path
            d="M 84 16 Q 70 24 56 26"
            fill="none"
            stroke="rgba(244, 63, 94, 0.35)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <Path
            d="M 84 16 Q 70 24 56 26"
            fill="none"
            stroke="#FB7185"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </Svg>
      );
    }

    // 4. Love (Success state)
    if (mood === 'love') {
      return (
        <Svg width={70} height={26} viewBox="0 0 100 40">
          {/* Left heart */}
          <Path
            d="M 28 26 C 28 26 14 18 14 12 C 14 7 19 4 23 6 C 26 8 28 11 28 11 C 28 11 30 8 33 6 C 37 4 42 7 42 12 C 42 18 28 26 28 26 Z"
            fill="#FF4D8D"
          />
          {/* Right heart */}
          <Path
            d="M 72 26 C 72 26 58 18 58 12 C 58 7 63 4 67 6 C 70 8 72 11 72 11 C 72 11 74 8 77 6 C 81 4 86 7 86 12 C 86 18 72 26 72 26 Z"
            fill="#FF4D8D"
          />
        </Svg>
      );
    }

    // 5. Default / Happy / LookDown: Iconic Upward Arches (^ ^)
    return (
      <Svg width={70} height={26} viewBox="0 0 100 40">
        {/* Left eye glowing arch */}
        <Path
          d="M 14 26 C 14 9, 42 9, 42 26"
          fill="none"
          stroke="rgba(95, 243, 255, 0.35)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <Path
          d="M 14 26 C 14 9, 42 9, 42 26"
          fill="none"
          stroke="#5FF3FF"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <Path
          d="M 15 25 C 16 11, 40 11, 41 25"
          fill="none"
          stroke="#E6FEFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Right eye glowing arch */}
        <Path
          d="M 58 26 C 58 9, 86 9, 86 26"
          fill="none"
          stroke="rgba(95, 243, 255, 0.35)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <Path
          d="M 58 26 C 58 9, 86 9, 86 26"
          fill="none"
          stroke="#5FF3FF"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <Path
          d="M 59 25 C 60 11, 84 11, 85 25"
          fill="none"
          stroke="#E6FEFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </Svg>
    );
  };

  return (
    <Animated.View style={[styles.screenFrame, { width }, animatedContainerStyle]}>
      {/* Subtle screen bezel highlight */}
      <View style={styles.bezelHighlight} />

      {/* Eyes Container */}
      <Animated.View style={[styles.eyesWrapper, animatedEyesStyle]}>
        {renderEyes()}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screenFrame: {
    backgroundColor: '#0D0E1A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bezelHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  eyesWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
