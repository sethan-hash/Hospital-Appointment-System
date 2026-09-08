import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Icon } from '../common/Icon';
import { PATIENT_NAV_ITEMS } from '../../utils/constants';

/**
 * Bottom Navigation Bar Component (Mobile Viewport)
 * Implements Stitch bottom bar with active pill indicators, icons, labels, and glassmorphism.
 */
export function BottomNavBar() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 py-2 border-t border-outline-variant/20 glass-nav shadow-bottom-nav rounded-t-xl">
      {PATIENT_NAV_ITEMS.map((item) => {
        const isActive = location.pathname.startsWith(item.path);

        return (
          <Link
            key={item.id}
            to={item.path}
            className={`
              flex flex-col items-center justify-center transition-all duration-200 active:scale-90 px-3 py-1 rounded-full
              ${
                isActive
                  ? 'bg-primary-container text-on-primary font-semibold'
                  : 'text-on-surface-variant hover:text-primary'
              }
            `}
          >
            <Icon
              name={item.icon}
              filled={isActive}
              className="text-2xl mb-0.5"
            />
            <span className="font-label-md text-label-md text-[11px] leading-none">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
