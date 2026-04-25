import { create } from 'zustand';
import { AUTOSIGN_DEFAULTS } from '@/lib/authz';

export interface AutosignSession {
  isEnabled: boolean;
  expiryUnix: number;
  durationSecs: number;
  scopeTarget: string | null;
}

interface SettingsState extends AutosignSession {
  enable: (durationSecs: number, target: string, expiryUnix: number) => void;
  disable: () => void;
  isExpired: (now?: number) => boolean;
}

export const useSettings = create<SettingsState>((set, get) => ({
  isEnabled: false,
  expiryUnix: 0,
  durationSecs: AUTOSIGN_DEFAULTS.defaultDurationSecs,
  scopeTarget: null,
  enable: (durationSecs, target, expiryUnix) =>
    set({ isEnabled: true, durationSecs, scopeTarget: target, expiryUnix }),
  disable: () =>
    set({ isEnabled: false, expiryUnix: 0, scopeTarget: null }),
  isExpired: (now = Math.floor(Date.now() / 1000)) => {
    const s = get();
    if (!s.isEnabled) return true;
    return now >= s.expiryUnix;
  },
}));
