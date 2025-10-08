import {
  BlockConfigType,
  BlockMetadata,
  NamespaceEntity, Output,
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
}

export interface BlockState {
  stop: boolean;
  error: boolean;
}

export abstract class Block<TConfig extends BlockConfigType = BlockConfigType> {

  abstract type: string;

  name: string;

  metadata: BlockMetadata;

  config: TConfig;

  @Output()
  context: BlockContext;

  @Output()
  state: BlockState;

  initBlock(name: string, metadata: BlockMetadata, config: TConfig, context: BlockContext) {
    this.name = name;
    this.metadata = metadata;
    this.config = config;
    this.context = context;

    this.state = {
      stop: false,
      error: false,
    }
  }

  toOutputObject() {
    return this.metadata.outputProperties.reduce<Record<string, any>>((acc, key) => {
      acc[key] = this[key];
      return acc;
    }, {});
  }

  isInputProperty(name: string) {
    return this.metadata.inputProperties.includes(name);
  }
}