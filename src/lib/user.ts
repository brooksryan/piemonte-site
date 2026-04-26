import { useState, useEffect } from 'react';

export type ActiveUser = 'brooks' | 'angela';

export const ACTIVE_USERS: readonly ActiveUser[] = ['brooks', 'angela'] as const;

export const STORAGE_KEY = 'piemonte.activeUser';

export function getActiveUser(): ActiveUser {
  if (typeof window === 'undefined') return 'brooks';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'brooks' || stored === 'angela') return stored;
  return 'brooks';
}

export function setActiveUser(u: ActiveUser): void {
  localStorage.setItem(STORAGE_KEY, u);
  window.dispatchEvent(new Event('piemonte:user-changed'));
}

export function useActiveUser(): [ActiveUser, (u: ActiveUser) => void] {
  const [user, setUser] = useState<ActiveUser>(getActiveUser);

  useEffect(() => {
    function sync() {
      setUser(getActiveUser());
    }
    window.addEventListener('storage', sync);
    window.addEventListener('piemonte:user-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('piemonte:user-changed', sync);
    };
  }, []);

  function setter(u: ActiveUser) {
    setActiveUser(u);
  }

  return [user, setter];
}

export function userInitial(u: ActiveUser): 'B' | 'A' {
  return u === 'brooks' ? 'B' : 'A';
}

export function userLabel(u: ActiveUser): string {
  return u === 'brooks' ? 'Brooks' : 'Angela';
}
