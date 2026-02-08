# `result-ts`

A TypeScript implementation of Rust's [`std::result::Result`](https://doc.rust-lang.org/std/result/enum.Result.html) enum type for type-safe error handling. Make errors in fallible functions predictable and impossible to ignore.

This library provides a lightweight, type-safe way to handle errors without exceptions. It aims to:
- Stay close to Rust's original API design
- Provide strict type safety with full TypeScript inference
- Use plain objects as opposed to classes to allow for JSON serialization
- Support both synchronous and asynchronous operations

## Installation

```bash
npm install @iahuang/result-ts
```

## Quick Start

Define your error types, then use `resultType()` to create a type-safe result builder:

```ts
import { resultType, chain, match } from '@iahuang/result-ts';

type ParseErrors = {
    invalid_number: string;
    negative: number;
};

const parseResult = resultType<number, ParseErrors>();

function parsePositiveInt(s: string): Result<number, ParseErrors> {
    const n = Number.parseInt(s, 10);
    if (Number.isNaN(n)) return parseResult.err("invalid_number", s);
    if (n < 0) return parseResult.err("negative", n);
    return parseResult.ok(n);
}
```

Chain operations and handle results:

```ts
const value = chain(parsePositiveInt("42"))
    .map((n) => n * 2)
    .unwrapOr(0);

// Or use pattern matching for full control
match(parsePositiveInt("-5"), {
    ok: (n) => console.log(`Got ${n}`),
    err: (e) => console.log(`Error: ${e.type}`)
});
```

## Core Concepts

### Result Types

A `Result<T, E>` is either:
- Success, containing a value of type `T`
  ```ts
  { ok: true, value: T }
  ```
- Failure, containing an `Err<E>` under the `error` field
  ```ts
  { ok: false, error: Err<E> }
  ```

Where `Err<E>` is a discriminated union of `{ type: K, detail: E[K] }` for each key `K` in `E`.

This is analogous to creating a `Result<T, E>` type in Rust, with `E` being an enum type with variants for different error types. The constraint that `E` be an enum-like type is baked into this library's type system to encourage the implementation of fixed, statically-known sets of error types which can each be handled appropriately.

### Creating Results

You can create results in two ways:

#### 1. **Recommended:** Using `resultType()`

This method provides the strongest type safety and inference.

```ts
type MyErrors = {
    not_found: string;      // error detail is a string (e.g., file path)
    invalid_input: number;  // error detail is a number (e.g., line number)
    timeout: undefined;     // error with no detail
};

const myResult = resultType<string, MyErrors>();

const success = myResult.ok("data");
const error1 = myResult.err("not_found", "/path/to/file");
const error2 = myResult.err("invalid_input", 42);
const error3 = myResult.err("timeout"); // no detail needed for undefined
```

#### 2. Using `ok()` and `err()` directly

For simple cases:

```ts
import { ok, err } from '@iahuang/result-ts';

const success = ok(42);
const failure = err("error_code", "error detail");
```

## Working with Results

### Pattern Matching

Use the `match` function for clean error handling:

```ts
import { match } from '@iahuang/result-ts';

const message = match(parsePositiveInt("123"), {
    ok: (value) => `Success: ${value}`,
    err: (e) => `Error: ${e.type} - ${e.detail}`
});
```

For exhaustive matching on individual error variants, use `matchNested`:

```ts
import { matchNested } from '@iahuang/result-ts';

const message = matchNested(parsePositiveInt("123"), {
    ok: (value) => `Success: ${value}`,
    err: {
        invalid_number: (s) => `Invalid number: ${s}`,
        negative: (n) => `Negative number: ${n}`,
    }
});
```

### Method Chaining API

For readability, use the `chain()` function for a fluent API:

```ts
import { chain } from '@iahuang/result-ts';

const value = chain(parsePositiveInt("123"))
    .map((n) => n * 2)
    .map((n) => `Result: ${n}`)
    .unwrapOr("Failed");

console.log(value); // "Result: 246"
```

This closely resembles Rust's method chaining:

```rust
let value = parse_positive_int("123")
    .map(|n| n * 2)
    .map(|n| format!("Result: {}", n))
    .unwrap_or("Failed".to_string());
```

### Common Operations

#### Transforming values with `map`

```ts
import { resultMap } from '@iahuang/result-ts';

const result = parsePositiveInt("42");
const doubled = resultMap(result, (n) => n * 2);
// Ok(84)
```

