import { Injectable } from '@nestjs/common';

type TurndownCtor = typeof import('turndown');
type TurndownInstance = InstanceType<TurndownCtor>;

@Injectable()
export class WebFetchMarkdownService {
  private instancePromise?: Promise<TurndownInstance>;

  private getService(): Promise<TurndownInstance> {
    return (this.instancePromise ??= import('turndown').then((m) => {
      // @types/turndown only ships `export =`; Node CJS interop wraps it in
      // { default }, so cast through unknown to keep both resolutions happy.
      const Turndown = (m as unknown as { default: TurndownCtor }).default;
      const td = new Turndown({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
      });
      td.remove(['script', 'style', 'noscript', 'iframe']);
      return td;
    }));
  }

  async toMarkdown(html: string): Promise<string> {
    const service = await this.getService();
    return service.turndown(html);
  }
}
