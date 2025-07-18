import { Injectable, Logger } from '@nestjs/common';
import { TemplateDetector, TemplateProcessor } from '../template.service';
import { difference, get, map } from 'lodash';
import { ObjectExpressionError } from '../../errors/object-expression.error';

interface ValidationOptions {
  maxDepth?: number;
  maxLength?: number;
  allowedPatterns?: RegExp[];
}

interface ProcessingContext {
  variables: Record<string, any>;
  depth?: number;
}

interface FunctionCall {
  name: string;
  args: string[];
}

interface ExpressionFunction {
  name: string;
  handler: (args: any[], variables: Record<string, any>) => any;
  minArgs?: number;
  maxArgs?: number;
}

interface ResourceLimits {
  maxIterations: number;
  maxMemoryMB: number;
  timeoutMs: number;
  maxDataSize: number;
  maxObjectDepth: number;
}

interface ResourceMonitor {
  iterations: number;
  startTime: number;
  memoryBaseline: number;
  operationMemory: number;
}

@Injectable()
export class ObjectExpressionHandler
  implements TemplateDetector, TemplateProcessor
{
  private readonly logger = new Logger(ObjectExpressionHandler.name);

  private readonly DEFAULT_MAX_DEPTH = 10;
  private readonly DEFAULT_MAX_LENGTH = 1000;

  private readonly RESOURCE_LIMITS: ResourceLimits = {
    maxIterations: 1000,
    maxMemoryMB: 128,
    timeoutMs: 5000,
    maxDataSize: 1024 * 1024, // 1MB
    maxObjectDepth: 10,
  };

  private readonly EXPRESSION_PATTERN = /^\$\{(.+)\}$/;
  private readonly FUNCTION_PATTERN =
    /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*(.*?)\s*\)$/;
  private readonly VALID_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+(\[\d+\])?$/;

  // Security: Prevent prototype pollution
  private readonly FORBIDDEN_PROPERTIES = new Set([
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toString',
    'valueOf',
    'console',
    'Buffer',
    'window',
    'global',
    'process',
    'import',
    'require',
    'function',
    'eval',
  ]);

  private readonly functions = new Map<string, ExpressionFunction>();

  constructor() {
    this.registerBuiltInFunctions();
  }

  canHandle(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const trimmed = value.trim();
    return this.EXPRESSION_PATTERN.test(trimmed);
  }

  process(content: string, variables: Record<string, any>): any {
    try {
      const context: ProcessingContext = {
        variables,
        depth: 0,
      };

      return this.processExpression(content, context);
    } catch (error) {
      this.logger.error(
        `Failed to process object expression: ${error.message}`,
      );

      // Enhanced error logging only in error cases
      this.logger.debug('Expression processing failed', {
        expression: content.substring(0, 100),
        errorType: error.constructor.name,
        errorCode:
          error instanceof ObjectExpressionError ? error.code : 'UNKNOWN',
        variableKeys: Object.keys(variables).slice(0, 10), // Show first 10 variable keys
        expressionLength: content.length,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof ObjectExpressionError) {
        throw error;
      }

      throw new ObjectExpressionError(
        'Object expression evaluation failed',
        'EVALUATION_ERROR',
      );
    }
  }

  private processExpression(content: string, context: ProcessingContext): any {
    const expression = this.extractExpression(content);
    this.validateExpression(expression);

    return this.evaluateExpression(expression, context.variables);
  }

  private extractExpression(content: string): string {
    const trimmed = content.trim();
    const match = trimmed.match(this.EXPRESSION_PATTERN);

    if (!match || !match[1]) {
      this.logger.debug('Expression format validation failed', {
        content: trimmed.substring(0, 50),
        patternUsed: this.EXPRESSION_PATTERN.source,
      });
      throw new ObjectExpressionError(
        'Invalid expression format',
        'INVALID_FORMAT',
      );
    }

    const expression = match[1].trim();
    if (!expression) {
      this.logger.debug('Empty expression detected', {
        originalContent: trimmed,
      });
      throw new ObjectExpressionError(
        'Empty expression not allowed',
        'EMPTY_EXPRESSION',
      );
    }

    return expression;
  }

  private validateExpression(
    expression: string,
    options: ValidationOptions = {},
  ): void {
    const {
      maxDepth = this.DEFAULT_MAX_DEPTH,
      maxLength = this.DEFAULT_MAX_LENGTH,
    } = options;

    if (expression.length > maxLength) {
      this.logger.debug('Expression length exceeded', {
        expressionLength: expression.length,
        maxLength,
        expressionPrefix: expression.substring(0, 50),
      });
      throw new ObjectExpressionError(
        `Expression too long (max: ${maxLength} characters)`,
        'EXPRESSION_TOO_LONG',
      );
    }

    if (this.isFunctionCall(expression)) {
      this.validateFunctionCall(expression);
    } else {
      const segments = this.parseExpressionSegments(expression);
      if (segments.length > maxDepth) {
        this.logger.debug('Expression depth exceeded', {
          segmentCount: segments.length,
          maxDepth,
          segments: segments.slice(0, 5), // Show first 5 segments
        });
        throw new ObjectExpressionError(
          `Expression depth too high (max: ${maxDepth} levels)`,
          'DEPTH_EXCEEDED',
        );
      }

      this.validateSegmentsSecurity(segments);
    }
  }

  private evaluateExpression(
    expression: string,
    variables: Record<string, any>,
  ): any {
    const resourceMonitor: ResourceMonitor = {
      iterations: 0,
      startTime: Date.now(),
      memoryBaseline: process.memoryUsage().heapUsed,
      operationMemory: 0,
    };

    // Check timeout before starting
    this.checkResourceLimits(resourceMonitor);

    try {
      // Check if it's a function call
      if (this.isFunctionCall(expression)) {
        return this.evaluateFunctionCall(
          expression,
          variables,
          resourceMonitor,
        );
      }

      // Simple property access - safe to do in main process
      return get(variables, expression);
    } catch (error) {
      this.logger.debug('Expression evaluation failed', {
        expression: expression.substring(0, 100),
        errorMessage: error.message,
        iterations: resourceMonitor.iterations,
        timeElapsed: Date.now() - resourceMonitor.startTime,
      });
      throw new ObjectExpressionError(
        'Failed to evaluate expression',
        'EVALUATION_FAILED',
      );
    }
  }

  private evaluateFunctionCall(
    expression: string,
    variables: Record<string, any>,
    resourceMonitor: ResourceMonitor,
  ): any {
    const functionCall = this.parseFunctionCall(expression);
    const func = this.functions.get(functionCall.name)!;

    // Resolve arguments in main process
    const resolvedArgs = functionCall.args.map((arg) => {
      if (this.isPropertyAccess(arg)) {
        // Simple property access - no VM needed
        this.checkResourceLimits(resourceMonitor);
        return get(variables, arg);
      } else {
        // Parse literal in main process
        return this.parseLiteral(arg);
      }
    });

    // Execute function in main process with resource monitoring
    this.checkResourceLimits(resourceMonitor);
    return this.wrapFunctionWithLimits(func, resourceMonitor)(
      resolvedArgs,
      variables,
    );
  }

  private parseLiteral(arg: string): string {
    // Remove surrounding quotes (single or double)
    if (
      (arg.startsWith('"') && arg.endsWith('"')) ||
      (arg.startsWith("'") && arg.endsWith("'"))
    ) {
      return arg.slice(1, -1);
    }
    // Return as-is if no quotes
    return arg;
  }

  private wrapFunctionWithLimits(
    func: ExpressionFunction,
    resourceMonitor: ResourceMonitor,
  ): (args: any[], variables: Record<string, any>) => any {
    return (args: any[], variables: Record<string, any>) => {
      // Validate argument count
      if (func.minArgs !== undefined && args.length < func.minArgs) {
        this.logger.debug('Function argument count insufficient', {
          functionName: func.name,
          providedArgs: args.length,
          minArgs: func.minArgs,
        });
        throw new ObjectExpressionError(
          `Function ${func.name} requires at least ${func.minArgs} arguments`,
          'INSUFFICIENT_ARGS',
        );
      }

      if (func.maxArgs !== undefined && args.length > func.maxArgs) {
        this.logger.debug('Function argument count exceeded', {
          functionName: func.name,
          providedArgs: args.length,
          maxArgs: func.maxArgs,
        });
        throw new ObjectExpressionError(
          `Function ${func.name} accepts at most ${func.maxArgs} arguments`,
          'TOO_MANY_ARGS',
        );
      }

      // Execute with resource monitoring
      return func.handler(args, variables);
    };
  }

  private checkResourceLimits(resourceMonitor: ResourceMonitor): void {
    const currentTime = Date.now();
    const timeElapsed = currentTime - resourceMonitor.startTime;

    // Check timeout
    if (timeElapsed > this.RESOURCE_LIMITS.timeoutMs) {
      this.logger.debug('Resource timeout exceeded', {
        timeElapsed,
        timeoutMs: this.RESOURCE_LIMITS.timeoutMs,
        iterations: resourceMonitor.iterations,
      });
      throw new ObjectExpressionError(
        'Resource timeout exceeded',
        'TIMEOUT_EXCEEDED',
      );
    }

    // Check iterations
    resourceMonitor.iterations++;
    if (resourceMonitor.iterations > this.RESOURCE_LIMITS.maxIterations) {
      this.logger.debug('Iteration limit exceeded', {
        iterations: resourceMonitor.iterations,
        maxIterations: this.RESOURCE_LIMITS.maxIterations,
        timeElapsed,
      });
      throw new ObjectExpressionError(
        'Iteration limit exceeded',
        'ITERATION_LIMIT_EXCEEDED',
      );
    }

    // More precise memory monitoring - track operation-specific memory
    const currentMemory = process.memoryUsage().heapUsed;
    const memoryDiff =
      (currentMemory - resourceMonitor.memoryBaseline) / 1024 / 1024; // MB

    if (memoryDiff > this.RESOURCE_LIMITS.maxMemoryMB) {
      this.logger.debug('Memory limit exceeded', {
        memoryDiff: memoryDiff.toFixed(2),
        maxMemoryMB: this.RESOURCE_LIMITS.maxMemoryMB,
        iterations: resourceMonitor.iterations,
        timeElapsed,
      });
      throw new ObjectExpressionError(
        'Memory limit exceeded',
        'MEMORY_LIMIT_EXCEEDED',
      );
    }
  }

  private isFunctionCall(expression: string): boolean {
    // More secure regex to prevent ReDoS
    const maxLength = 1000;
    if (expression.length > maxLength) {
      return false;
    }
    return this.FUNCTION_PATTERN.test(expression);
  }

  private validateFunctionCall(expression: string): void {
    const functionCall = this.parseFunctionCall(expression);

    // Check if function exists
    if (!this.functions.has(functionCall.name)) {
      this.logger.debug('Unknown function called', {
        functionName: functionCall.name,
        availableFunctions: Array.from(this.functions.keys()),
      });
      throw new ObjectExpressionError(
        `Unknown function: ${functionCall.name}`,
        'UNKNOWN_FUNCTION',
      );
    }

    const func = this.functions.get(functionCall.name)!;

    // Validate argument count
    if (func.minArgs !== undefined && functionCall.args.length < func.minArgs) {
      this.logger.debug('Function validation failed - insufficient arguments', {
        functionName: functionCall.name,
        providedArgs: functionCall.args.length,
        minArgs: func.minArgs,
        args: functionCall.args,
      });
      throw new ObjectExpressionError(
        `Function ${functionCall.name} requires at least ${func.minArgs} arguments`,
        'INSUFFICIENT_ARGS',
      );
    }

    if (func.maxArgs !== undefined && functionCall.args.length > func.maxArgs) {
      this.logger.debug('Function validation failed - too many arguments', {
        functionName: functionCall.name,
        providedArgs: functionCall.args.length,
        maxArgs: func.maxArgs,
        args: functionCall.args,
      });
      throw new ObjectExpressionError(
        `Function ${functionCall.name} accepts at most ${func.maxArgs} arguments`,
        'TOO_MANY_ARGS',
      );
    }

    // Validate each argument (for property access arguments)
    for (const arg of functionCall.args) {
      if (this.isPropertyAccess(arg)) {
        const segments = this.parseExpressionSegments(arg);
        this.validateSegmentsSecurity(segments);
      }
    }
  }

  private parseFunctionCall(expression: string): FunctionCall {
    const match = expression.match(this.FUNCTION_PATTERN);
    if (!match) {
      this.logger.debug('Function call parsing failed', {
        expression: expression.substring(0, 100),
        patternUsed: this.FUNCTION_PATTERN.source,
      });
      throw new ObjectExpressionError(
        'Invalid function call format',
        'INVALID_FUNCTION_FORMAT',
      );
    }

    const name = match[1];
    const argsString = match[2];

    // Parse arguments (simple comma-separated for now)
    const args = argsString
      ? argsString
          .split(',')
          .map((arg) => arg.trim())
          .filter((arg) => arg)
      : [];

    return { name, args };
  }

  private isPropertyAccess(arg: string): boolean {
    // Check if argument looks like a property access (contains dots and no quotes)
    return /^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(arg);
  }

  private parseExpressionSegments(expression: string): string[] {
    return expression.split('.').filter((segment) => segment.length > 0);
  }

  private validateSegmentsSecurity(segments: string[]): void {
    for (const segment of segments) {
      // Check for forbidden properties first
      if (this.FORBIDDEN_PROPERTIES.has(segment)) {
        this.logger.debug('Forbidden property access attempt', {
          segment,
          allSegments: segments,
          forbiddenProperties: Array.from(this.FORBIDDEN_PROPERTIES),
        });
        throw new ObjectExpressionError(
          'Expression contains forbidden property access',
          'FORBIDDEN_PROPERTY',
        );
      }

      if (!this.VALID_SEGMENT_PATTERN.test(segment)) {
        this.logger.debug('Invalid segment detected', {
          segment,
          allSegments: segments,
          patternUsed: this.VALID_SEGMENT_PATTERN.source,
        });
        throw new ObjectExpressionError(
          'Expression contains invalid characters or format',
          'INVALID_SEGMENT',
        );
      }
    }
  }

  private registerBuiltInFunctions(): void {
    // String concatenation function
    this.registerFunction({
      name: 'concat',
      handler: (args: any[]) => {
        return args.reduce((result, arg) => {
          if (typeof arg === 'string') {
            return result + arg;
          }
          this.logger.debug('concat function type error', {
            argType: typeof arg,
            argValue: String(arg).substring(0, 50),
          });
          throw new ObjectExpressionError(
            'concat() function only accepts strings',
            'INVALID_ARGUMENT_TYPE',
          );
        }, '');
      },
      minArgs: 2,
    });

    this.registerFunction({
      name: 'map',
      handler: (args: any[]) => {
        const array = args[0];
        const propertyPath = args[1];
        return map(array, propertyPath);
      },
      minArgs: 2,
    });

    this.registerFunction({
      name: 'difference',
      handler: (args: any[]) => {
        return difference(args[0], args[1]);
      },
      minArgs: 2,
    });

    this.registerFunction({
      name: 'or',
      handler: (args: any[]) => {
        return !!args[0] || !!args[1];
      },
      minArgs: 2,
    });

    // FlatMap function - maps and flattens in one operation with limits
    this.registerFunction({
      name: 'flatMap',
      handler: (args: any[], variables: Record<string, any>) => {
        const array = args[0];
        const propertyPath = args[1];

        if (!Array.isArray(array)) {
          this.logger.debug('flatMap function type error - not array', {
            argType: typeof array,
            argValue: String(array).substring(0, 50),
          });
          throw new ObjectExpressionError(
            'flatMap() function first argument must be an array',
            'INVALID_ARGUMENT_TYPE',
          );
        }

        if (typeof propertyPath !== 'string') {
          this.logger.debug(
            'flatMap function type error - property path not string',
            {
              propertyPathType: typeof propertyPath,
              propertyPath: String(propertyPath),
            },
          );
          throw new ObjectExpressionError(
            'flatMap() function second argument must be a property path string',
            'INVALID_ARGUMENT_TYPE',
          );
        }

        // Enforce array size limits
        if (array.length > this.RESOURCE_LIMITS.maxIterations) {
          this.logger.debug('flatMap array too large', {
            arrayLength: array.length,
            maxIterations: this.RESOURCE_LIMITS.maxIterations,
          });
          throw new ObjectExpressionError(
            `Array too large for flatMap (max: ${this.RESOURCE_LIMITS.maxIterations})`,
            'ARRAY_TOO_LARGE',
          );
        }

        const result = [];
        let iterations = 0;

        for (const item of array) {
          // Check iteration limit
          if (++iterations > this.RESOURCE_LIMITS.maxIterations) {
            this.logger.debug('flatMap iteration limit exceeded', {
              iterations,
              maxIterations: this.RESOURCE_LIMITS.maxIterations,
              resultLength: result.length,
            });
            throw new ObjectExpressionError(
              'Iteration limit exceeded in flatMap',
              'ITERATION_LIMIT_EXCEEDED',
            );
          }

          if (typeof item === 'object' && item !== null) {
            const value: [] = get(item, propertyPath);
            if (Array.isArray(value)) {
              // Safer array concatenation - avoid stack overflow from spread
              for (const valueItem of value) {
                if (result.length >= this.RESOURCE_LIMITS.maxIterations) {
                  this.logger.debug('flatMap result too large', {
                    resultLength: result.length,
                    maxIterations: this.RESOURCE_LIMITS.maxIterations,
                  });
                  throw new ObjectExpressionError(
                    'Result array too large in flatMap',
                    'RESULT_TOO_LARGE',
                  );
                }
                result.push(valueItem);
              }
            } else if (value !== undefined) {
              if (result.length >= this.RESOURCE_LIMITS.maxIterations) {
                this.logger.debug('flatMap result too large', {
                  resultLength: result.length,
                  maxIterations: this.RESOURCE_LIMITS.maxIterations,
                });
                throw new ObjectExpressionError(
                  'Result array too large in flatMap',
                  'RESULT_TOO_LARGE',
                );
              }
              result.push(value);
            }
          }
        }

        return result;
      },
      minArgs: 2,
      maxArgs: 2,
    });

    // Length function
    this.registerFunction({
      name: 'length',
      handler: (args: any[]) => {
        const value = args[0];
        if (Array.isArray(value) || typeof value === 'string') {
          return value.length;
        }
        this.logger.debug('length function type error', {
          argType: typeof value,
          isArray: Array.isArray(value),
          argValue: String(value).substring(0, 50),
        });
        throw new ObjectExpressionError(
          'length() function only accepts arrays or strings',
          'INVALID_ARGUMENT_TYPE',
        );
      },
      minArgs: 1,
      maxArgs: 1,
    });

    // First element function
    this.registerFunction({
      name: 'first',
      handler: (args: any[]) => {
        const array = args[0];
        if (!Array.isArray(array)) {
          this.logger.debug('first function type error', {
            argType: typeof array,
            argValue: String(array).substring(0, 50),
          });
          throw new ObjectExpressionError(
            'first() function only accepts arrays',
            'INVALID_ARGUMENT_TYPE',
          );
        }
        return array[0];
      },
      minArgs: 1,
      maxArgs: 1,
    });

    // Last element function
    this.registerFunction({
      name: 'last',
      handler: (args: any[]) => {
        const array = args[0];
        if (!Array.isArray(array)) {
          this.logger.debug('last function type error', {
            argType: typeof array,
            argValue: String(array).substring(0, 50),
          });
          throw new ObjectExpressionError(
            'last() function only accepts arrays',
            'INVALID_ARGUMENT_TYPE',
          );
        }
        return array[array.length - 1];
      },
      minArgs: 1,
      maxArgs: 1,
    });

    // Merge function - merges two objects with second overriding first
    this.registerFunction({
      name: 'merge',
      handler: (args: any[]) => {
        const obj1 = args[0];
        const obj2 = args[1];

        if (typeof obj1 !== 'object' || obj1 === null || Array.isArray(obj1)) {
          this.logger.debug(
            'merge function type error - first arg not object',
            {
              argType: typeof obj1,
              argValue: String(obj1).substring(0, 50),
            },
          );
          throw new ObjectExpressionError(
            'merge() function first argument must be an object',
            'INVALID_ARGUMENT_TYPE',
          );
        }

        if (typeof obj2 !== 'object' || obj2 === null || Array.isArray(obj2)) {
          this.logger.debug(
            'merge function type error - second arg not object',
            {
              argType: typeof obj2,
              argValue: String(obj2).substring(0, 50),
            },
          );
          throw new ObjectExpressionError(
            'merge() function second argument must be an object',
            'INVALID_ARGUMENT_TYPE',
          );
        }

        // Check combined object size limits
        const combinedKeys = new Set([
          ...Object.keys(obj1),
          ...Object.keys(obj2),
        ]);
        if (combinedKeys.size > this.RESOURCE_LIMITS.maxIterations) {
          this.logger.debug('merge result too large', {
            combinedKeyCount: combinedKeys.size,
            maxIterations: this.RESOURCE_LIMITS.maxIterations,
          });
          throw new ObjectExpressionError(
            `Merged object too large (max keys: ${this.RESOURCE_LIMITS.maxIterations})`,
            'OBJECT_TOO_LARGE',
          );
        }

        return { ...obj1, ...obj2 };
      },
      minArgs: 2,
      maxArgs: 2,
    });

    // MergeWith function - merges a common object to all items in an array
    this.registerFunction({
      name: 'mergeWith',
      handler: (args: any[]) => {
        const array = args[0];
        const commonObject = args[1];

        if (!Array.isArray(array)) {
          this.logger.debug('mergeWith function type error - not array', {
            argType: typeof array,
            argValue: String(array).substring(0, 50),
          });
          throw new ObjectExpressionError(
            'mergeWith() function first argument must be an array',
            'INVALID_ARGUMENT_TYPE',
          );
        }

        if (
          typeof commonObject !== 'object' ||
          commonObject === null ||
          Array.isArray(commonObject)
        ) {
          this.logger.debug(
            'mergeWith function type error - common object not object',
            {
              argType: typeof commonObject,
              argValue: String(commonObject).substring(0, 50),
            },
          );
          throw new ObjectExpressionError(
            'mergeWith() function second argument must be an object',
            'INVALID_ARGUMENT_TYPE',
          );
        }

        // Enforce array size limits
        if (array.length > this.RESOURCE_LIMITS.maxIterations) {
          this.logger.debug('mergeWith array too large', {
            arrayLength: array.length,
            maxIterations: this.RESOURCE_LIMITS.maxIterations,
          });
          throw new ObjectExpressionError(
            `Array too large for mergeWith (max: ${this.RESOURCE_LIMITS.maxIterations})`,
            'ARRAY_TOO_LARGE',
          );
        }

        const result: any[] = [];
        let iterations = 0;

        for (const item of array) {
          // Check iteration limit
          if (++iterations > this.RESOURCE_LIMITS.maxIterations) {
            this.logger.debug('mergeWith iteration limit exceeded', {
              iterations,
              maxIterations: this.RESOURCE_LIMITS.maxIterations,
            });
            throw new ObjectExpressionError(
              'Iteration limit exceeded in mergeWith',
              'ITERATION_LIMIT_EXCEEDED',
            );
          }

          if (
            typeof item === 'object' &&
            item !== null &&
            !Array.isArray(item)
          ) {
            // Check merged object size
            const combinedKeys = new Set([
              ...Object.keys(item),
              ...Object.keys(commonObject),
            ]);
            if (combinedKeys.size > this.RESOURCE_LIMITS.maxIterations) {
              this.logger.debug('mergeWith merged item too large', {
                combinedKeyCount: combinedKeys.size,
                maxIterations: this.RESOURCE_LIMITS.maxIterations,
                itemIndex: iterations - 1,
              });
              throw new ObjectExpressionError(
                'Merged item too large in mergeWith',
                'OBJECT_TOO_LARGE',
              );
            }

            result.push({ ...item, ...commonObject });
          } else {
            this.logger.debug('mergeWith skipping non-object item', {
              itemType: typeof item,
              itemValue: String(item).substring(0, 50),
              itemIndex: iterations - 1,
            });
            // Skip non-object items or add them as-is depending on your requirements
            result.push(item);
          }
        }

        return result;
      },
      minArgs: 2,
      maxArgs: 2,
    });
  }

  /**
   * Register a new function that can be used in expressions
   */
  public registerFunction(func: ExpressionFunction): void {
    this.functions.set(func.name, func);
  }
}
