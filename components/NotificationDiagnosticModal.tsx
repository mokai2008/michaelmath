"use client";

import { useState, useEffect } from "react";
import { 
  Bell, 
  BellRing, 
  CheckCircle2, 
  AlertTriangle, 
  Volume2, 
  Settings, 
  X, 
  Monitor, 
  Sparkles,
  RefreshCw
} from "lucide-react";
import { 
  playNotificationSound, 
  requestDesktopNotificationPermission, 
  showDesktopNotification,
  getDesktopNotificationStatus,
  type NotificationPermissionStatus
} from "@/lib/sound";

interface NotificationDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageTitle?: string;
  onPermissionUpdated?: (granted: boolean) => void;
}

export function NotificationDiagnosticModal({
  isOpen,
  onClose,
  pageTitle = "Student Submissions",
  onPermissionUpdated,
}: NotificationDiagnosticModalProps) {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('default');
  const [testSent, setTestSent] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const refreshPermission = () => {
    const status = getDesktopNotificationStatus();
    setPermissionStatus(status);
    if (onPermissionUpdated) {
      onPermissionUpdated(status === 'granted');
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshPermission();
      setTestSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    const granted = await requestDesktopNotificationPermission();
    setIsRequesting(false);
    refreshPermission();
    if (granted) {
      handleSendTest();
    }
  };

  const handleSendTest = () => {
    playNotificationSound();
    const result = showDesktopNotification(
      `🔔 Test Alert: ${pageTitle}`,
      "Live desktop alerts are working! When student work arrives, you will receive an alert like this.",
      () => {
        if (typeof window !== 'undefined') window.focus();
      },
      `michaelmath-test-${Date.now()}`,
      { requireInteraction: true }
    );
    setTestSent(true);
  };

  const handleTestAudioOnly = () => {
    playNotificationSound();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs text-emerald-400">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Desktop Alerts & Sound Check
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                Verify live alerts for {pageTitle}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Status Box */}
          <div className="p-4 rounded-2xl border bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {permissionStatus === 'granted' ? (
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : permissionStatus === 'denied' ? (
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Bell className="w-5 h-5" />
                </div>
              )}
              <div>
                <p className="font-bold text-text">
                  Chrome Permission: {' '}
                  <span className={
                    permissionStatus === 'granted' 
                      ? 'text-emerald-600 font-black' 
                      : permissionStatus === 'denied' 
                        ? 'text-rose-600 font-black' 
                        : 'text-amber-600 font-black'
                  }>
                    {permissionStatus === 'granted' ? 'Allowed ✓' : permissionStatus === 'denied' ? 'Blocked ✗' : 'Needs Approval'}
                  </span>
                </p>
                <p className="text-xs text-text/60 mt-0.5">
                  {permissionStatus === 'granted'
                    ? 'Chrome is permitted to send alerts for gadmaths.com.'
                    : permissionStatus === 'denied'
                      ? 'Chrome address bar is currently blocking notifications for this website.'
                      : 'Click the button below to allow desktop alerts.'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {permissionStatus === 'granted' ? (
                <button
                  onClick={handleSendTest}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Send Test Alert
                </button>
              ) : permissionStatus === 'denied' ? (
                <button
                  onClick={refreshPermission}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-200 text-gray-800 font-bold text-xs hover:bg-gray-300 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-check
                </button>
              ) : (
                <button
                  onClick={handleRequestPermission}
                  disabled={isRequesting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-sm"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Allow Alerts
                </button>
              )}
            </div>
          </div>

          {/* Test Status Banner */}
          {testSent && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <div className="text-xs">
                  <p className="font-bold text-emerald-950">Test alert sent to your Mac screen!</p>
                  <p className="text-emerald-800/80 mt-1">
                    You should hear the audio chime and see a banner in the top-right corner of macOS.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* If Denied in Chrome */}
          {permissionStatus === 'denied' && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900">
              <h4 className="font-bold text-xs flex items-center gap-2 text-rose-950">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                How to unblock in Google Chrome:
              </h4>
              <ol className="list-decimal list-inside text-xs mt-2 space-y-1 text-rose-800">
                <li>Look at the top address bar next to <strong>gadmaths.com</strong></li>
                <li>Click the <strong>tune / sliders icon 🎛️</strong> (or lock icon 🔒)</li>
                <li>Find <strong>Notifications</strong> and change it to <strong>Allow</strong></li>
                <li>Refresh this webpage</li>
              </ol>
            </div>
          )}

          {/* Critical: macOS System Settings Guide */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4.5 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <Monitor className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Did you hear the chime, but NO banner appeared on your Mac?</span>
            </div>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              On macOS, even when Chrome is set to Allow, <strong>macOS System Settings</strong> often has Chrome notifications muted by default. Follow these 3 quick steps to fix it:
            </p>

            <div className="bg-white/80 rounded-xl p-3 border border-amber-200/60 space-y-2 text-xs text-text/80">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p>
                  Click the <strong>Apple menu </strong> (top-left of your Mac) → <strong>System Settings</strong> → <strong>Notifications</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p>
                  Scroll down and click <strong>Google Chrome</strong>. Make sure <strong>Allow Notifications</strong> is toggled <strong>ON</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p>
                  Set the Alert Style to <strong>Banners</strong> or <strong>Alerts</strong> (NOT &ldquo;None&rdquo;). Also ensure <strong>Do Not Disturb / Focus</strong> is turned off in your Mac Control Center.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Audio Test Button */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 text-xs text-text/70">
              <Volume2 className="w-4 h-4 text-primary" />
              <span>Notification chime check:</span>
            </div>
            <button
              onClick={handleTestAudioOnly}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-text font-bold text-xs hover:bg-gray-100 transition-colors shadow-2xs"
            >
              Play Chime Sound 🔊
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-text/50">
            Background polling and live WebSockets are both active.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
