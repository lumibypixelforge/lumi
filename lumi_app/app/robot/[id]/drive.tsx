/* eslint-disable react-hooks/immutability, react-hooks/purity, react-hooks/refs */
/**
 * S12 Live Control & Driving Screen
 * Real-time video view, virtual joystick with physics & spring release,
 * Push-To-Talk (PTT) with soundwaves, Speed selector, Emergency stop,
 * Emotions & Gestures drawer, live telemetry HUD, and End Session flow.
 */

import { NativeModules } from 'react-native';

let LiveKitVideoView: any = null;
try {
  if (NativeModules && NativeModules.WebRTCModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    LiveKitVideoView = require('@livekit/react-native').VideoView;
  }
} catch {
  // Expo Go fallback
}

const VideoView = ({ videoTrack, style, objectFit }: any) => {
  if (LiveKitVideoView) {
    return <LiveKitVideoView videoTrack={videoTrack} style={style} objectFit={objectFit} />;
  }
  return <View style={[style, { backgroundColor: '#000000' }]} />;
};
import {
  AudioModule,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioStream,
  type AudioPlayer,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BatteryMedium,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Heart,
  Laugh,
  Lock,
  Maximize2,
  Mic,
  Moon,
  PhoneOff,
  RefreshCw,
  Smile,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BackHandler,
  Image,
  Modal,
  PanResponder,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle as SvgCircle, Path as SvgPath } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Emotion } from '../../../src/components/RobotFace';
import { showAlert } from '../../../src/features/dialog/dialogStore';
import {
  controlChannel,
  liveService,
  robotService,
  sessionService,
  setRobotMicrophone,
  subscribeToCloudVideoFrame,
  subscribeToRobotAudio,
  subscribeToRobotVideoTrack,
  uint8ArrayToBase64,
} from '../../../src/services';
import { spacing } from '../../../src/theme/tokens';
import type { ConnectionState, Robot, Telemetry } from '../../../src/types';
import { haptics } from '../../../src/utils/haptics';

const JOYSTICK_RADIUS = 98;
const PUCK_RADIUS = 38;
const MAX_DRAG = JOYSTICK_RADIUS - PUCK_RADIUS;

const EMOTIONS_LIST: { name: Emotion; label: string; Icon: any }[] = [
  { name: 'happy', label: 'Happy', Icon: Smile },
  { name: 'curious', label: 'Curious', Icon: Eye },
  { name: 'love', label: 'Love', Icon: Heart },
  { name: 'excited', label: 'Excited', Icon: Zap },
  { name: 'wink', label: 'Wink', Icon: Laugh },
  { name: 'sleepy', label: 'Sleepy', Icon: Moon },
];

const GESTURES_LIST = [
  { name: 'spin', label: '360° Spin' },
  { name: 'surveillance', label: '360° Surveillance' },
  { name: 'nod', label: 'Nod Yes' },
  { name: 'shake', label: 'Shake No' },
  { name: 'dance', label: 'Wiggle Dance' },
  { name: 'peekaboo', label: 'Peekaboo' },
];

function pcmToWavBase64(pcmBytes: Uint8Array, sampleRate = 16000, numChannels = 1, bitsPerSample = 16): string {
  const dataLen = pcmBytes.length;
  const buffer = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataLen, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);          // 16 bytes format chunk
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLen, true);

  // Copy PCM audio samples
  const u8 = new Uint8Array(buffer);
  u8.set(pcmBytes, 44);

  return uint8ArrayToBase64(u8);
}

interface DoubleBufferedCameraFeedProps {
  videoTrack: any;
  cameraStreamUrl: string | null;
  onHasCloudFrameChange?: (hasFrame: boolean) => void;
  connectionState?: ConnectionState;
}

