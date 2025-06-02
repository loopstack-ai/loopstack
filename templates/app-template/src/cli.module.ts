import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoopCoreModule } from '@loopstack/core';
import { LlmModule } from '@loopstack/llm';
import { FindDormantConversationTool } from './tools/find-dormant-conversation.tool';
import { ConversationEvaluationService } from './services/conversation-evaluation.service';
import { EmailHistoryService } from './services/email-history.service';
import { EmailEntity } from './entities/email.entity';
import { ConversationEvaluationEntity } from './entities/conversation-evaluation.entity';
import { UpdateConversationEvaluationTool } from './tools/update-conversation-evaluation.tool';
import { SendEmailTool } from './tools/send-email.tool';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      database: 'postgres',
      password: 'admin',
      autoLoadEntities: true,
      synchronize: true,
    }),
    LoopCoreModule.forRoot({
      installTemplates: true,
    }),
    LlmModule,
    TypeOrmModule.forFeature([EmailEntity, ConversationEvaluationEntity]),
  ],
  providers: [
    ConversationEvaluationService,
    EmailHistoryService,
    FindDormantConversationTool,
    UpdateConversationEvaluationTool,
    SendEmailTool,
  ],
})
export class CliModule {}
