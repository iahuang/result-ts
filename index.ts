/**
 * A TypeScript implementation of Rust's Result type for error handling.
 *
 * Result is a type that represents either success (`Ok`) or failure (`Err`).
 *
 * @example
 * ```ts
 * type ParseErrors = {
 *   invalid_number: string;
 *   negative: number;
 * };
 *
 * const parseResult = resultType<number, ParseErrors>();
 * type ParseResult = ResultType<typeof parseResult>;
 * type ParseError = Err<ParseErrors>;
 * type ParseOk = Ok<number>;
 *
 * function parseIntStrict(s: string): ParseResult {
 *   if (!/^-?\d+$/.test(s)) return parseResult.err("invalid_number", s);
 *   return parseResult.ok(Number.parseInt(s, 10));
 * }
 * ```
 */

/**
 * Type representing an error result with a specific error variant and detail.
 *
 * @typeParam E - An object type where each key represents an error variant and its value type represents the error detail
 */
export type Err<E> = {
    [K in keyof E]: {
        ok: false;
        error: K;
        detail: E[K];
    };
}[keyof E];

/**
 * Type representing a success result containing a value.
 *
 * @typeParam T - The type of the success value
 */
export type Ok<T> = {
    ok: true;
    error?: never;
    value: T;
};

/**
 * Result is a type that represents either success (`Ok<T>`) or failure (`Err<E>`).
 *
 * @typeParam T - The type of the success value
 * @typeParam E - An object type where each key represents an error variant
 */
export type Result<T, E> = Err<E> | Ok<T>;

/**
 * Helper type for creating error types without detail values.
 *
 * @typeParam E - A union of string literals representing error variants
 */
export type Undetailed<E extends string> = {
    [K in E]: undefined;
};

/**
 * Creates an `Ok` result containing a value.
 *
 * @param value - The success value to wrap
 * @returns An `Ok` result containing the value
 *
 * @example
 * ```ts
 * const result = ok(42);
 * // result is { ok: true, value: 42 }
 * ```
 */
export function ok<T>(value: T): Ok<T> {
    return { ok: true, value };
}

/**
 * Creates an `Err` result containing an error variant and detail.
 *
 * @param error - The error variant identifier
 * @param detail - The error detail value
 * @returns An `Err` result containing the error
 *
 * @example
 * ```ts
 * const result = err("not_found", "/path/to/file");
 * // result is { ok: false, error: "not_found", detail: "/path/to/file" }
 * ```
 */
export function err<E extends string, D>(error: E, detail: D): Err<{ [K in E]: D }> {
    return { ok: false, error, detail };
}

/**
 * Type for a function that constructs `Ok` results.
 *
 * @typeParam T - The type of the success value
 */
export type OkConstructor<T> = (value: T) => Ok<T>;

/**
 * Type for a function that constructs `Err` results with type-safe error variants.
 *
 * @typeParam E - An object type where each key represents an error variant
 */
export type ErrConstructor<E> = <K extends keyof E>(
    error: K,
    ...args: E[K] extends undefined ? [] : [detail: E[K]]
) => Err<E>;

/**
 * Type for a function that constructs `Ok` results wrapped in a chainable API.
 *
 * @typeParam T - The type of the success value
 * @typeParam E - An object type where each key represents an error variant
 */
export type OkChainConstructor<T, E> = (value: T) => Chain<T, E>;

/**
 * Type for a function that constructs `Err` results wrapped in a chainable API.
 *
 * @typeParam T - The type of the success value
 * @typeParam E - An object type where each key represents an error variant
 */
export type ErrChainConstructor<T, E> = <K extends keyof E>(
    error: K,
    ...args: E[K] extends undefined ? [] : [detail: E[K]]
) => Chain<T, E>;

/**
 * Creates a constructor function for `Ok` results.
 *
 * @returns A function that creates `Ok` results
 */
export function okConstructor<T>(): OkConstructor<T> {
    return ((value: T) => ({ ok: true, value })) as OkConstructor<T>;
}

/**
 * Creates a constructor function for `Err` results with type-safe error variants.
 *
 * @returns A function that creates `Err` results
 */
export function errConstructor<E>() {
    return <K extends keyof E>(
        error: K,
        ...args: E[K] extends undefined ? [] : [detail: E[K]]
    ): Err<E> => {
        return {
            ok: false,
            error,
            detail: args[0] as E[K],
        };
    };
}

/**
 * Creates a constructor function for `Ok` results wrapped in a chainable API.
 *
 * @returns A function that creates chainable `Ok` results
 */
export function okChainConstructor<T, E>(): OkChainConstructor<T, E> {
    const constructor = okConstructor<T>();
    return (value: T) => chain(constructor(value));
}

/**
 * Creates a constructor function for `Err` results wrapped in a chainable API.
 *
 * @returns A function that creates chainable `Err` results
 */
