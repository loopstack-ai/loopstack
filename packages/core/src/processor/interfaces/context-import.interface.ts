import { LoadDocumentToolOptions } from '../tools/load-document.tool';

export class ContextImportInterface {
  name: string;
  prev: any;
  curr: any;
  isNew: boolean;
  isChanged: boolean;
  options: LoadDocumentToolOptions;
}
