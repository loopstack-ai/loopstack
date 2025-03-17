import { Injectable } from '@nestjs/common';
import { AdapterRegistry } from '../../configuration';
import { AdapterCollectionService } from '../../configuration';

@Injectable()
export class AdapterService {
  constructor(
    private readonly adapterRegistry: AdapterRegistry,
    private readonly adapterCollectionService: AdapterCollectionService,
  ) {}

  getAdapterConfig(adapterName: string) {
    const adapterConfig = this.adapterCollectionService.getByName(adapterName);
    if (!adapterConfig) {
      throw new Error(`Adapter config with name ${adapterName} not found.`);
    }

    return adapterConfig;
  }

  async executeAdapter(
    adapterServiceName: string,
    props: any,
    context?: any,
  ): Promise<any> {
    const adapterInstance = this.adapterRegistry.getAdapterByName(
      adapterServiceName,
    );
    if (!adapterInstance) {
      throw new Error(`Adapter ${adapterServiceName} not found.`);
    }

    console.log(`Executing adapter ${adapterServiceName}`);
    return adapterInstance.execute(props, context);
  }
}