export function errChainConstructor<T, E>(): ErrChainConstructor<T, E> {
    const constructor = errConstructor<E>();
    return (
        error: keyof E,
        ...args: E[keyof E] extends undefined ? [] : [detail: E[keyof E]]
    ) => chain(constructor(error, ...args));
}

type ResultConstructors<T, E> = {
    ok: OkConstructor<T>;
    err: ErrConstructor<E>;
    okChain: OkChainConstructor<T, E>;
    errChain: ErrChainConstructor<T, E>;
    __result: Result<T, E>;
};

/**
 * Creates a set of type-safe constructor functions for a specific Result type.
 *
 * This is the recommended way to create results with custom error types,
 * as it provides full type safety and inference for error variants.
 *
 * @returns An object containing `ok`, `err`, `okChain`, and `errChain` constructors
 *
 * @example
 * ```ts
 * type MyErrors = {
 *   not_found: string;
 *   invalid: number;
 * };
 *
 * const myResult = resultType<string, MyErrors>();
 * const success = myResult.ok("hello");
 * const error = myResult.err("not_found", "/path");
 * ```
 */
export function resultType<T, E>(): ResultConstructors<T, E> {
    return {
        ok: okConstructor(),
        err: errConstructor(),
        okChain: okChainConstructor(),
        errChain: errChainConstructor(),
        __result: undefined as unknown as Result<T, E>,
    } as ResultConstructors<T, E>;
}

/**
 * Extracts the Result type from a ResultConstructors object.
 *
 * @typeParam T - A ResultConstructors type
 */
export type ResultType<T extends ResultConstructors<any, any>> = T["__result"];

/**
 * Returns `other` if the result is `Ok`, otherwise returns the `Err` value of `result`.
 *
 * Arguments passed to `and` are eagerly evaluated; if you are passing the result of a function call,
 * it is recommended to use `resultAndThen`, which is lazily evaluated.
 *
 * @param result - The result to check
 * @param other - The result to return if `result` is `Ok`
 * @returns `other` if `result` is `Ok`, otherwise the `Err` value of `result`
 */
export function resultAnd<T, E>(
    result: Result<T, E>,
    other: Result<T, E>
): Result<T, E> {
    return result.ok ? other : result;
}

/**
 * Calls `fn` if the result is `Ok`, otherwise returns the `Err` value of `result`.
 *
 * This function can be used for control flow based on `Result` values.
 *
 * @param result - The result to check
 * @param fn - The function to call with the `Ok` value
 * @returns The result of calling `fn` if `result` is `Ok`, otherwise the `Err` value of `result`
 */
export function resultAndThen<T, E, R>(
    result: Result<T, E>,
    fn: (value: T) => Result<R, E>
): Result<R, E> {
    return result.ok ? fn(result.value) : result;
}

/**
 * Converts from `Result<T, E>` to `Err<E> | null`, discarding the success value, if any.
 *
 * @param result - The result to convert
 * @returns The `Err` value if `result` is `Err`, otherwise `null`
 */
export function resultErr<T, E>(result: Result<T, E>): Err<E> | null {
    return !result.ok ? result : null;
}

/**
 * Returns the contained `Ok` value.
 *
 * @param result - The result to unwrap
 * @param msg - The error message to throw if `result` is `Err`
 * @returns The contained `Ok` value
 * @throws Error with the provided message if the value is an `Err`
 *
 * @remarks
 * Because this function may throw, its use is generally discouraged.
 * Instead, prefer to handle the `Err` case explicitly, or call `resultUnwrapOr`,
 * `resultUnwrapOrElse`, or use pattern matching.
 */
export function resultExpect<T, E>(result: Result<T, E>, msg: string): T {
    if (!result.ok) {
        throw new Error(msg);
    }
    return result.value;
}

/**
 * Returns the contained `Err` value.
 *
 * @param result - The result to unwrap
 * @param msg - The error message to throw if `result` is `Ok`
 * @returns The contained `Err` value
 * @throws Error with the provided message if the value is an `Ok`
 */
export function resultExpectErr<T, E>(
    result: Result<T, E>,
    msg: string
): Err<E> {
    if (result.ok) {
        throw new Error(msg);
    }
    return result;
}

/**
 * Converts from `Result<Result<T, E>, E>` to `Result<T, E>`.
 *
 * Flattening only removes one level of nesting at a time.
 *
 * @param result - The nested result to flatten
 * @returns The flattened result
 */
export function resultFlatten<T, E>(
    result: Result<Result<T, E>, E>
): Result<T, E> {
    return result.ok ? result.value : result;
}

/**
 * Calls a function with a reference to the contained value if `Ok`.
 *
 * Returns the original result.
 *
 * @param result - The result to inspect
 * @param fn - The function to call with the `Ok` value
 * @returns The original result
 */
export function resultInspect<T, E>(
    result: Result<T, E>,
    fn: (value: T) => void
): Result<T, E> {
    if (result.ok) {
        fn(result.value);
    }
    return result;
}

/**
 * Calls a function with a reference to the contained value if `Err`.
 *
 * Returns the original result.
 *
 * @param result - The result to inspect
 * @param fn - The function to call with the `Err` value
 * @returns The original result
 */
