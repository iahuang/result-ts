# `result-ts`

A TypeScript implementation of Rust's [`std::result::Result`](https://doc.rust-lang.org/std/result/enum.Result.html) enum type for type-safe error handling. Make errors in fallible functions predictable and impossible to ignore.

This library provides a lightweight, type-safe way to handle errors without exceptions. It aims to:
- Stay close to Rust's original API design
- Provide strict type safety with full TypeScript inference
- Use plain objects (not classes) for easy serialization
- Support both synchronous and asynchronous operations

## Installation

```bash
npm install @iahuang/result-ts
```

## Quick Start

```ts
type ParseErrors = {
    invalid_number: string; // the string that failed to parse as a number
    negative: number; // the number that was negative
};

const parseResult = resultType<number, ParseErrors>();

type ParseError = Err<ParseErrors>; // { ok: false, error: "invalid_number", detail: string } | { ok: false, error: "negative", detail: number }
type ParseOk = Ok<number>; // { ok: true, value: number }

type ParseResult = ResultType<typeof parseResult>; // ParseError | ParseOk

function parseIntStrict(s: string): ParseResult {
    const n = Number.parseInt(s, 10);
    if (Number.isNaN(n)) return parseResult.err("invalid_number", s);
    if (n < 0) return parseResult.err("negative", n);
    return parseResult.ok(n);
}

const timesTwo = resultMap(parseIntStrict("123"), (n) => n * 2);

// construct plain results manually
const okResult = parseResult.ok(123); // { ok: true, value: 123 }
const errResult = parseResult.err("invalid_number", "123"); // { ok: false, error: "invalid_number", detail: "123" }
```

The equivalent Rust code is:

```rust
enum ParseError {
    InvalidNumber(String),
    Negative(i32),
}

fn parse_int_strict(s: &str) -> Result<i32, ParseError> {
    match s.parse::<i32>() {
        Ok(n) => {
            if n < 0 {
                Err(ParseError::Negative(n))
            } else {
                Ok(n)
            }
        },
        Err(_) => Err(ParseError::InvalidNumber(s.to_string())),
    }
}

let times_two = parse_int_strict("123").map(|n| n * 2);

let ok_result = Ok(123);
let err_result = Err(ParseError::InvalidNumber("123".to_string()));
```

## Core Concepts

### Result Types

A `Result<T, E>` is either:
- `Ok<T>`: Success, containing a value of type `T`
  ```ts
  { ok: true, value: T }
  ```
- `Err<E>`: Failure, containing an error variant and detail
  ```ts
  { ok: false, error: keyof E, detail: E[keyof E] }
  ```

### Creating Results

You can create results in two ways:

#### 1. Using `resultType()` (Recommended)

This provides full type safety and inference:

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
    err: (e) => `Error: ${e.error} - ${e.detail}`
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
import { asyncResultMap, asyncResultAndThen, tryCatchResultAsync } from '@iahuang/result-ts';

async function fetchUser(id: string): Promise<Result<User, FetchErrors>> {
    return tryCatchResultAsync(
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
import { tryCatchResult } from '@iahuang/result-ts';

type JsonErrors = {
    parse_error: string;
};

const jsonResult = resultType<any, JsonErrors>();

function parseJSON(jsonString: string): ResultType<typeof jsonResult> {
    return tryCatchResult(
        () => JSON.parse(jsonString),
        (e) => jsonResult.err("parse_error", String(e))
    );
}

const data = parseJSON('{"valid": "json"}');
// Ok({ valid: "json" })

const invalid = parseJSON('invalid json');
// Err({ ok: false, error: "parse_error", detail: "SyntaxError: ..." })
```

## Complete Example: File Processing

Here's a comprehensive example showing real-world usage:

```ts
import { resultType, ResultType, chain, match } from '@iahuang/result-ts';
import * as fs from 'fs';

type FileErrors = {
    not_found: string;
    permission_denied: string;
    invalid_json: string;
};

const fileResult = resultType<any, FileErrors>();
type FileResult = ResultType<typeof fileResult>;

function readFile(path: string): FileResult {
    try {
        const content = fs.readFileSync(path, 'utf-8');
        return fileResult.ok(content);
    } catch (e: any) {
        if (e.code === 'ENOENT') {
            return fileResult.err("not_found", path);
        }
        if (e.code === 'EACCES') {
            return fileResult.err("permission_denied", path);
        }
        throw e;
    }
}

function parseJSON(content: string): FileResult {
    try {
        return fileResult.ok(JSON.parse(content));
    } catch (e) {
        return fileResult.err("invalid_json", String(e));
    }
}

// Process the file with chaining
const result = chain(readFile("config.json"))
    .andThen(parseJSON)
    .map((config) => config.database)
    .result;

// Handle the result
const config = match(result, {
    ok: (db) => db,
    err: (e) => {
        switch (e.error) {
            case "not_found":
                console.error(`File not found: ${e.detail}`);
                break;
            case "permission_denied":
                console.error(`Permission denied: ${e.detail}`);
                break;
            case "invalid_json":
                console.error(`Invalid JSON: ${e.detail}`);
                break;
        }
        return null;
    }
});
```

## API Reference

### Core Types

- `Result<T, E>` - The main Result type
- `Ok<T>` - Success type
- `Err<E>` - Error type
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

- `match(result, handlers)` - Pattern matching
- `chain(result)` - Method chaining API
- `tryCatchResult(fn, errFn)` - Convert exceptions to Results
- `tryCatchResultAsync(fn, errFn)` - Async exception handling
- `tryCatchResultPromise(promise, errFn)` - Promise rejection handling

All sync functions have async equivalents prefixed with `async`:
- `asyncResultMap`, `asyncResultAndThen`, `asyncChain`, etc.

## Comparison with Other Libraries

### vs. `neverthrow`

Unlike `neverthrow`, this library uses plain objects instead of class instances:
- Results can be safely serialized/deserialized (e.g., JSON.stringify)
- No runtime overhead from class instantiation
- More memory efficient for large datasets
- Closer to functional programming principles

