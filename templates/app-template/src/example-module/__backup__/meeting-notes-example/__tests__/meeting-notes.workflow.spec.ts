import {
  WorkflowTestBuilder,
  getToolResult,
  CreateDocument,
  createDocumentResultMock,
} from '@loopstack/core';
import { AiGenerateDocument } from '@loopstack/llm';
import { MeetingNotesWorkflow } from '../meeting-notes.workflow';
import { createTestingModule } from '../../../../../test/create-testing-module';
import { MeetingNotesDocument } from '../documents/meeting-notes-document';
import { OptimizedNotesDocument } from '../documents/optimized-notes-document';
import { DocumentEntity, generateObjectFingerprint } from '@loopstack/common';

describe('MeetingNotesWorkflow', () => {
  it('should execute initial step and stop at waiting_for_response', async () => {
    const mockInitialNotes = {
      text: `
- meeting 1.1.2025
- budget: need 2 cut costs sarah said
- hire new person?? --> marketing
- vendor pricing - follow up needed by anna`,
    };

    const builder = new WorkflowTestBuilder(createTestingModule, MeetingNotesWorkflow)
      .withToolMock(CreateDocument, [
        createDocumentResultMock(MeetingNotesDocument, mockInitialNotes),
      ]);

    await builder.runWorkflow((workflow, test) => {
      // Should execute without errors and stop at waiting_for_response
      expect(workflow).toBeDefined();
      expect(workflow.state.place).toBe('waiting_for_response');
      expect(workflow.state.stop).toBe(true);
      expect(workflow.state.error).toBe(false);

      // Should call CreateDocument once for the initial form
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledTimes(1);
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'input',
          document: 'MeetingNotesDocument',
          update: {
            content: {
              text: expect.stringContaining('1.1.2025')
            }
          }
        }),
        expect.anything(),
        expect.anything()
      );

      // Verify the result was stored correctly
      expect(getToolResult(workflow, 'create_form', 'form')).toMatchObject({
        data: expect.objectContaining({
          content: mockInitialNotes,
        }),
      });

      // Check the history
      expect(workflow.state.history).toStrictEqual([
        { transition: 'invalidation', from: 'start', to: 'start' },
        { transition: 'create_form', from: 'start', to: 'waiting_for_response' },
      ]);
    });

    await builder.teardown();
  });

  it('should process user response and generate optimized notes', async () => {
    const mockInitialNotes = {
      text: `
- meeting 1.1.2025
- budget: need 2 cut costs sarah said
- hire new person?? --> marketing
- vendor pricing - follow up needed by anna`,
    };

    const mockUserEditedNotes = {
      text: `Meeting Notes - January 1, 2025
- Budget discussion: need to cut costs (Sarah's input)
- Hiring: new person needed for marketing
- Vendor pricing: follow up needed by Anna`,
    };

    const mockOptimizedNotes = {
      date: '2025-01-01',
      attendees: ['Sarah', 'Anna'],
      topics: [
        { title: 'Budget', notes: 'Need to cut costs', assignee: 'Sarah' },
        { title: 'Hiring', notes: 'New person needed for marketing', assignee: null },
        { title: 'Vendor Pricing', notes: 'Follow up needed', assignee: 'Anna' },
      ],
    };

    const builder = new WorkflowTestBuilder(createTestingModule, MeetingNotesWorkflow)
      .withToolMock(CreateDocument, [
        createDocumentResultMock(MeetingNotesDocument, mockUserEditedNotes),
      ])
      .withToolMock(AiGenerateDocument, [
        createDocumentResultMock(OptimizedNotesDocument, mockOptimizedNotes),
      ])
      .withArgs({ inputText: mockInitialNotes.text })
      // Simulate state after first manual step (place = waiting_for_response)
      .withWorkflowData({
        place: 'waiting_for_response',
        history: [
          { transition: 'invalidation', from: 'start', to: 'start' },
          { transition: 'create_form', from: 'start', to: 'waiting_for_response' },
        ],
        documents: [
          {
            blockName: MeetingNotesDocument.name,
            content: mockInitialNotes,
          } as DocumentEntity,
        ],
      })

      .withWorkflowId('123')
      .withContext({
        payload: {
          transition: {
            id: 'user_response',
            workflowId: '123',
            payload: mockUserEditedNotes,
          }
        }
      });

    await builder.runWorkflow((workflow, test) => {
      // Should execute and stop at notes_optimized (next manual step)
      expect(workflow).toBeDefined();
      expect(workflow.state.place).toBe('notes_optimized');
      expect(workflow.state.stop).toBe(true);
      expect(workflow.state.error).toBe(false);

      // Should call CreateDocument once for user response
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledTimes(1);
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'input',
          document: 'MeetingNotesDocument',
        }),
        expect.anything(),
        expect.anything()
      );

      // Should call AiGenerateDocument once
      expect(test.getToolSpy(AiGenerateDocument)).toHaveBeenCalledTimes(1);
      expect(test.getToolSpy(AiGenerateDocument)).toHaveBeenCalledWith(
        expect.objectContaining({
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
          },
          responseDocument: 'OptimizedNotesDocument',
        }),
        expect.anything(),
        expect.anything()
      );

      // Should have correct values from class properties
      expect(workflow.meetingNotes).toEqual(mockUserEditedNotes);
      expect(workflow.optimizedNotes).toEqual(mockOptimizedNotes);

      // Verify the AI result was stored correctly
      expect(getToolResult(workflow, 'optimize_notes', 'prompt')).toMatchObject({
        data: expect.objectContaining({
          content: mockOptimizedNotes,
        }),
      });

      // Check the history
      expect(workflow.state.history).toStrictEqual([
        { transition: 'invalidation', from: 'start', to: 'start' },
        { transition: 'create_form', from: 'start', to: 'waiting_for_response' },
        { transition: 'user_response', from: 'waiting_for_response', to: 'response_received' },
        { transition: 'optimize_notes', from: 'response_received', to: 'notes_optimized' },
      ]);
    });

    await builder.teardown();
  });

  it('should complete workflow when user confirms optimized notes', async () => {
    const mockMeetingNotes = {
      text: 'User edited meeting notes',
    };

    const mockOptimizedNotes = {
      date: '2025-01-01',
      attendees: ['Sarah', 'Anna'],
      topics: [
        { title: 'Budget', notes: 'Need to cut costs', assignee: 'Sarah' },
      ],
    };

    const mockFinalNotes = {
      date: '2025-01-01',
      attendees: ['Sarah', 'Anna', 'Bob'],
      topics: [
        { title: 'Budget', notes: 'Need to cut costs by 15%', assignee: 'Sarah' },
      ],
    };

    const builder = new WorkflowTestBuilder(createTestingModule, MeetingNotesWorkflow)
      .withToolMock(CreateDocument, [
        createDocumentResultMock(OptimizedNotesDocument, mockFinalNotes),
      ])
      .withArgs({ inputText: 'any text' })
      // Simulate state after AI optimization (place = notes_optimized)
      .withWorkflowData({
        place: 'notes_optimized',
        history: [
          { transition: 'invalidation', from: 'start', to: 'start' },
          { transition: 'create_form', from: 'start', to: 'waiting_for_response' },
          { transition: 'user_response', from: 'waiting_for_response', to: 'response_received' },
          { transition: 'optimize_notes', from: 'response_received', to: 'notes_optimized' },
        ],
        documents: [
          {
            blockName: MeetingNotesDocument.name,
            content: mockMeetingNotes,
          } as DocumentEntity,
          {
            blockName: OptimizedNotesDocument.name,
            content: mockOptimizedNotes,
          } as DocumentEntity,
        ],
      })
      // Mock user confirmation via context
      .withWorkflowId('123')
      .withContext({
        payload: {
          transition: {
            id: 'confirm',
            workflowId: '123',
            payload: mockFinalNotes,
          },
        },
      });

    await builder.runWorkflow((workflow, test) => {
      // Should complete and reach end state
      expect(workflow).toBeDefined();
      expect(workflow.state.place).toBe('end');
      expect(workflow.state.stop).toBe(false);
      expect(workflow.state.error).toBe(false);

      // Should call CreateDocument once for final confirmation
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledTimes(1);
      expect(test.getToolSpy(CreateDocument)).toHaveBeenCalledWith(
        expect.objectContaining({
          document: 'OptimizedNotesDocument',
        }),
        expect.anything(),
        expect.anything()
      );

      // Should have final optimized notes
      expect(workflow.optimizedNotes).toEqual(mockFinalNotes);

      // Check the complete history
      expect(workflow.state.history).toStrictEqual([
        { transition: 'invalidation', from: 'start', to: 'start' },
        { transition: 'create_form', from: 'start', to: 'waiting_for_response' },
        { transition: 'user_response', from: 'waiting_for_response', to: 'response_received' },
        { transition: 'optimize_notes', from: 'response_received', to: 'notes_optimized' },
        { transition: 'confirm', from: 'notes_optimized', to: 'end' },
      ]);
    });

    await builder.teardown();
  });
});