export function resultInspectErr<T, E>(
    result: Result<T, E>,
    fn: (err: Err<E>) => void
): Result<T, E> {
    if (!result.ok) {
        fn(result);
    }
    return result;
}

/**
 * Returns `true` if the result is `Err`.
 *
 * @param r - The result to check
 * @returns `true` if the result is `Err`, `false` otherwise
 */
export function resultIsErr<T, E>(r: Result<T, E>): r is Err<E> {
    return !r.ok;
}

/**
 * Returns `true` if the result is `Err` and the value inside of it matches a predicate.
 *
 * @param r - The result to check
 * @param fn - The predicate to check the `Err` value against
 * @returns `true` if the result is `Err` and the predicate returns `true`, `false` otherwise
 */
export function resultIsErrAnd<T, E>(
    r: Result<T, E>,
    fn: (err: Err<E>) => boolean
): boolean {
    return !r.ok && fn(r);
}

/**
 * Returns `true` if the result is `Ok`.
 *
 * @param r - The result to check
 * @returns `true` if the result is `Ok`, `false` otherwise
 */
export function resultIsOk<T, E>(r: Result<T, E>): r is Ok<T> {
    return r.ok;
}

/**
 * Returns `true` if the result is `Ok` and the value inside of it matches a predicate.
 *
 * @param r - The result to check
 * @param fn - The predicate to check the `Ok` value against
 * @returns `true` if the result is `Ok` and the predicate returns `true`, `false` otherwise
 */
export function resultIsOkAnd<T, E>(
    r: Result<T, E>,
    fn: (value: T) => boolean
): boolean {
    return r.ok && fn(r.value);
}

/**
 * Maps a `Result<T, E>` to `Result<R, E>` by applying a function to a contained `Ok` value,
 * leaving an `Err` value untouched.
 *
 * This function can be used to compose the results of two functions.
 *
 * @param result - The result to map
 * @param fn - The function to apply to the `Ok` value
 * @returns A new result with the function applied to the `Ok` value
 */
export function resultMap<T, E, R>(
    result: Result<T, E>,
    fn: (value: T) => R
): Result<R, E> {
    return result.ok ? ok(fn(result.value)) : result;
}

/**
 * Maps a `Result<T, E>` to `Result<T, F>` by applying a function to a contained `Err` value,
 * leaving an `Ok` value untouched.
 *
 * This function can be used to pass through a successful result while handling an error.
 *
 * @param result - The result to map
 * @param fn - The function to apply to the `Err` value
 * @returns A new result with the function applied to the `Err` value
 */
export function resultMapErr<T, E, F>(
    result: Result<T, E>,
    fn: (err: Err<E>) => Err<F>
): Result<T, F> {
    return result.ok ? (result as Ok<T>) : fn(result);
}

/**
 * Returns the provided default (if `Err`), or applies a function to the contained value (if `Ok`).
 *
 * Arguments passed to `mapOr` are eagerly evaluated; if you are passing the result of a function call,
 * it is recommended to use `resultMapOrElse`, which is lazily evaluated.
 *
 * @param result - The result to map
 * @param defaultValue - The default value to return if `result` is `Err`
 * @param fn - The function to apply to the `Ok` value
 * @returns The result of applying `fn` to the `Ok` value, or `defaultValue` if `result` is `Err`
 */
export function resultMapOr<T, E, R>(
    result: Result<T, E>,
    defaultValue: R,
    fn: (value: T) => R
): R {
    return result.ok ? fn(result.value) : defaultValue;
}

/**
 * Maps a `Result<T, E>` to `R` by applying fallback function `defaultValue` to a contained `Err` value,
 * or function `fn` to a contained `Ok` value.
 *
 * This function can be used to unpack a successful result while handling an error.
 *
 * @param result - The result to map
 * @param defaultValue - The function to call with the `Err` value
 * @param fn - The function to apply to the `Ok` value
 * @returns The result of applying `fn` to the `Ok` value, or calling `defaultValue` with the `Err` value
 */
export function resultMapOrElse<T, E, R>(
    result: Result<T, E>,
    defaultValue: (err: Err<E>) => R,
    fn: (value: T) => R
): R {
    return result.ok ? fn(result.value) : defaultValue(result);
}

/**
 * Converts from `Result<T, E>` to `T | null`, discarding the error, if any.
 *
 * @param result - The result to convert
 * @returns The `Ok` value if `result` is `Ok`, otherwise `null`
 */
export function resultOk<T, E>(result: Result<T, E>): T | null {
    return result.ok ? result.value : null;
}

/**
 * Returns `other` if the result is `Err`, otherwise returns the `Ok` value of `result`.
 *
 * Arguments passed to `or` are eagerly evaluated; if you are passing the result of a function call,
 * it is recommended to use `resultOrElse`, which is lazily evaluated.
 *
 * @param result - The result to check
 * @param other - The result to return if `result` is `Err`
 * @returns The `Ok` value of `result` if it is `Ok`, otherwise `other`
 */