#### Providing defaults with `unwrapOr`

```ts
import { resultUnwrapOr } from '@iahuang/result-ts';

const value = resultUnwrapOr(parsePositiveInt("invalid"), 0);
// Returns 0 since parsing failed
```

#### Chaining operations with `andThen`

```ts
import { resultAndThen } from '@iahuang/result-ts';

function divide(a: number, b: number): Result<number, { divide_by_zero: undefined }> {
    if (b === 0) return divResult.err("divide_by_zero");
    return divResult.ok(a / b);
}

const result = resultAndThen(
    parsePositiveInt("10"),
    (n) => divide(n, 2)
);
// Ok(5)
```

#### Error handling with `inspect`

```ts
import { resultInspect, resultInspectErr } from '@iahuang/result-ts';

const result = parsePositiveInt("123");

// Inspect success values (for logging, debugging, etc.)
resultInspect(result, (value) => {
    console.log("Parsed value:", value);
});

// Inspect errors
resultInspectErr(result, (err) => {
    console.error("Parse error:", err);
});
```

## Async Support

All Result functions have async versions for working with Promises:

```ts
import { asyncResultMap, asyncResultAndThen, resultFromThrowingAsyncFunction } from '@iahuang/result-ts';

async function fetchUser(id: string): Promise<Result<User, FetchErrors>> {
    return resultFromThrowingAsyncFunction(
        async () => {
            const response = await fetch(`/api/users/${id}`);
            return await response.json();
        },
        (e) => fetchResult.err("network_error", String(e))
    );
}

// Chain async operations
const userEmail = await asyncResultMap(
    fetchUser("123"),
    (user) => user.email
);

// Or use asyncChain for a fluent API
import { asyncChain } from '@iahuang/result-ts';

const email = await asyncChain(fetchUser("123"))
    .map((user) => user.email)
    .unwrapOr("unknown@example.com");
```

## Exception Handling

Convert throwing code to Results:

```ts
import { resultFromThrowingFunction, resultType, Result } from '@iahuang/result-ts';

type JsonErrors = {
    parse_error: string;
};

const jsonResult = resultType<any, JsonErrors>();

function parseJSON(jsonString: string): Result<any, JsonErrors> {
    return resultFromThrowingFunction(
        () => JSON.parse(jsonString),
        (e) => jsonResult.err("parse_error", String(e))
    );
}

const data = parseJSON('{"valid": "json"}');
// Ok({ valid: "json" })

const invalid = parseJSON('invalid json');
// Err({ ok: false, error: { type: "parse_error", detail: "SyntaxError: ..." } })
```

## Complete Example: Config Loader

A realistic example showing how to chain fallible operations:

```ts
import { resultType, chain, match } from '@iahuang/result-ts';
import * as fs from 'fs';

type ConfigErrors = { not_found: string; invalid_json: string };
const configResult = resultType<any, ConfigErrors>();

function loadConfig(path: string) {
    // Read file
    let content: string;
    try {
        content = fs.readFileSync(path, 'utf-8');
    } catch {
        return configResult.err("not_found", path);
    }

    // Parse JSON
    try {
        return configResult.ok(JSON.parse(content));
    } catch (e) {
        return configResult.err("invalid_json", String(e));
    }
}

// Usage
const dbHost = chain(loadConfig("config.json"))
    .map((config) => config.database.host)
    .unwrapOr("localhost");
```

## API Reference

### Core Types

- `Result<T, E>` - The main Result type
- `Err<E>` - Error type (discriminated union of `{ type, detail }`)
- `resultType<T, E>()` - Creates type-safe Result constructors

### Query Methods

- `resultIsOk(result)` - Returns true if Ok
- `resultIsErr(result)` - Returns true if Err
- `resultIsOkAnd(result, fn)` - Returns true if Ok and predicate matches
- `resultIsErrAnd(result, fn)` - Returns true if Err and predicate matches

### Transformation Methods

- `resultMap(result, fn)` - Transform the Ok value
- `resultMapErr(result, fn)` - Transform the Err value
- `resultMapOr(result, default, fn)` - Transform or return default
- `resultMapOrElse(result, defaultFn, fn)` - Transform or compute default

### Extraction Methods

