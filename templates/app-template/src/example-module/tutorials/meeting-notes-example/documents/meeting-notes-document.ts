import { BlockConfig } from '@loopstack/common';
import { z } from 'zod';
import { Document } from '@loopstack/core';
import { Expose } from 'class-transformer';

@BlockConfig({
  properties: z.object({
    text: z.string(),
  }),
  configFile: __dirname + '/meeting-notes-document.yaml',
})
export class MeetingNotesDocument extends Document {
  @Expose()
  text: string;
}
