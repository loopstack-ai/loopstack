import {
  BlockConfigType,
  BlockMetadata,
  BlockType,
  NamespaceEntity,
  TransitionPayloadInterface,
} from '@loopstack/shared';

export interface BlockData {
  index: string;
  labels: string[];
  namespace: NamespaceEntity;
  item?: any;
  stop?: boolean;
  error?: boolean;
}

export interface BlockContext {
  index: string;
  userId: string | null;
  pipelineId: string;
  workspaceId: string;
  namespace: NamespaceEntity;
  labels: string[];
  payload?: {
    transition?: TransitionPayloadInterface;
  },
  iterationLabel?: string;
}

export interface BlockState {
  stop: boolean;
  error: boolean;
}

export abstract class Block<TConfig extends BlockConfigType = BlockConfigType> {
  #name: string;
  #metadata: BlockMetadata;
  #config: TConfig;

  #context: BlockContext;
  #state: BlockState;

  initBlock(name: string, metadata: BlockMetadata, config: TConfig, context: BlockContext) {
    this.#name = name;
    this.#metadata = metadata;
    this.#config = config;
    this.#context = context;

    this.#state = {
      stop: false,
      error: false,
    }
  }

  get name(): string {
    return this.#name;
  }

  get type(): BlockType {
    return this.#config.type;
  }

  get metadata(): BlockMetadata {
    return this.#metadata;
  }

  get config(): TConfig {
    return this.#config;
  }

  get context(): BlockContext {
    return this.#context;
  }

  get state(): BlockState {
    return this.#state;
  }
}