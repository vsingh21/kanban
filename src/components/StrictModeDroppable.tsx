import { useState, useEffect } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import type { DroppableProps } from 'react-beautiful-dnd';

/**
 * Enhanced StrictModeDroppable is a workaround for react-beautiful-dnd in React 18
 * 
 * This version uses a longer timeout and more robust state management to ensure
 * droppable areas are correctly initialized even in StrictMode.
 */
export const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  // Use a more descriptive state variable
  const [isDroppableEnabled, setIsDroppableEnabled] = useState(false);

  useEffect(() => {
    // Use a slightly longer timeout to ensure all components are fully mounted
    const timeoutId = setTimeout(() => {
      setIsDroppableEnabled(true);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, []);

  // Render a placeholder until the droppable is ready
  if (!isDroppableEnabled) {
    return (
      <div 
        style={{ 
          minHeight: '150px',
          border: '2px dashed #e2e8f0',
          borderRadius: '0.375rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  return <Droppable {...props}>{children}</Droppable>;
}; 