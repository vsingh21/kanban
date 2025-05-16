import { useState, useEffect } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import type { DroppableProps } from 'react-beautiful-dnd';

/**
 * StrictModeDroppable is a workaround for react-beautiful-dnd in React 18
 * 
 * In React 18's Strict Mode, components are mounted, unmounted, and remounted
 * to help detect side effects. This breaks react-beautiful-dnd which relies on
 * refs that need to stay consistent.
 * 
 * This component delays rendering the Droppable until after the initial
 * mount cycle, preventing the react-beautiful-dnd errors.
 */
export const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Wait until after component mount to enable the droppable
    const timeout = setTimeout(() => {
      setEnabled(true);
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
}; 