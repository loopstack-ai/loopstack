import { Request as ExpressRequest } from 'express';

export type ApiRequestType = ExpressRequest & { user: string | null };
