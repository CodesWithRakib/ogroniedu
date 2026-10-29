'use client';

import React, { createContext, useContext, useState, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [selected, setSelected] = useState(defaultValue);
  const activeTab = value !== undefined ? value : selected;

  const handleTabChange = (tab: string) => {
    setSelected(tab);
    onValueChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={twMerge('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export const TabList = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={twMerge(
        'inline-flex items-center justify-center rounded-xl bg-surface-muted p-1 text-muted-foreground border border-border shadow-xs',
        className,
      )}
      {...props}
    />
  ),
);
TabList.displayName = 'TabList';

export interface TabTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabTrigger = forwardRef<HTMLButtonElement, TabTriggerProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = useContext(TabsContext);
    if (!context) throw new Error('TabTrigger must be used within Tabs');

    const isSelected = context.activeTab === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        onClick={() => context.setActiveTab(value)}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
            isSelected
              ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover/60',
            className,
          ),
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
TabTrigger.displayName = 'TabTrigger';

export interface TabContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabContent = forwardRef<HTMLDivElement, TabContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = useContext(TabsContext);
    if (!context) throw new Error('TabContent must be used within Tabs');

    if (context.activeTab !== value) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        className={twMerge('mt-3 focus-visible:outline-none', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabContent.displayName = 'TabContent';