export function resultOr<T, E>(
    result: Result<T, E>,
    other: Result<T, E>
): Result<T, E> {
    return result.ok ? result : other;
}

/**
 * Calls `fn` if the result is `Err`, otherwise returns the `Ok` value of `result`.
 *
 * This function can be used for control flow based on result values.
 *
 * @param result - The result to check
 * @param fn - The function to call with the `Err` value
 * @returns The `Ok` value of `result` if it is `Ok`, otherwise the result of calling `fn`
 */
export function resultOrElse<T, E>(
    result: Result<T, E>,
    fn: (err: Err<E>) => Result<T, E>
): Result<T, E> {
    return result.ok ? result : fn(result);
}

/**
 * Returns the contained `Ok` value.
 *
 * @param result - The result to unwrap
 * @returns The contained `Ok` value
 * @throws The `Err` value if the result is `Err`
 *
 * @remarks
 * Because this function may throw, its use is generally discouraged.
 * Instead, prefer to handle the `Err` case explicitly, or call `resultUnwrapOr`
 * or `resultUnwrapOrElse`.
 */
export function resultUnwrap<T, E>(result: Result<T, E>): T {
    if (!result.ok) {
        throw result;
    }
    return result.value;
}

/**
 * Returns the contained `Err` value.
 *
 * @param result - The result to unwrap
 * @returns The contained `Err` value
 * @throws Error if the value is an `Ok`
 */
export function resultUnwrapErr<T, E>(result: Result<T, E>): Err<E> {
    if (result.ok) {
        throw new Error("Result is ok; expected an error");
    }
    return result;
}

/**
 * Returns the contained `Ok` value or a provided default.
 *
 * Arguments passed to `unwrapOr` are eagerly evaluated; if you are passing the result of a function call,
 * it is recommended to use `resultUnwrapOrElse`, which is lazily evaluated.
 *
 * @param result - The result to unwrap
 * @param defaultValue - The default value to return if `result` is `Err`
 * @returns The contained `Ok` value, or `defaultValue` if `result` is `Err`
 */
export function resultUnwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.ok ? result.value : defaultValue;
}

/**
 * Returns the contained `Ok` value or computes it from a closure.
 *
 * @param result - The result to unwrap
 * @param fn - The function to call with the `Err` value to compute a default
 * @returns The contained `Ok` value, or the result of calling `fn` with the `Err` value
 */
export function resultUnwrapOrElse<T, E>(
    result: Result<T, E>,
    fn: (err: Err<E>) => T
): T {
    return result.ok ? result.value : fn(result);
}

/**
 * Executes a function and catches any thrown exceptions, converting them to a `Result`.
 *
 * @param fn - The function to execute
 * @param err - A function that converts a thrown exception to an `Err` value
 * @returns `Ok` containing the return value if `fn` succeeds, or `Err` if it throws
 *
 * @example
 * ```ts
 * const result = tryCatchResult(
 *   () => JSON.parse(jsonString),
 *   (e) => err("parse_error", String(e))
 * );
 * ```
 */
export function tryCatchResult<T, E>(
    fn: () => T,
    err: (e: unknown) => Err<E>
): Result<T, E> {
    try {
        return ok(fn());
    } catch (e) {
        return err(e);
    }
}

/**
 * Async version of `resultAnd`. Returns `other` if the result is `Ok`, otherwise returns the `Err` value of `result`.
 *
 * @param result - The promise of a result to check
 * @param other - The promise of a result to return if `result` is `Ok`
 * @returns A promise of `other` if `result` is `Ok`, otherwise the `Err` value of `result`
 * @see {@link resultAnd}
 */
export function asyncResultAnd<T, E>(
    result: Promise<Result<T, E>>,
    other: Promise<Result<T, E>>
): Promise<Result<T, E>> {
    return result.then((r) => (r.ok ? other : r));
}

/**
 * Async version of `resultAndThen`. Calls `fn` if the result is `Ok`, otherwise returns the `Err` value of `result`.
 *
 * @param result - The promise of a result to check
 * @param fn - The async function to call with the `Ok` value
 * @returns A promise of the result of calling `fn` if `result` is `Ok`, otherwise the `Err` value of `result`
 * @see {@link resultAndThen}
 */
export function asyncResultAndThen<T, E, R>(
    result: Promise<Result<T, E>>,
    fn: (value: T) => Promise<Result<R, E>>
): Promise<Result<R, E>> {
    return result.then((r) => (r.ok ? fn(r.value) : r));
}

export async function asyncResultErr<T, E>(
    result: Promise<Result<T, E>>
): Promise<Err<E> | null> {
    const r = await result;
    return !r.ok ? r : null;
}

export async function asyncResultExpect<T, E>(
    result: Promise<Result<T, E>>,
    msg: string
): Promise<T> {
    const r = await result;
    if (!r.ok) {
        throw new Error(msg);
    }
    return r.value;
}

