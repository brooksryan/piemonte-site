import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

interface BottomTabBarProps {
  onOpenSearch?: () => void;
}

export default function BottomTabBar({ onOpenSearch }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 h-16 bg-surface border-t border-border z-30 flex items-stretch justify-around">
      <NavLink
        to="/maps"
        className={({ isActive }) =>
          clsx(
            'flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] text-xs',
            isActive ? 'text-accent' : 'text-muted',
          )
        }
      >
        {/* Map pin */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2a5 5 0 0 1 5 5c0 3.5-5 11-5 11S5 10.5 5 7a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="10" cy="7" r="1.8" fill="currentColor" />
        </svg>
        Maps
      </NavLink>

      <NavLink
        to="/countryside"
        className={({ isActive }) =>
          clsx(
            'flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] text-xs',
            isActive ? 'text-accent' : 'text-muted',
          )
        }
      >
        {/* Leaf */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 17C10 17 3 13 3 7c0-3 2.5-5 7-5 4.5 0 7 2 7 5 0 5-7 10-7 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M10 17V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Countryside
      </NavLink>

      <NavLink
        to="/coastal"
        className={({ isActive }) =>
          clsx(
            'flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] text-xs',
            isActive ? 'text-accent' : 'text-muted',
          )
        }
      >
        {/* Wave */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M2 11c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M2 14.5c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Coastal
      </NavLink>

      <NavLink
        to="/plan"
        className={({ isActive }) =>
          clsx(
            'flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] text-xs',
            isActive ? 'text-accent' : 'text-muted',
          )
        }
      >
        {/* Calendar */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 8h14" stroke="currentColor" strokeWidth="1.4" />
          <path d="M7 2v3M13 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Plan
      </NavLink>

      <button
        onClick={onOpenSearch}
        className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] text-xs text-muted"
        aria-label="Open search"
      >
        {/* Magnifier */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Search
      </button>
    </nav>
  );
}
