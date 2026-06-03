# @loopstack/module-config-example

Demonstrates configurable module patterns (`forRoot` + `forFeature`) and per-module configuration isolation using a shared `GreeterTool`.

## By using this example you'll get...

- A reusable `GreeterModule` with global defaults via `forRoot`
- Multiple consumer modules overriding config independently via `forFeature`
- A nested passthrough module (`GreeterAgentModule`) that forwards feature config

## Installation

```sh
npm install @loopstack/module-config-example
```

## How It Works

The exported `ModuleConfigExampleModule` wires four scenarios:

1. `DefaultGreetingModule` uses global defaults from `GreeterModule.forRoot(...)`.
2. `GermanGreetingModule` overrides to German with `forFeature(...)`.
3. `FrenchGreetingModule` overrides to French and runs alongside German to prove isolation.
4. `NestedGreetingModule` receives config through a wrapper module to demonstrate nested pass-through.

Each workflow calls the same `greeter` tool and writes the resulting greeting to a `MessageDocument`.

## Public API

- `ModuleConfigExampleModule`
- `GreeterModule`
- `GreeterAgentModule`
- `DefaultGreetingModule`, `DefaultGreetingWorkflow`
- `GermanGreetingModule`, `GermanGreetingWorkflow`
- `FrenchGreetingModule`, `FrenchGreetingWorkflow`
- `NestedGreetingModule`, `NestedGreetingWorkflow`
- `GreeterTool`

## Dependencies

- `@loopstack/common`
