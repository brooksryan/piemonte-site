import { useRef, useState, useEffect } from 'react';
import clsx from 'clsx';
import { useActiveUser, userInitial, userLabel, ACTIVE_USERS, type ActiveUser } from '../lib/user';

interface HeaderProps {
  onOpenSearch?: () => void;
}

export default function Header({ onOpenSearch }: HeaderProps) {
  const [activeUser, setActiveUser] = useActiveUser();
  const [sheetOpen, setSheetOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);

  // Dismiss sheet on outside click
  useEffect(() => {
    if (!sheetOpen) return;
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setSheetOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sheetOpen]);

  function handleSelectUser(u: ActiveUser) {
    setActiveUser(u);
    setSheetOpen(false);
  }

  return (
    <header className="fixed top-0 inset-x-0 h-14 bg-surface border-b border-border z-30 flex items-center px-2 gap-2">
      {/* Avatar with user switcher */}
      <div className="relative flex-shrink-0">
        <button
          ref={avatarRef}
          aria-label="switch active user"
          onClick={() => setSheetOpen(v => !v)}
          className="h-10 w-10 rounded-full bg-accent text-paper font-semibold text-base flex items-center justify-center"
        >
          {userInitial(activeUser)}
        </button>

        {sheetOpen && (
          <>
            {/* Transparent backdrop to catch outside clicks */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setSheetOpen(false)}
            />
            {/* Switch sheet */}
            <div className="absolute top-12 left-0 z-50 bg-surface border border-border rounded-xl shadow-lg min-w-[140px] py-1">
              {ACTIVE_USERS.map(u => (
                <button
                  key={u}
                  onClick={() => handleSelectUser(u)}
                  className={clsx(
                    'w-full text-left px-4 py-2 text-sm flex items-center justify-between gap-2',
                    activeUser === u ? 'text-accent font-semibold' : 'text-ink',
                  )}
                >
                  {userLabel(u)}
                  {activeUser === u && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Search input */}
      <div className="flex-1">
        <input
          aria-label="search"
          readOnly
          placeholder="Search Piemonte and Liguria"
          onClick={onOpenSearch}
          onFocus={onOpenSearch}
          className="w-full h-9 bg-paper border border-border rounded-lg px-3 text-sm text-ink placeholder:text-muted cursor-pointer focus:outline-none"
        />
      </div>
    </header>
  );
}
