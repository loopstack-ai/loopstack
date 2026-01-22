import { Injectable, OnModuleInit } from '@nestjs/common';
import Handlebars, { RuntimeOptions, TemplateDelegate } from 'handlebars';

export interface CustomHelper {
  name: string;
  fn: (...args: unknown[]) => unknown;
}

export interface RenderOptions extends Omit<RuntimeOptions, 'helpers'> {
  cacheKeyPrefix?: string;
  helpers?: CustomHelper[];
}

interface CachedTemplate {
  template: TemplateDelegate;
  handlebars: typeof Handlebars;
}

@Injectable()
export class HandlebarsProcessor implements OnModuleInit {
  private handlebars!: typeof Handlebars;
  private templateCache = new Map<string, CachedTemplate>();

  private static readonly MAX_TEMPLATE_SIZE = 50_000;
  private static readonly MAX_CACHE_SIZE = 100;

  private static readonly RESERVED_HELPERS = new Set(['if', 'unless', 'each', 'with', 'lookup', 'log']);

  private readonly compileOptions: CompileOptions = {
    strict: false,
    noEscape: true,
    assumeObjects: false,
    preventIndent: true,
    knownHelpers: {
      if: true,
      unless: true,
      each: true,
      log: true,
      with: false,
      lookup: false,
    },
    knownHelpersOnly: true,
    data: false,
    explicitPartialContext: true,
    compat: false,
    ignoreStandalone: false,
  };

  onModuleInit(): void {
    this.handlebars = Handlebars.create();
  }

  public render(content: string, data: Record<string, unknown> = {}, options: RenderOptions = {}): string {
    if (typeof content !== 'string') {
      throw new TypeError('Template content must be a string');
    }

    if (content.length > HandlebarsProcessor.MAX_TEMPLATE_SIZE) {
      throw new Error(`Template exceeds maximum size of ${HandlebarsProcessor.MAX_TEMPLATE_SIZE} characters`);
    }

    const { cacheKeyPrefix, helpers: customHelpers, ...runtimeOptions } = options;

    const cacheKey = `${cacheKeyPrefix ?? ''}--${content}`;

    const cached = this.getOrCreateCached(cacheKey, () =>
      customHelpers?.length
        ? this.createCustomHelperTemplate(content, customHelpers)
        : { template: this.handlebars.compile(content, this.compileOptions), handlebars: this.handlebars },
    );

    return cached.template(data, runtimeOptions);
  }

  private getOrCreateCached(key: string, factory: () => CachedTemplate): CachedTemplate {
    let cached = this.templateCache.get(key);

    if (!cached) {
      if (this.templateCache.size >= HandlebarsProcessor.MAX_CACHE_SIZE) {
        const firstKey = this.templateCache.keys().next().value as string | undefined;
        if (firstKey) this.templateCache.delete(firstKey);
      }
      cached = factory();
      this.templateCache.set(key, cached);
    }

    return cached;
  }

  private createCustomHelperTemplate(content: string, customHelpers: CustomHelper[]): CachedTemplate {
    const isolatedHandlebars = Handlebars.create();
    const extendedKnownHelpers: Record<string, boolean> = { ...this.compileOptions.knownHelpers };

    for (const helper of customHelpers) {
      if (HandlebarsProcessor.RESERVED_HELPERS.has(helper.name)) {
        throw new Error(`Cannot override reserved helper: "${helper.name}"`);
      }
      isolatedHandlebars.registerHelper(helper.name, this.wrapHelper(helper.fn));
      extendedKnownHelpers[helper.name] = true;
    }

    const template = isolatedHandlebars.compile(content, {
      ...this.compileOptions,
      knownHelpers: extendedKnownHelpers,
    });

    return { template, handlebars: isolatedHandlebars };
  }

  private wrapHelper(fn: (...args: unknown[]) => unknown): Handlebars.HelperDelegate {
    return function (this: unknown, ...args: unknown[]) {
      const options: unknown = args[args.length - 1];
      const isHandlebarsOptions = options && typeof options === 'object' && 'hash' in options;
      return fn.apply(this, isHandlebarsOptions ? args.slice(0, -1) : args) as unknown;
    };
  }
}
