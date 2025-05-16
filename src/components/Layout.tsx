import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ThemeToggle from './ThemeToggle';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {isDashboard && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-3">
          <button
            onClick={handleSignOut}
            className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 rounded-md shadow-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors duration-200"
            title="Sign out"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span className="ml-1 text-sm font-medium">Sign Out</span>
          </button>
          <ThemeToggle />
        </div>
      )}
      <div className="layout-container">
        {children}
      </div>
    </div>
  );
} 