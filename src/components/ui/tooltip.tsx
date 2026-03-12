'use client';

import { useState } from 'react';

export function Tooltip({
  text,
  children,
  hide,
}: {
  text: string;
  children: React.ReactNode;
  hide?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && !hide && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1a1a1a',
            color: '#fff',
            padding: '4px 9px',
            borderRadius: 5,
            fontSize: '0.6875rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 100,
            letterSpacing: '0.01em',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
