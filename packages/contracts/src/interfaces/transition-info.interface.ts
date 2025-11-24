export interface TransitionInfoInterface {
  id: string;
  from: string;
  to: string | string[];
  onError?: string;
}
