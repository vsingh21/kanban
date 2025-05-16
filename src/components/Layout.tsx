import type { ReactNode } from 'react';
import ThemeToggle from './ThemeToggle';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="layout-container">
        {children}
      </div>
    </div>
  );
} 