const DoubleBufferedCameraFeed = React.memo(function DoubleBufferedCameraFeed({
  videoTrack,
  cameraStreamUrl,
  onHasCloudFrameChange,
  connectionState,
}: DoubleBufferedCameraFeedProps) {
  // True Dual-Slot Hardware Double Buffering:
  // Slot A and Slot B alternate seamlessly.
  // The currently displayed slot is NEVER given a new URI while visible.
  // The incoming frame loads and decodes in the background slot.
  // Both onLoadEnd and onError trigger promotion/recovery, preventing any freeze.
  const [frameA, setFrameA] = useState<string | null>(null);
  const [frameB, setFrameB] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');

  const activeSlotRef = useRef<'A' | 'B'>('A');
  activeSlotRef.current = activeSlot;

  const isPreloadingRef = useRef(false);
  const pendingUriRef = useRef<string | null>(null);
  const preloadWatchdogRef = useRef<any>(null);

  const handleSlotLoaded = useCallback((slot: 'A' | 'B') => {
    if (preloadWatchdogRef.current) {
      clearTimeout(preloadWatchdogRef.current);
      preloadWatchdogRef.current = null;
    }
    // Promote the freshly decoded slot to active view
    if (activeSlotRef.current !== slot) {
      setActiveSlot(slot);
    }
    isPreloadingRef.current = false;

    // If a new frame arrived while decoding was in progress, load it into the new background slot
    if (pendingUriRef.current) {
      const nextUri = pendingUriRef.current;
      pendingUriRef.current = null;
      isPreloadingRef.current = true;
      if (slot === 'A') {
        setFrameB(nextUri);
      } else {
        setFrameA(nextUri);
      }
      preloadWatchdogRef.current = setTimeout(() => {
        isPreloadingRef.current = false;
      }, 350);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const unsub = subscribeToCloudVideoFrame((uri) => {
      if (!mounted || !uri) return;
      onHasCloudFrameChange?.(true);

      // Seed first frame immediately
      if (!frameA && !frameB) {
        setFrameA(uri);
        setActiveSlot('A');
        return;
      }

      // If the background slot is currently decoding, hold newest URI to decode next
      if (isPreloadingRef.current) {
        pendingUriRef.current = uri;
        return;
      }

      // Load into the inactive slot
      isPreloadingRef.current = true;
      if (activeSlotRef.current === 'A') {
        setFrameB(uri);
      } else {
        setFrameA(uri);
      }

      if (preloadWatchdogRef.current) clearTimeout(preloadWatchdogRef.current);
      preloadWatchdogRef.current = setTimeout(() => {
        isPreloadingRef.current = false;
      }, 350);
    });

    return () => {
      mounted = false;
      if (preloadWatchdogRef.current) clearTimeout(preloadWatchdogRef.current);
      unsub();
    };
  }, [frameA, frameB, onHasCloudFrameChange]);

  if (frameA || frameB) {
    return (
      <View style={StyleSheet.absoluteFill}>
        {frameA && (
          <Image
            source={{ uri: frameA }}
            style={[
              styles.cameraImageFull,
              {
                opacity: activeSlot === 'A' ? 1 : 0.001,
                zIndex: activeSlot === 'A' ? 2 : 1,
              },
            ]}
            resizeMode="cover"
            fadeDuration={0}
            onLoadEnd={() => handleSlotLoaded('A')}
            onError={() => handleSlotLoaded('A')}
          />
        )}
        {frameB && (
          <Image
            source={{ uri: frameB }}
            style={[
              styles.cameraImageFull,
              {
                opacity: activeSlot === 'B' ? 1 : 0.001,
                zIndex: activeSlot === 'B' ? 2 : 1,
              },
            ]}
            resizeMode="cover"
            fadeDuration={0}
            onLoadEnd={() => handleSlotLoaded('B')}
            onError={() => handleSlotLoaded('B')}
          />
        )}
      </View>
    );
  }

  if (videoTrack) {
    return (
      <VideoView
        videoTrack={videoTrack}
        style={StyleSheet.absoluteFill}
        objectFit="cover"
      />
    );
  }

  if (cameraStreamUrl && connectionState !== 'connected') {
    return (
      <Image
        source={{ uri: `${cameraStreamUrl}/stream` }}
        style={styles.cameraImageFull}
        resizeMode="cover"
        fadeDuration={0}
      />
    );
  }

  return null;
});

export default function DriveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [robot, setRobot] = useState<Robot | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [telemetry, setTelemetry] = useState<Telemetry>({
    batteryPercent: 82,
    wifiSignal: 4,
    latencyMs: 54,
    currentEmotion: 'happy',
  });

  const [sessionStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Speed Mode: 0.5 (slow), 1.0 (normal), 1.5 (fast)
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);

  // Robot Room Audio Listen toggle (listen to audio streamed from robot mic)
  const [isAudioListening, setIsAudioListening] = useState(false);

  // PTT State
  const [isTalking, setIsTalking] = useState(false);
  const [isMicLocked, setIsMicLocked] = useState(false);

  // Active voice transmission gate ref to eliminate Android hardware restart latencies
  const isTransmittingVoiceRef = useRef(false);
  useEffect(() => {
    isTransmittingVoiceRef.current = isTalking || isMicLocked;
  }, [isTalking, isMicLocked]);

  // Real-time 16kHz 16-bit PCM Microphone Audio Stream for Walkie-Talkie
  const { stream: audioStream } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer) => {
      if (isTransmittingVoiceRef.current && buffer?.data) {
        controlChannel.sendVoiceBytes(new Uint8Array(buffer.data));
      }
    },
  });

  // Pre-warm audio stream once on mount for instant zero-latency PTT
  useEffect(() => {
    let active = true;
    (async () => {
      const ok = await ensureMicrophonePermission();
      if (ok && active) {
        try {
          await setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: true,
          });
          await audioStream.start();
        } catch (err) {
          console.warn('[PTT] AudioStream initial start warning:', err);
        }
      }
    })();

    return () => {
      active = false;
      try {
        audioStream.stop();
      } catch { }
    };
  }, [audioStream]);

  // LiveKit Remote Video Track
  const [videoTrack, setVideoTrack] = useState<any>(null);

  // Worldwide LiveKit WebRTC Cloud Video Frame active state
  const [hasCloudFeed, setHasCloudFeed] = useState(false);

  // Local camera stream from robot
  const [cameraStreamUrl, setCameraStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsubTrack = subscribeToRobotVideoTrack((track) => {
      setVideoTrack(track);
    });
    return () => {
      unsubTrack();
    };
  }, []);

  // Subscribe to live robot room audio when listening toggle is active
  useEffect(() => {
    if (!isAudioListening) {
      try {
        controlChannel.send({ t: 'listen_stop' });
      } catch { }
      return;
    }

    // Inform robot to start capturing and streaming INMP441 microphone audio
    try {
      controlChannel.send({ t: 'listen_start' });
    } catch { }

    let active = true;
    let slot = 0;
    const audioQueue: string[] = [];
    let isPlaying = false;
    let player: AudioPlayer | null = null;
    let fallbackTimer: any = null;

    try {
      player = createAudioPlayer(null, { keepAudioSessionActive: true, updateInterval: 50 });
      player.volume = 1.0;

      const playNext = () => {
        if (!active || !player) return;
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        if (audioQueue.length === 0) {
          isPlaying = false;
          return;
        }
        isPlaying = true;
        const nextUri = audioQueue.shift()!;
        try {
          player.replace({ uri: nextUri });
          player.play();
          // Fallback watchdog: if Android media status lags or drops finish event, advance smoothly
          fallbackTimer = setTimeout(() => {
            if (active && isPlaying) {
              playNext();
            }
          }, 450);
        } catch (err) {
          console.warn('[RobotAudio] Play error:', err);
          isPlaying = false;
        }
      };

      player.addListener('playbackStatusUpdate', (status) => {
        if (!active) return;
        if (
          status.didJustFinish ||
          status.error ||
          (!status.playing && status.isLoaded && status.duration > 0 && status.currentTime >= status.duration - 0.04)
        ) {
          playNext();
        }
      });

      const unsubAudio = subscribeToRobotAudio(async (pcmBytes) => {
        if (!active || !pcmBytes || pcmBytes.length === 0) return;
        try {
          const base64Wav = pcmToWavBase64(pcmBytes);
          const cacheDir = FileSystem.cacheDirectory || '';
          const filePath = `${cacheDir}lumi_audio_${slot}.wav`;
          slot = (slot + 1) % 2;

          await FileSystem.writeAsStringAsync(filePath, base64Wav, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Bound queue to max 2 chunks (~600ms) to ensure low-latency real-time listening
          if (audioQueue.length >= 2) {
            audioQueue.shift();
          }
          audioQueue.push(filePath);

          if (!isPlaying) {
            playNext();
          }
        } catch (e) {
          console.warn('[RobotAudio] Cache/playback error:', e);
        }
      });

      return () => {
        active = false;
        if (fallbackTimer) clearTimeout(fallbackTimer);
        try {
          controlChannel.send({ t: 'listen_stop' });
        } catch { }
        unsubAudio();
        try {
          player?.pause();
          player?.remove();
        } catch { }
      };
    } catch (err) {
      console.warn('[RobotAudio] AudioPlayer init warning:', err);
      return () => {
        try {
          controlChannel.send({ t: 'listen_stop' });
        } catch { }
      };
    }
  }, [isAudioListening]);

  const handleBackPress = useCallback(() => {
    controlChannel.stopDriving();
    liveService.disconnect().catch(() => { });
    router.back();
  }, [router]);

  useEffect(() => {
    const onBackPress = () => {
      handleBackPress();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      sub.remove();
    };
  }, [handleBackPress]);

  // Sync PTT talk state with robot microphone and send walkie-talkie cues
  useEffect(() => {
    const active = isTalking || isMicLocked;
    setRobotMicrophone(active);
    if (active) {
      controlChannel.send({ t: 'mic_start' });
    } else {
      controlChannel.send({ t: 'mic_stop' });
    }
  }, [isTalking, isMicLocked]);

  const ensureMicrophonePermission = async (): Promise<boolean> => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (status.granted) {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        return true;
      }
    } catch {
      // fallback to PermissionsAndroid
    }
    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (hasPermission) return true;
        const status = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'LUMI needs access to your microphone so you can talk through your robot.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        return status === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[PTT] Permission error:', err);
        return false;
      }
    }
    return true;
  };

  const startAudioCapture = async (): Promise<boolean> => {
    const ok = await ensureMicrophonePermission();
    if (!ok) return false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    setIsTalking(true);
    // Ensure stream is active if not already
    try {
      await audioStream.start();
    } catch { }
    return true;
  };

  const stopAudioCapture = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    setIsTalking(false);
  };

  const handleStartTalking = async () => {
    if (isMicLocked) return;
    await startAudioCapture();
  };

  const handleStopTalking = () => {
    if (isMicLocked) return;
    stopAudioCapture();
  };

  // Actions Drawer
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeEmotion, setActiveEmotion] = useState<Emotion>('happy');

  // Virtual Joystick Shared Values
  const puckX = useSharedValue(0);
  const puckY = useSharedValue(0);

  // PTT Wave Animation
  const waveScale = useSharedValue(1);

  // Session duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // Load robot & connect to LiveKit WebRTC Cloud stream
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const r = await robotService.getRobot(id as string);
        if (mounted) {
          setRobot(r);
          const robotIp = r?.localIp || (r as any)?.local_ip || (r as any)?.ip;
          if (robotIp) {
            setCameraStreamUrl(`http://${robotIp}:81`);
          }
        }

        await liveService.connect(id as string, {
          onConnectionStateChange: (state) => {
            if (mounted) {
              setConnectionState(state);
            }
          },
          onTelemetry: (telem) => {
            if (mounted) {
              setTelemetry(telem);
              if (telem.currentEmotion) {
                setActiveEmotion(telem.currentEmotion as Emotion);
              }
              const streamIp = (telem as any)?.localIp || (telem as any)?.local_ip || (telem as any)?.ip;
              if (streamIp) {
                setCameraStreamUrl(`http://${streamIp}:81`);
              }
            }
          },
          onError: (err) => {
            if (mounted) {
              console.warn('[DriveScreen] Live stream connection warning:', err);
            }
          },
        });
      } catch (err: any) {
        if (mounted) {
          console.warn('[DriveScreen] Init connection warning:', err);
        }
      }
    }

    init();

    return () => {
      mounted = false;
      controlChannel.stopDriving();
      liveService.disconnect().catch((err) => {
        console.warn('[DriveScreen] Error disconnecting on unmount:', err);
      });
    };
  }, [id]);

  // Active speed multiplier ref to prevent stale closure in PanResponder
  const speedMultiplierRef = useRef(speedMultiplier);
  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  // Active driving coordinates and heartbeat interval
  const currentCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const driveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDriveSendTimeRef = useRef<number>(0);

  const startDriveLoop = useCallback(() => {
    if (driveTimerRef.current) return;
    driveTimerRef.current = setInterval(() => {
      const { x, y } = currentCoords.current;
      if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) {
        lastDriveSendTimeRef.current = Date.now();
        controlChannel.startDriving(
          Number((x * speedMultiplierRef.current).toFixed(2)),
          Number((y * speedMultiplierRef.current).toFixed(2)),
        );
      }
    }, 28);
  }, []);

  const stopDriveLoop = useCallback(() => {
    if (driveTimerRef.current) {
      clearInterval(driveTimerRef.current);
      driveTimerRef.current = null;
    }
    currentCoords.current = { x: 0, y: 0 };
    controlChannel.stopDriving();
  }, []);

  useEffect(() => {
    return () => {
      if (driveTimerRef.current) {
        clearInterval(driveTimerRef.current);
        driveTimerRef.current = null;
      }
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (_, gestureState) => {
        const dx = gestureState.dx;
        const dy = gestureState.dy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let clampedX = dx;
        let clampedY = dy;

        if (distance > MAX_DRAG) {
          const ratio = MAX_DRAG / distance;
          clampedX = dx * ratio;
          clampedY = dy * ratio;
        }

        puckX.value = clampedX;
        puckY.value = clampedY;

        const normalizedX = Number((clampedX / MAX_DRAG).toFixed(2));
        const normalizedY = Number((-clampedY / MAX_DRAG).toFixed(2));
        currentCoords.current = { x: normalizedX, y: normalizedY };

        lastDriveSendTimeRef.current = Date.now();
        controlChannel.startDriving(
          Number((normalizedX * speedMultiplierRef.current).toFixed(2)),
          Number((normalizedY * speedMultiplierRef.current).toFixed(2)),
        );
        startDriveLoop();
      },
      onPanResponderMove: (_, gestureState) => {
        const dx = gestureState.dx;
        const dy = gestureState.dy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let clampedX = dx;
        let clampedY = dy;

        if (distance > MAX_DRAG) {
          const ratio = MAX_DRAG / distance;
          clampedX = dx * ratio;
          clampedY = dy * ratio;
        }

        puckX.value = clampedX;
        puckY.value = clampedY;

        const normalizedX = Number((clampedX / MAX_DRAG).toFixed(2));
        const normalizedY = Number((-clampedY / MAX_DRAG).toFixed(2));
        currentCoords.current = { x: normalizedX, y: normalizedY };

        startDriveLoop();

        // Throttle gesture move events to 25ms to achieve zero-lag snappy response (40Hz)
        const now = Date.now();
        if (now - lastDriveSendTimeRef.current >= 25) {
          lastDriveSendTimeRef.current = now;
          controlChannel.startDriving(
            Number((normalizedX * speedMultiplierRef.current).toFixed(2)),
            Number((normalizedY * speedMultiplierRef.current).toFixed(2)),
          );
        }
      },
      onPanResponderRelease: () => {
        puckX.value = withSpring(0, { damping: 15, stiffness: 200 });
        puckY.value = withSpring(0, { damping: 15, stiffness: 200 });
        stopDriveLoop();
      },
      onPanResponderTerminate: () => {
        puckX.value = withSpring(0, { damping: 15, stiffness: 200 });
        puckY.value = withSpring(0, { damping: 15, stiffness: 200 });
        stopDriveLoop();
      },
    }),
  ).current;

  const animatedPuckStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: puckX.value }, { translateY: puckY.value }],
  }));

  // PTT Wave pulse
  useEffect(() => {
    if (isTalking || isMicLocked) {
      waveScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 400 }),
          withTiming(1.0, { duration: 400 }),
        ),
        -1,
        true,
      );
    } else {
      waveScale.value = withTiming(1.0, { duration: 200 });
    }
  }, [isTalking, isMicLocked, waveScale]);

  const animatedWaveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: waveScale.value }],
    opacity: isTalking || isMicLocked ? 0.35 : 0,
  }));

  // Emergency Stop
  const handleEmergencyStop = () => {
    haptics.heavy();
    puckX.value = withSpring(0);
    puckY.value = withSpring(0);
    controlChannel.send({ t: 'stop' });
  };

  // End Session flow
  const handleConfirmEndSession = () => {
    haptics.warning();
    showAlert(
      t('live.endSessionConfirm', 'End this session?'),
      `Session duration: ${formatTimer(elapsedSeconds)}`,
      [
        { text: t('live.keepDriving', 'Keep driving'), style: 'cancel' },
        {
          text: t('live.end', 'End Session'),
          style: 'destructive',
          onPress: async () => {
            await liveService.disconnect();
            let sessionId = '';
            try {
              const sess = await sessionService.createSession(
                id as string,
                new Date(sessionStartTime).toISOString(),
                new Date().toISOString()
              );
              sessionId = sess.id;
            } catch (err) {
              console.warn('Failed to record session:', err);
            }
            router.replace({
              pathname: '/robot/[id]/end',
              params: {
                id: id as string,
                sessionId,
                duration: elapsedSeconds.toString(),
                robotName: robot?.name || 'LUMI',
              },
            });
          },
        },
      ],
      'warning'
    );
  };

  const handleSendEmotion = (emotion: Emotion) => {
    haptics.medium();
    setActiveEmotion(emotion);
    controlChannel.sendEmotion(emotion);
  };

  const handleSendGesture = (gestureName: string) => {
    haptics.medium();
    controlChannel.sendGesture(gestureName);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      {/* ── Top Header Bar ── */}
      <View style={[styles.topHud, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeftGroup}>
          {/* Back Circular Button */}
          <Pressable
            onPress={handleBackPress}
            hitSlop={8}
            style={styles.circleIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ChevronLeft size={20} color="#F8FAFC" />
          </Pressable>

          {/* Avatar with purple robot smile */}
          <View style={styles.avatarWrap}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <SvgCircle cx={7.5} cy={8.5} r={1.6} fill="#00F0FF" />
              <SvgCircle cx={16.5} cy={8.5} r={1.6} fill="#00F0FF" />
              <SvgPath
                d="M8 14.5 C9.5 17.5 14.5 17.5 16 14.5"
                stroke="#00F0FF"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </View>

          {/* Robot Title & Live Indicator */}
          <View style={styles.titleColumn}>
            <Text style={styles.robotHudName}>{(robot?.name || 'LUMI').toUpperCase()}</Text>
            <View style={styles.liveBadgeRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE · {formatTimer(elapsedSeconds)}</Text>
            </View>
          </View>
        </View>

        {/* End Call Circular Button */}
        <Pressable
          onPress={handleConfirmEndSession}
          style={styles.endCallBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="End session"
        >
          <PhoneOff size={18} color="#EF4444" />
        </Pressable>
      </View>

      {/* ── Status Banner (if weak or reconnecting) ── */}
      {connectionState === 'weak' && (
        <View style={[styles.statusBanner, { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderColor: 'rgba(234, 179, 8, 0.3)' }]}>
          <Text style={[styles.statusBannerText, { color: '#FACC15' }]}>
            {t('live.weakConnection', 'Weak connection — video may lag')}
          </Text>
        </View>
      )}

      {connectionState === 'reconnecting' && (
        <View style={[styles.statusBanner, { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.3)' }]}>
          <RefreshCw size={13} color="#FB923C" style={{ marginRight: 6 }} />
          <Text style={[styles.statusBannerText, { color: '#FB923C' }]}>
            {t('live.reconnecting', 'Reconnecting to LUMI…')}
          </Text>
        </View>
      )}

      {/* ── Camera Viewport Card (FPV Cinema Viewport) ── */}
      <View style={styles.cameraViewportCard}>
        {/* Aerospace HUD Corner Reticles */}
        <View style={styles.reticleTopLeft} pointerEvents="none" />
        <View style={styles.reticleTopRight} pointerEvents="none" />
        <View style={styles.reticleBottomLeft} pointerEvents="none" />
        <View style={styles.reticleBottomRight} pointerEvents="none" />

        {/* Badges on Top-Left: Latency & Battery */}
        <View style={styles.cameraBadgesRow}>
          <View style={styles.badgePill}>
            <Wifi size={13} color="#10B981" />
            <Text style={[styles.badgeText, { color: '#10B981' }]}>{telemetry.latencyMs || 40} ms</Text>
          </View>
          <View style={styles.badgePill}>
            <BatteryMedium size={14} color="#00F0FF" />
            <Text style={[styles.badgeText, { color: '#00F0FF' }]}>{telemetry.batteryPercent || 90}%</Text>
          </View>
        </View>

        {/* Badges on Top-Right: Listen to Robot Audio Toggle */}
        <View style={styles.cameraTopRightBadgesRow}>
          <Pressable
            onPress={() => {
              haptics.selection();
              setIsAudioListening((prev) => !prev);
            }}
            style={[
              styles.badgePill,
              styles.listenPill,
              isAudioListening && styles.listenPillActive,
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isAudioListening ? 'Mute robot mic' : 'Listen to robot mic'}
          >
            {isAudioListening ? (
              <Volume2 size={14} color="#00F0FF" />
            ) : (
              <VolumeX size={14} color="#94A3B8" />
            )}
            <Text style={[styles.badgeText, { color: isAudioListening ? '#00F0FF' : '#94A3B8' }]}>
              {isAudioListening ? 'Listening' : 'Muted'}
            </Text>
          </Pressable>
        </View>

        {/* Camera Feed or Placeholder */}
        {hasCloudFeed || videoTrack || cameraStreamUrl ? (
          <DoubleBufferedCameraFeed
            videoTrack={videoTrack}
            cameraStreamUrl={cameraStreamUrl}
            onHasCloudFrameChange={setHasCloudFeed}
            connectionState={connectionState}
          />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Video size={36} color="#64748B" />
            <Text style={styles.cameraPlaceholderText}>Connecting video feed…</Text>
          </View>
        )}

        {/* Fullscreen Button on Bottom-Right */}
        <Pressable
          style={styles.fullscreenBtn}
          hitSlop={8}
          onPress={() => {
            haptics.selection();
          }}
          accessibilityRole="button"
          accessibilityLabel="Fullscreen"
        >
          <Maximize2 size={16} color="#F8FAFC" />
        </Pressable>
      </View>

      {/* ── Lower Control Sheet ── */}
      <View
        style={[
          styles.bottomSheet,
          { paddingBottom: Math.max(insets.bottom, 16) + 12 },
        ]}
      >
        {/* Sheet Top Bar: Speed Selector & Emotes */}
        <View style={styles.sheetTopRow}>
          {/* Speed Selector Pill */}
          <View style={styles.speedSelectorPill}>
            {[
              { val: 0.5, label: 'ECO', activeColor: '#00F0FF' },
              { val: 1.0, label: 'NORM', activeColor: '#A78BFA' },
              { val: 1.5, label: 'SPORT', activeColor: '#F59E0B' },
            ].map(({ val, label, activeColor }) => {
              const isActive = speedMultiplier === val;
              return (
                <Pressable
                  key={val}
                  onPress={() => {
                    haptics.selection();
                    setSpeedMultiplier(val);
                  }}
                  style={[
                    styles.speedOption,
                    isActive && { backgroundColor: activeColor + '22', borderColor: activeColor + '55', borderWidth: 1 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.speedOptionText,
                      isActive && { color: activeColor, fontWeight: '800' },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Emotes Trigger Pill */}
          <Pressable
            onPress={() => setShowDrawer(true)}
            style={styles.emotesPillBtn}
            accessibilityRole="button"
            accessibilityLabel="Emotes and tricks"
          >
            <Smile size={17} color="#A78BFA" />
            <Text style={styles.emotesPillText}>Emotes</Text>
            <ChevronUp size={15} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Console Driving Controls: Left Joystick, Right Actions */}
        <View style={styles.consoleRow}>
          {/* Left Column: Virtual Joystick */}
          <View style={styles.joystickColumn}>
            <View style={styles.joystickBase} {...panResponder.panHandlers}>
              {/* Concentric Guide Ring */}
              <View style={styles.joystickInnerRing} pointerEvents="none" />

              {/* Directional Chevrons */}
              <ChevronUp size={22} color="#64748B" style={styles.arrowTop} />
              <ChevronDown size={22} color="#64748B" style={styles.arrowBottom} />
              <ChevronLeft size={22} color="#64748B" style={styles.arrowLeft} />
              <ChevronRight size={22} color="#64748B" style={styles.arrowRight} />

              {/* Draggable Illuminated Puck */}
              <Animated.View style={[styles.joystickPuck, animatedPuckStyle]}>
                <View style={styles.joystickPuckCore} />
              </Animated.View>
            </View>
            <Text style={styles.columnLabel}>DRIVE</Text>
          </View>

          {/* Right Column: Stop & Hold to talk */}
          <View style={styles.actionsColumn}>
            {/* Red Stop Button */}
            <View style={styles.actionItem}>
              <Pressable
                onPress={handleEmergencyStop}
                style={styles.stopCircleBtn}
                accessibilityRole="button"
                accessibilityLabel="Emergency stop"
              >
                <View style={styles.stopInnerSquare} />
              </Pressable>
              <Text style={styles.stopLabel}>STOP</Text>
            </View>

            {/* Purple Mic Button with Lock Toggle */}
            <View style={styles.actionItem}>
              <View style={styles.micBtnWrapper}>
                <Animated.View
                  style={[
                    styles.pttWavePulse,
                    { backgroundColor: '#7C3AED' },
                    animatedWaveStyle,
                  ]}
                />

                <Pressable
                  onPressIn={handleStartTalking}
                  onPressOut={handleStopTalking}
                  pressRetentionOffset={{ top: 30, bottom: 30, left: 30, right: 30 }}
                  hitSlop={10}
                  style={[
                    styles.micMainBtn,
                    (isTalking || isMicLocked) && styles.micMainBtnActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Hold to talk"
                >
                  <Mic size={34} color="#FFFFFF" />
                </Pressable>

                {/* Lock Toggle Badge */}
                <Pressable
                  onPress={async () => {
                    if (!isMicLocked) {
                      const ok = await startAudioCapture();
                      if (ok) {
                        setIsMicLocked(true);
                      }
                    } else {
                      setIsMicLocked(false);
                      stopAudioCapture();
                    }
                  }}
                  style={[
                    styles.micLockBadge,
                    isMicLocked && styles.micLockBadgeActive,
                  ]}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={isMicLocked ? 'Unlock microphone' : 'Lock microphone on'}
                >
                  <Lock
                    size={13}
                    color={isMicLocked ? '#00F0FF' : '#94A3B8'}
                    strokeWidth={2.4}
                  />
                </Pressable>
              </View>

              <Text style={styles.columnLabel}>
                {isMicLocked
                  ? 'MIC ACTIVE'
                  : isTalking
                    ? 'TALKING…'
                    : 'HOLD TO TALK'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Emotions & Gestures Modal Drawer ── */}
      <Modal
        visible={showDrawer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDrawer(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowDrawer(false)}
        >
          <Pressable style={styles.drawerCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerHeaderLeft}>
                <Sparkles size={18} color="#00F0FF" />
                <Text style={styles.drawerTitle}>Emotions & Gestures</Text>
              </View>
              <Pressable
                onPress={() => setShowDrawer(false)}
                hitSlop={8}
                style={styles.closeDrawerBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={18} color="#94A3B8" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Emotions */}
              <Text style={styles.drawerSectionLabel}>EXPRESSIONS</Text>
              <View style={styles.drawerEmotionsGrid}>
                {EMOTIONS_LIST.map(({ name, label, Icon }) => {
                  const isCurrent = activeEmotion === name;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => handleSendEmotion(name)}
                      style={[
                        styles.drawerEmoteChip,
                        isCurrent && styles.drawerEmoteChipActive,
                      ]}
                    >
                      <Icon
                        size={18}
                        color={isCurrent ? '#00F0FF' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.drawerEmoteText,
                          isCurrent && { color: '#00F0FF', fontWeight: '700' },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Gestures & Tricks */}
              <Text style={styles.drawerSectionLabel}>GESTURES & TRICKS</Text>
              <View style={styles.drawerGesturesGrid}>
                {GESTURES_LIST.map(({ name, label }) => {
                  const isTrick = name === 'spin' || name === 'surveillance';
                  return (
                    <Pressable
                      key={name}
                      onPress={() => handleSendGesture(name)}
                      style={[
                        styles.drawerGestureBtn,
                        isTrick && styles.drawerTrickBtn,
                      ]}
                    >
                      <Text
                        style={[
                          styles.drawerGestureText,
                          isTrick && styles.drawerTrickText,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090812',
  },
  topHud: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#090812',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151326',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleColumn: {
    justifyContent: 'center',
  },
  robotHudName: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F0FF',
  },
  liveText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  endCallBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginHorizontal: 18,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cameraViewportCard: {
    marginHorizontal: 18,
    flex: 1,
    maxHeight: 290,
    minHeight: 220,
    backgroundColor: '#05040A',
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#00F0FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cameraImageFull: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  reticleTopLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#00F0FF',
    opacity: 0.75,
    zIndex: 6,
  },
  reticleTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#00F0FF',
    opacity: 0.75,
    zIndex: 6,
  },
  reticleBottomLeft: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 14,
    height: 14,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#00F0FF',
    opacity: 0.75,
    zIndex: 6,
  },
  reticleBottomRight: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 14,
    height: 14,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#00F0FF',
    opacity: 0.75,
    zIndex: 6,
  },
  cameraBadgesRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  cameraTopRightBadgesRow: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(9, 8, 16, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  listenPill: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  listenPillActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: 'rgba(0, 240, 255, 0.4)',
  },
  badgeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  cameraPlaceholderText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  fullscreenBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(9, 8, 16, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#110F20',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 14,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  speedSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18152B',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  speedOption: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
  },
  speedOptionText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emotesPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#18152B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.28)',
  },
  emotesPillText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  consoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  joystickColumn: {
    alignItems: 'center',
  },
  joystickBase: {
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: '#161329',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  joystickInnerRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  arrowTop: {
    position: 'absolute',
    top: 12,
    left: 87,
  },
  arrowBottom: {
    position: 'absolute',
    bottom: 12,
    left: 87,
  },
  arrowLeft: {
    position: 'absolute',
    left: 12,
    top: 87,
  },
  arrowRight: {
    position: 'absolute',
    right: 12,
    top: 87,
  },
  joystickPuck: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#7C3AED',
    borderWidth: 3,
    borderColor: 'rgba(0, 240, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  joystickPuckCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#00F0FF',
    opacity: 0.9,
  },
  columnLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 10,
  },
  actionsColumn: {
    alignItems: 'center',
    width: 100,
    gap: 16,
  },
  actionItem: {
    alignItems: 'center',
  },
  stopCircleBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#991B1B',
    borderWidth: 2.5,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  stopInnerSquare: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  stopLabel: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 6,
  },
  micBtnWrapper: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pttWavePulse: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  micMainBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#7C3AED',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  micMainBtnActive: {
    backgroundColor: '#6D28D9',
    borderColor: '#00F0FF',
    transform: [{ scale: 0.96 }],
  },
  micLockBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1B33',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  micLockBadgeActive: {
    backgroundColor: '#0F262B',
    borderColor: '#00F0FF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 4, 10, 0.75)',
    justifyContent: 'flex-end',
  },
  drawerCard: {
    backgroundColor: '#110F20',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.lg,
    maxHeight: '65%',
    gap: spacing.md,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: spacing.sm,
  },
  drawerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  drawerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeDrawerBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
  },
  drawerSectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  drawerEmotionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  drawerEmoteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18152B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  drawerEmoteChipActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
  },
  drawerEmoteText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  drawerGesturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  drawerGestureBtn: {
    backgroundColor: '#18152B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  drawerGestureText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  drawerTrickBtn: {
    borderColor: 'rgba(124, 58, 237, 0.5)',
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  drawerTrickText: {
    color: '#A78BFA',
  },
});