export async function asyncResultExpectErr<T, E>(
    result: Promise<Result<T, E>>,
    msg: string
): Promise<Err<E>> {
    const r = await result;
    if (r.ok) {
        throw new Error(msg);
    }
    return r;
}

export function asyncResultFlatten<T, E>(
    result: Promise<Result<Result<T, E>, E>>
): Promise<Result<T, E>> {
    return result.then((r) => (r.ok ? r.value : r));
}

export function asyncResultInspect<T, E>(
    result: Promise<Result<T, E>>,
    fn: (value: T) => void | Promise<void>
): Promise<Result<T, E>> {
    return result.then(async (r) => {
        if (r.ok) {
            await fn(r.value);
        }
        return r;
    });
}

export function asyncResultInspectErr<T, E>(
    result: Promise<Result<T, E>>,
    fn: (err: Err<E>) => void | Promise<void>
): Promise<Result<T, E>> {
    return result.then(async (r) => {
        if (!r.ok) {
            await fn(r);
        }
        return r;
    });
}

export async function asyncResultIsErr<T, E>(
    result: Promise<Result<T, E>>
): Promise<boolean> {
    const r = await result;
    return !r.ok;
}

export async function asyncResultIsErrAnd<T, E>(
    result: Promise<Result<T, E>>,
    fn: (err: Err<E>) => boolean
): Promise<boolean> {
    const r = await result;
    return !r.ok && fn(r);
}

export async function asyncResultIsOk<T, E>(
    result: Promise<Result<T, E>>
): Promise<boolean> {
    const r = await result;
    return r.ok;
}

export async function asyncResultIsOkAnd<T, E>(
    result: Promise<Result<T, E>>,
    fn: (value: T) => boolean
): Promise<boolean> {
    const r = await result;
    return r.ok && fn(r.value);
}

export function asyncResultMap<T, E, R>(
    result: Promise<Result<T, E>>,
    fn: (value: T) => R | Promise<R>
): Promise<Result<R, E>> {
    return result.then(async (r) => (r.ok ? ok(await fn(r.value)) : r));
}

export function asyncResultMapErr<T, E, F>(
    result: Promise<Result<T, E>>,
    fn: (err: Err<E>) => Err<F> | Promise<Err<F>>
): Promise<Result<T, F>> {
    return result.then(async (r) => (r.ok ? (r as Ok<T>) : await fn(r)));
}

export async function asyncResultMapOr<T, E, R>(
    result: Promise<Result<T, E>>,
    defaultValue: R,
    fn: (value: T) => R | Promise<R>
): Promise<R> {
    const r = await result;
    return r.ok ? await fn(r.value) : defaultValue;
}

export async function asyncResultMapOrElse<T, E, R>(
    result: Promise<Result<T, E>>,
    defaultValue: (err: Err<E>) => R | Promise<R>,
    fn: (value: T) => R | Promise<R>
): Promise<R> {
    const r = await result;
    return r.ok ? await fn(r.value) : await defaultValue(r);
}

export async function asyncResultOk<T, E>(
    result: Promise<Result<T, E>>
): Promise<T | null> {
    const r = await result;
    return r.ok ? r.value : null;
}

export function asyncResultOr<T, E>(
    result: Promise<Result<T, E>>,
    other: Promise<Result<T, E>>
): Promise<Result<T, E>> {
    return result.then((r) => (r.ok ? r : other));
}

export function asyncResultOrElse<T, E>(
    result: Promise<Result<T, E>>,
    fn: (err: Err<E>) => Promise<Result<T, E>>
): Promise<Result<T, E>> {
    return result.then((r) => (r.ok ? r : fn(r)));
}

export async function asyncResultUnwrap<T, E>(
    result: Promise<Result<T, E>>
): Promise<T> {
    const r = await result;
    if (!r.ok) {
        throw r;
    }
    return r.value;
}

export async function asyncResultUnwrapErr<T, E>(
    result: Promise<Result<T, E>>
): Promise<Err<E>> {
    const r = await result;
    if (r.ok) {
        throw new Error("Result is ok; expected an error");
    }
    return r;
}

export async function asyncResultUnwrapOr<T, E>(
    result: Promise<Result<T, E>>,
    defaultValue: T
): Promise<T> {
    const r = await result;
    return r.ok ? r.value : defaultValue;
}

export async function asyncResultUnwrapOrElse<T, E>(
    result: Promise<Result<T, E>>,
    fn: (err: Err<E>) => T | Promise<T>
): Promise<T> {
    const r = await result;
    return r.ok ? r.value : await fn(r);
}

/**
 * Executes an async function and catches any thrown exceptions, converting them to a `Result`.
 *
 * @param fn - The async function to execute
 * @param err - A function that converts a thrown exception to an `Err` value
 * @returns A promise of `Ok` containing the return value if `fn` succeeds, or `Err` if it throws
 *
 * @example
 * ```ts
 * const result = await tryCatchResultAsync(
 *   async () => await fetchData(),
 *   (e) => err("fetch_error", String(e))
 * );
 * ```
 */
