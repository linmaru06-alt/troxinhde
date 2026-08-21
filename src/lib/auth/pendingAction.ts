export type PendingActionType = 'save-room' | 'message' | 'book-viewing' | 'post-roommate' | 'post-marketplace';

export interface PendingAction {
  type: PendingActionType;
  payload: Record<string, any>;
  timestamp: number;
}

const STORAGE_KEY = 'troxinh_pending_action';

export function savePendingAction(action: Omit<PendingAction, 'timestamp'>): void {
  try {
    const fullAction: PendingAction = {
      ...action,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fullAction));
  } catch (e) {
    console.error('Failed to save pending action', e);
  }
}

export function getPendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const action = JSON.parse(raw) as PendingAction;
    // Expire after 30 minutes
    if (Date.now() - action.timestamp > 30 * 60 * 1000) {
      clearPendingAction();
      return null;
    }
    return action;
  } catch (e) {
    return null;
  }
}

export function clearPendingAction(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear pending action', e);
  }
}
