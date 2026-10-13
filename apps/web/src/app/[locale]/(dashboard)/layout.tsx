import React from 'react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {children}
    </div>
  );
}
