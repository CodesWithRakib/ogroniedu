import type { AuthState } from './slices/auth-slice';
import type { UiState } from './slices/ui-slice';

export interface AppStateWithAuthAndUi {
  auth?: AuthState;
  ui?: UiState;
}

export type BaseApiState = AppStateWithAuthAndUi;
