# `result-ts`

A Typescript implementation of Rust's [`std::result::Result`](https://doc.rust-lang.org/std/result/enum.Result.html) enum type. Make errors in fallible subroutines predictable and impossible to ignore.

This library, compared to others, aims to be more thinly abstracted, stricter with regards to type safety, and more closely resemble the original Rust API.

```
npm install @iahuang/result-ts
```

## Example Usage

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

### Chain API

For readability, this library also provides a method chaining API.

```ts
const timesTwo = chain(parseIntStrict("123"))
    .map((n) => n * 2)
    .unwrapOr(0)
    .result; // extract the plain Result type
```

This more closely resembles the equivalent Rust code:

```rust
let times_two = parse_int_strict("123")
    .map(|n| n * 2)
    .unwrap_or(0);
```

## Comparison with Other Libraries

### `neverthrow`

Unlike `neverthrow`, the canonical representation of a result is a plain object with type information
rather than a class instance. This allows for result types to be safely serialized and deserialized,
as `Result` types contain neither methods nor class information!

`neverthrow` provides a perfectly valid solution to this problem statement; this library aims to
act more as lighter, type-safe wrapper around plain Javascript constructs rather than creating new types
entirely.
