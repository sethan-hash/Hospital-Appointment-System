import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Icon } from '../common/Icon';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { PATIENT_NAV_ITEMS } from '../../utils/constants';

/**
 * Top App Bar Navigation Component
 * Directly replicates the Stitch header with branding, back button, desktop navigation, and profile pill.
 */
export function TopAppBar({
  showBack = false,
  title = 'MedLink Care',
  showActions = true,
  onBack,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-surface shadow-app-bar flex items-center justify-between px-margin-mobile border-b border-outline-variant/10">
      {/* Brand & Left Actions */}
      <div className="flex items-center gap-2">
        {showBack ? (
          <button
            type="button"
            onClick={handleBackClick}
            aria-label="Go back"
            className="text-on-surface-variant p-2 -ml-2 rounded-full hover:bg-surface-variant/50 active:scale-95 transition-all"
          >
            <Icon name="arrow_back" className="text-2xl" />
          </button>
        ) : null}

        <Link
          to="/patient/dashboard"
          className="flex items-center gap-2 text-primary hover:opacity-90 transition-opacity"
        >
          <Icon name="local_hospital" filled={true} className="text-2xl text-primary" />
          <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
            {title}
          </span>
        </Link>
      </div>

      {/* Desktop Nav Items */}
      <nav className="hidden md:flex items-center gap-2">
        {PATIENT_NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`
                font-label-lg text-label-lg px-3.5 py-2 rounded-lg transition-all
                ${
                  isActive
                    ? 'text-primary bg-primary-container/10 font-bold'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/40'
                }
              `}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right Actions / Profile */}
      {showActions ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="text-on-surface-variant hover:text-primary p-2 rounded-full hover:bg-primary-container/10 active:scale-95 transition-all"
          >
            <Icon name="notifications" className="text-2xl" />
          </button>

          {currentUser ? (
            <Link to="/patient/profile">
              <Avatar
                src={currentUser.avatar}
                name={currentUser.name}
                size="sm"
                className="hover:ring-2 hover:ring-primary transition-all"
              />
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="w-10" /> /* Spacer for centering */
      )}
    </header>
  );
}