export async function tryCatchResultAsync<T, E>(
    fn: () => Promise<T>,
    err: (e: unknown) => Err<E>
): Promise<Result<T, E>> {
    try {
        return ok(await fn());
    } catch (e) {
        return err(e);
    }
}

/**
 * Wraps a promise and catches any rejections, converting them to a `Result`.
 *
 * @param prom - The promise to wrap
 * @param err - A function that converts a rejection reason to an `Err` value
 * @returns A promise of `Ok` containing the resolved value if `prom` resolves, or `Err` if it rejects
 *
 * @example
 * ```ts
 * const result = await tryCatchResultPromise(
 *   fetch('/api/data'),
 *   (e) => err("network_error", String(e))
 * );
 * ```
 */
export async function tryCatchResultPromise<T, E>(
    prom: Promise<T>,
    err: (e: unknown) => Err<E>
): Promise<Result<T, E>> {
    try {
        return ok(await prom);
    } catch (e) {
        return err(e);
    }
}

type ChainAnd<T, E> = (other: Result<T, E>) => Chain<T, E>;
type ChainAndThen<I, E> = <O>(fn: (value: I) => Result<O, E>) => Chain<O, E>;
type ChainMap<I, E> = <O>(fn: (value: I) => O) => Chain<O, E>;
type ChainMapErr<T, E> = <F>(fn: (err: Err<E>) => Err<F>) => Chain<T, F>;
type ChainMapOr<I> = <R>(defaultValue: R, fn: (value: I) => R) => R;
type ChainMapOrElse<I, E> = <R>(
    defaultValue: (err: Err<E>) => R,
    fn: (value: I) => R
) => R;
type ChainOr<T, E> = (other: Result<T, E>) => Chain<T, E>;
type ChainOrElse<T, E> = (fn: (err: Err<E>) => Result<T, E>) => Chain<T, E>;
type ChainUnwrap<T> = () => T;
type ChainUnwrapOr<T> = (defaultValue: T) => T;
type ChainUnwrapOrElse<T, E> = (fn: (err: Err<E>) => T) => T;
type ChainExpect<T> = (msg: string) => T;
type ChainExpectErr<E> = (msg: string) => Err<E>;
type ChainUnwrapErr<E> = () => Err<E>;
type ChainFlatten<T, E> = () => Chain<T, E>;
type ChainInspect<T, E> = (fn: (value: T) => void) => Chain<T, E>;
type ChainInspectErr<T, E> = (fn: (err: Err<E>) => void) => Chain<T, E>;
type ChainIsOk<T, E> = () => boolean & { __phantom?: [T, E] };
type ChainIsErr<T, E> = () => boolean & { __phantom?: [T, E] };
type ChainIsOkAnd<T> = (fn: (value: T) => boolean) => boolean;
type ChainIsErrAnd<E> = (fn: (err: Err<E>) => boolean) => boolean;
type ChainOk<T> = () => T | null;
type ChainErr<E> = () => Err<E> | null;

export type Chain<T, E> = {
    result: Result<T, E>;
    and: ChainAnd<T, E>;
    andThen: ChainAndThen<T, E>;
    map: ChainMap<T, E>;
    mapErr: ChainMapErr<T, E>;
    mapOr: ChainMapOr<T>;
    mapOrElse: ChainMapOrElse<T, E>;
    or: ChainOr<T, E>;
    orElse: ChainOrElse<T, E>;
    unwrap: ChainUnwrap<T>;
    unwrapOr: ChainUnwrapOr<T>;
    unwrapOrElse: ChainUnwrapOrElse<T, E>;
    expect: ChainExpect<T>;
    expectErr: ChainExpectErr<E>;
    unwrapErr: ChainUnwrapErr<E>;
    flatten: T extends Result<infer U, E> ? ChainFlatten<U, E> : never;
    inspect: ChainInspect<T, E>;
    inspectErr: ChainInspectErr<T, E>;
    isOk: ChainIsOk<T, E>;
    isErr: ChainIsErr<T, E>;
    isOkAnd: ChainIsOkAnd<T>;
    isErrAnd: ChainIsErrAnd<E>;
    ok: ChainOk<T>;
    err: ChainErr<E>;
};

/**
 * Wraps a `Result` in a chainable API for method chaining.
 *
 * This allows for a more fluent, method-chaining style similar to Rust's Result methods.
 *
 * @param initial - The result to wrap
 * @returns A chainable wrapper around the result
 *
 * @example
 * ```ts
 * const value = chain(parseIntStrict("123"))
 *   .map(n => n * 2)
 *   .unwrapOr(0);
 * ```
 */
