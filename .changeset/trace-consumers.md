---
'@loopstack/testing': minor
---

Three trace consumers: `coverage(runs, WorkflowClass)` answers "did these runs exercise every declared transition and park?" as a query over run traces; `diffTraces(expected, actual)` compares two traces by behavioral identity (timings and generated keys ignored) and reports the first divergence with both events and the differing field; `createContractFake(ToolClass)` is the contract-honest DI mock — scripted envelopes are validated against the tool's `resultSchema` at scripting time, closing the one scripted world the pipeline never checks.