- `resultUnwrap(result)` - Extract Ok value or throw
- `resultExpect(result, msg)` - Extract Ok value or throw with message
- `resultUnwrapOr(result, default)` - Extract Ok value or return default
- `resultUnwrapOrElse(result, fn)` - Extract Ok value or compute default
- `resultOk(result)` - Convert to `T | null`
- `resultErr(result)` - Convert to `Err<E> | null`

### Combinators

- `resultAnd(result, other)` - Returns other if Ok
- `resultAndThen(result, fn)` - Chains Ok values
- `resultOr(result, other)` - Returns other if Err
- `resultOrElse(result, fn)` - Computes alternative if Err
- `resultFlatten(result)` - Flattens nested Results

### Utilities

These utility functions do not have any analogous functions in Rust, but are provided for convenience.

- `match(result, handlers)` - Pattern matching
- `matchNested(result, handlers)` - Pattern matching with per-variant error handlers
- `chain(result)` - Method chaining API
- `resultFromThrowingFunction(fn, errFn)` - Convert exceptions to Results
- `resultFromThrowingAsyncFunction(fn, errFn)` - Async exception handling
- `resultFromThrowingPromise(promise, errFn)` - Promise rejection handling
- `resultAll(results)` - Combine multiple Results into one

All sync functions have async equivalents prefixed with `async`:
- `asyncResultMap`, `asyncResultAndThen`, `asyncChain`, `asyncResultAll`, etc.

## Comparison with Other Libraries

### vs. [`neverthrow`](https://github.com/supermacro/neverthrow)

Unlike `neverthrow`, this library uses plain objects instead of class instances:
- Results can be safely serialized/deserialized (e.g., JSON.stringify)
- Closer to functional programming principles

### vs. [Effect](https://effect.website/)

Effect provides a much more comprehensive and opinionated ecosystem implementing functional programming principles in TypeScript. This library is focused on providing a lightweight, type-safe framework for error handling without any additional tooling, dependencies, or specific use cases in mind.

## Migrating from v1

### Breaking Changes

#### Result structure changed

Errors are now nested under an `error` field instead of being spread flat on the result object. The error object uses `type` instead of `error` for the variant key.

```ts
// v1
{ ok: false, error: "not_found", detail: "/path" }

// v2
{ ok: false, error: { type: "not_found", detail: "/path" } }
```

This means code that accessed `result.error` or `result.detail` directly on a failed result must now access `result.error.type` and `result.error.detail`.

#### `Ok<T>` and `Undetailed<E>` types removed

`Ok<T>` is no longer exported as a separate type. Use `Result<T, never>` if you need to represent a result that is always successful. `Undetailed<E>` has been removed entirely.

#### `ResultType<T>` helper type removed

The `ResultType<typeof myResult>` pattern for extracting a Result type from constructors is no longer supported. Use `Result<T, E>` directly instead.

```ts
// v1
const parseResult = resultType<number, ParseErrors>();
type ParseResult = ResultType<typeof parseResult>;

// v2
const parseResult = resultType<number, ParseErrors>();
type ParseResult = Result<number, ParseErrors>;
```

#### `resultType()` no longer returns chain constructors

The `okChain` and `errChain` constructors have been removed from the object returned by `resultType()`. Use `chain()` to wrap results instead.

```ts
// v1
const r = myResult.okChain(value);

// v2
const r = chain(myResult.ok(value));
```

#### `tryCatchResult` functions renamed

| v1 | v2 |
|----|-----|
| `tryCatchResult` | `resultFromThrowingFunction` |
| `tryCatchResultAsync` | `resultFromThrowingAsyncFunction` |
| `tryCatchResultPromise` | `resultFromThrowingPromise` |

#### `asyncMatch` replaced by `matchNested`

`asyncMatch` has been removed. The new `matchNested` function provides per-variant error handlers instead.

```ts
// v1
await asyncMatch(asyncResult, {
    ok: async (value) => ...,
    err: (e) => ...
});

// v2
matchNested(result, {
    ok: (value) => ...,
    err: {
        not_found: (detail) => ...,
        timeout: (detail) => ...,
    }
});
```

#### `match` error handler receives `Err<E>` instead of the full result

The `err` handler in `match` now receives the `Err<E>` value (i.e. `{ type, detail }`) rather than the entire result object.

```ts
// v1
match(result, {
    ok: (v) => ...,
    err: (e) => console.log(e.error, e.detail)
});

// v2
match(result, {
    ok: (v) => ...,
    err: (e) => console.log(e.type, e.detail)
});
```