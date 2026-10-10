import type { ReactNode } from 'react';
import { StoreProvider } from '../../store';

export default function LocaleLayout({ children }: { children: ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>;
}
