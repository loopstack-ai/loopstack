import { LoadDocumentToolOptions } from '../../tools/functions/load-document.tool';

export class ContextImportInterface {
  name: string;
  prev: any;
  curr: any;
  isNew: boolean;
  isChanged: boolean;
  options: LoadDocumentToolOptions;
}
