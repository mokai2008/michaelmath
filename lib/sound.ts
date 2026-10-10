/**
 * Utility for audio chimes and desktop notifications.
 * Uses Web Audio API so no external audio files or network requests are required.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  return sharedAudioCtx;
}

export function playNotificationSound() {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: A5 (880 Hz) - pleasant uplift chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.45, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.debug('Notification audio playback skipped:', err);
  }
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function getDesktopNotificationStatus(): NotificationPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return false;
    }
  }
  return false;
}

export interface ShowNotificationResult {
  success: boolean;
  reason?: 'unsupported' | 'denied' | 'default' | 'error' | 'sent';
  error?: any;
}

export function showDesktopNotification(
  title: string,
  body: string,
  onClick?: () => void,
  tag?: string,
  options?: { requireInteraction?: boolean; silent?: boolean }
): ShowNotificationResult {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, reason: 'unsupported' };
  }

  if (Notification.permission !== 'granted') {
    return {
      success: false,
      reason: Notification.permission === 'denied' ? 'denied' : 'default',
    };
  }

  try {
    // ALWAYS generate a unique tag so Chrome and macOS never silently drop repeat notifications!
    const uniqueTag = tag ? `${tag}-${Date.now()}` : `michaelmath-${Date.now()}`;
    const iconUrl = '/favicon.ico';

    const notif = new Notification(title, {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag: uniqueTag,
      requireInteraction: options?.requireInteraction ?? true, // keep visible so tutor does not miss it
      silent: options?.silent ?? false,
    });

    notif.onerror = (err) => {
      console.warn('Desktop notification error event:', err);
    };

    if (onClick) {
      notif.onclick = () => {
        window.focus();
        onClick();
        try {
          notif.close();
        } catch (e) {}
      };
    }

    return { success: true, reason: 'sent' };
  } catch (err: any) {
    console.warn('Desktop notification constructor failed:', err);
    return { success: false, reason: 'error', error: err };
  }
}