export function chain<I, E>(initial: Result<I, E>): Chain<I, E> {
    return {
        result: initial,
        and: (other) => chain(resultAnd(initial, other)),
        andThen: (fn) => chain(resultAndThen(initial, fn)),
        map: <O>(fn: (value: I) => O) => chain(resultMap(initial, fn)),
        mapErr: <F>(fn: (err: Err<E>) => Err<F>) =>
            chain(resultMapErr(initial, fn)),
        mapOr: <R>(defaultValue: R, fn: (value: I) => R) =>
            resultMapOr(initial, defaultValue, fn),
        mapOrElse: <R>(defaultValue: (err: Err<E>) => R, fn: (value: I) => R) =>
            resultMapOrElse(initial, defaultValue, fn),
        or: (other) => chain(resultOr(initial, other)),
        orElse: (fn) => chain(resultOrElse(initial, fn)),
        unwrap: () => resultUnwrap(initial),
        unwrapOr: (defaultValue) => resultUnwrapOr(initial, defaultValue),
        unwrapOrElse: (fn) => resultUnwrapOrElse(initial, fn),
        expect: (msg) => resultExpect(initial, msg),
        expectErr: (msg) => resultExpectErr(initial, msg),
        unwrapErr: () => resultUnwrapErr(initial),
        flatten: (() => chain(resultFlatten(initial as any))) as any,
        inspect: (fn) => chain(resultInspect(initial, fn)),
        inspectErr: (fn) => chain(resultInspectErr(initial, fn)),
        isOk: () => resultIsOk(initial),
        isErr: () => resultIsErr(initial),
        isOkAnd: (fn) => resultIsOkAnd(initial, fn),
        isErrAnd: (fn) => resultIsErrAnd(initial, fn),
        ok: () => resultOk(initial),
        err: () => resultErr(initial),
    };
}

type AsyncChainAnd<T, E> = (other: Promise<Result<T, E>>) => AsyncChain<T, E>;
type AsyncChainAndThen<I, E> = <O>(
    fn: (value: I) => Promise<Result<O, E>>
) => AsyncChain<O, E>;
type AsyncChainMap<I, E> = <O>(
    fn: (value: I) => O | Promise<O>
) => AsyncChain<O, E>;
type AsyncChainMapErr<T, E> = <F>(
    fn: (err: Err<E>) => Err<F> | Promise<Err<F>>
) => AsyncChain<T, F>;
type AsyncChainMapOr<I> = <R>(
    defaultValue: R,
    fn: (value: I) => R | Promise<R>
) => Promise<R>;
type AsyncChainMapOrElse<I, E> = <R>(
    defaultValue: (err: Err<E>) => R | Promise<R>,
    fn: (value: I) => R | Promise<R>
) => Promise<R>;
type AsyncChainOr<T, E> = (other: Promise<Result<T, E>>) => AsyncChain<T, E>;
type AsyncChainOrElse<T, E> = (
    fn: (err: Err<E>) => Promise<Result<T, E>>
) => AsyncChain<T, E>;
type AsyncChainUnwrap<T> = () => Promise<T>;
type AsyncChainUnwrapOr<T> = (defaultValue: T) => Promise<T>;
type AsyncChainUnwrapOrElse<T, E> = (
    fn: (err: Err<E>) => T | Promise<T>
) => Promise<T>;
type AsyncChainExpect<T> = (msg: string) => Promise<T>;
type AsyncChainExpectErr<E> = (msg: string) => Promise<Err<E>>;
type AsyncChainUnwrapErr<E> = () => Promise<Err<E>>;
type AsyncChainFlatten<T, E> = () => AsyncChain<T, E>;
type AsyncChainInspect<T, E> = (
    fn: (value: T) => void | Promise<void>
) => AsyncChain<T, E>;
type AsyncChainInspectErr<T, E> = (
    fn: (err: Err<E>) => void | Promise<void>
) => AsyncChain<T, E>;
type AsyncChainIsOk<T, E> = () => Promise<boolean & { __phantom?: [T, E] }>;
type AsyncChainIsErr<T, E> = () => Promise<boolean & { __phantom?: [T, E] }>;
type AsyncChainIsOkAnd<T> = (fn: (value: T) => boolean) => Promise<boolean>;
type AsyncChainIsErrAnd<E> = (fn: (err: Err<E>) => boolean) => Promise<boolean>;
type AsyncChainOk<T> = () => Promise<T | null>;
type AsyncChainErr<E> = () => Promise<Err<E> | null>;

export type AsyncChain<T, E> = {
    result: Promise<Result<T, E>>;
    and: AsyncChainAnd<T, E>;
    andThen: AsyncChainAndThen<T, E>;
    map: AsyncChainMap<T, E>;
    mapErr: AsyncChainMapErr<T, E>;
    mapOr: AsyncChainMapOr<T>;
    mapOrElse: AsyncChainMapOrElse<T, E>;
    or: AsyncChainOr<T, E>;
    orElse: AsyncChainOrElse<T, E>;
    unwrap: AsyncChainUnwrap<T>;
    unwrapOr: AsyncChainUnwrapOr<T>;
    unwrapOrElse: AsyncChainUnwrapOrElse<T, E>;
    expect: AsyncChainExpect<T>;
    expectErr: AsyncChainExpectErr<E>;
    unwrapErr: AsyncChainUnwrapErr<E>;
    flatten: T extends Result<infer U, E> ? AsyncChainFlatten<U, E> : never;
    inspect: AsyncChainInspect<T, E>;
    inspectErr: AsyncChainInspectErr<T, E>;
    isOk: AsyncChainIsOk<T, E>;
    isErr: AsyncChainIsErr<T, E>;
    isOkAnd: AsyncChainIsOkAnd<T>;
    isErrAnd: AsyncChainIsErrAnd<E>;
    ok: AsyncChainOk<T>;
    err: AsyncChainErr<E>;
};

