export interface TransitionContextInterface {
  transition: string;
  from: string;
  to: string | string[];
  payload: any;
  meta: any;
}
