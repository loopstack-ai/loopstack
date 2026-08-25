import type { Type } from '@nestjs/common';
import { type Mock, vi } from 'vitest';
import { ToolEnvelope, ToolResult, getBlockName, parseToolResult } from '@loopstack/common';

/**
 * A DI-level tool replacement whose scripted responses are validated against the tool's
 * declared `resultSchema` — the contract-honest successor to a free-form mock.
 *
 * @public
 */
export interface ContractFake {
  /** The mock the workflow calls — use it for interaction assertions (`toHaveBeenCalledWith`). */
  call: Mock;
  /** Script the response for every subsequent call. Validates against the tool's resultSchema. */
  returns(envelope: ToolEnvelope): ContractFake;
  /** Script the response for exactly one call. Validates against the tool's resultSchema. */
  returnsOnce(envelope: ToolEnvelope): ContractFake;
}

/**
 * Creates a contract-validated fake for a tool. DI-level mocks bypass the tool pipeline, so a
 * plain mock's responses are the one scripted world `resultSchema` never checks — this fake
 * closes that: every scripted envelope is parsed against the tool's declared contract at
 * scripting time, so a fixture that drifts from what the tool really returns fails the test
 * instead of silently passing. Unscripted calls reject loudly.
 *
 * ```ts
 * const llm = createContractFake(LlmGenerateTextTool);
 * llm.returns({ data: { message: { role: 'assistant', text: 'Hi', blocks: [] }, response: {} } });
 * const run = await runWorkflow(ChatWorkflow, {}, { overrides: [[LlmGenerateTextTool, llm]] });
 * expect(llm.call).toHaveBeenCalledTimes(1);
 * ```
 *
 * @public
 */
export function createContractFake(toolClass: Type): ContractFake {
  const name = getBlockName(toolClass);

  const validate = (envelope: ToolEnvelope): ToolResult => {
    const parsed = parseToolResult(toolClass, envelope);
    if (parsed.error) {
      throw new Error(
        `createContractFake('${name}'): scripted envelope carries an error — script success envelopes; ` +
          `error behavior belongs in the tool's own tests.`,
      );
    }
    // The workflow receives what BaseTool.call() would deliver: the narrowed ToolResult.
    return { data: parsed.data, metadata: parsed.metadata ?? {}, ...(parsed.type ? { type: parsed.type } : {}) };
  };

  const call = vi
    .fn()
    .mockRejectedValue(
      new Error(`Unscripted contract fake call on '${name}' — script the response with returns(...) first.`),
    );

  const fake: ContractFake = {
    call,
    returns(envelope: ToolEnvelope): ContractFake {
      call.mockResolvedValue(validate(envelope));
      return fake;
    },
    returnsOnce(envelope: ToolEnvelope): ContractFake {
      call.mockResolvedValueOnce(validate(envelope));
      return fake;
    },
  };
  return fake;
}