/**
 * Wraps a `Promise<Result>` in a chainable API for method chaining with async operations.
 *
 * This allows for a fluent, method-chaining style with async results.
 *
 * @param initial - The promise of a result to wrap
 * @returns An async chainable wrapper around the result promise
 *
 * @example
 * ```ts
 * const value = await asyncChain(fetchData())
 *   .map(data => data.value)
 *   .unwrapOr("default");
 * ```
 */
export function asyncChain<I, E>(
    initial: Promise<Result<I, E>>
): AsyncChain<I, E> {
    return {
        result: initial,
        and: (other) => asyncChain(asyncResultAnd(initial, other)),
        andThen: (fn) => asyncChain(asyncResultAndThen(initial, fn)),
        map: <O>(fn: (value: I) => O | Promise<O>) =>
            asyncChain(asyncResultMap(initial, fn)),
        mapErr: <F>(fn: (err: Err<E>) => Err<F> | Promise<Err<F>>) =>
            asyncChain(asyncResultMapErr(initial, fn)),
        mapOr: <R>(defaultValue: R, fn: (value: I) => R | Promise<R>) =>
            asyncResultMapOr(initial, defaultValue, fn),
        mapOrElse: <R>(
            defaultValue: (err: Err<E>) => R | Promise<R>,
            fn: (value: I) => R | Promise<R>
        ) => asyncResultMapOrElse(initial, defaultValue, fn),
        or: (other) => asyncChain(asyncResultOr(initial, other)),
        orElse: (fn) => asyncChain(asyncResultOrElse(initial, fn)),
        unwrap: () => asyncResultUnwrap(initial),
        unwrapOr: (defaultValue) => asyncResultUnwrapOr(initial, defaultValue),
        unwrapOrElse: (fn) => asyncResultUnwrapOrElse(initial, fn),
        expect: (msg) => asyncResultExpect(initial, msg),
        expectErr: (msg) => asyncResultExpectErr(initial, msg),
        unwrapErr: () => asyncResultUnwrapErr(initial),
        flatten: (() => asyncChain(asyncResultFlatten(initial as any))) as any,
        inspect: (fn) => asyncChain(asyncResultInspect(initial, fn)),
        inspectErr: (fn) => asyncChain(asyncResultInspectErr(initial, fn)),
        isOk: () => asyncResultIsOk(initial),
        isErr: () => asyncResultIsErr(initial),
        isOkAnd: (fn) => asyncResultIsOkAnd(initial, fn),
        isErrAnd: (fn) => asyncResultIsErrAnd(initial, fn),
        ok: () => asyncResultOk(initial),
        err: () => asyncResultErr(initial),
    };
}

/**
 * Pattern matches on a `Result`, applying the appropriate handler function.
 *
 * This provides a convenient way to handle both success and error cases in a single expression,
 * similar to Rust's `match` expression.
 *
 * @param result - The result to match on
 * @param handlers - An object with `ok` and `err` handler functions
 * @returns The result of calling the appropriate handler
 *
 * @example
 * ```ts
 * const message = match(parseIntStrict("123"), {
 *   ok: n => `Success: ${n}`,
 *   err: e => `Error: ${e.error}`
 * });
 * ```
 */
export function match<T, E, R>(
    result: Result<T, E>,
    handlers: {
        ok: (value: T) => R;
        err: (err: Err<E>) => R;
    }
): R {
    return result.ok ? handlers.ok(result.value) : handlers.err(result);
}

/**
 * Async version of `match`. Pattern matches on a `Promise<Result>`, applying the appropriate async handler function.
 *
 * @param result - The promise of a result to match on
 * @param handlers - An object with `ok` and `err` async handler functions
 * @returns A promise of the result of calling the appropriate handler
 *
 * @example
 * ```ts
 * const message = await asyncMatch(fetchData(), {
 *   ok: async data => await processData(data),
 *   err: e => `Error: ${e.error}`
 * });
 * ```
 * @see {@link match}
 */
export async function asyncMatch<T, E, R>(
    result: Promise<Result<T, E>>,
    handlers: {
        ok: (value: T) => R | Promise<R>;
        err: (err: Err<E>) => R | Promise<R>;
    }
): Promise<R> {
    const r = await result;
    return r.ok ? await handlers.ok(r.value) : await handlers.err(r);
}