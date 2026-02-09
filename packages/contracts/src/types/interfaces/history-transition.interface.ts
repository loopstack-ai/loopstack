// todo rename
export interface HistoryTransition {
  id: string;
  from: string | null;
  to: string;
  onError?: string;
  payload: any;
}
