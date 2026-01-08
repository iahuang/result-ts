/**
 * Usage
 *
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

export type Err<E> = {
	[K in keyof E]: {
		ok: false;
		error: K;
		detail: E[K];
	};
}[keyof E];

export type Ok<T> = {
	ok: true;
	error?: never;
	value: T;
};

export type Result<T, E> = Err<E> | Ok<T>;

export type Undetailed<E extends string> = {
	[K in E]: undefined;
};

export function ok<T>(value: T): Ok<T> {
	return { ok: true, value };
}

export type OkConstructor<T> = (value: T) => Ok<T>;

export type ErrConstructor<E> = <K extends keyof E>(
	error: K,
	...args: E[K] extends undefined ? [] : [detail: E[K]]
) => Err<E>;

export function okConstructor<T>(): OkConstructor<T> {
	return ((value: T) => ({ ok: true, value })) as OkConstructor<T>;
}

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

type ResultConstructors<T, E> = {
	ok: OkConstructor<T>;
	err: ErrConstructor<E>;
	__result: Result<T, E>;
};

export function resultType<T, E>(): ResultConstructors<T, E> {
	return {
		ok: okConstructor(),
		err: errConstructor(),
		__result: undefined as unknown as Result<T, E>,
	} as ResultConstructors<T, E>;
}

export type ResultType<T extends ResultConstructors<any, any>> = T["__result"];

export function resultAnd<T, E>(result: Result<T, E>, other: Result<T, E>): Result<T, E> {
	return result.ok ? other : result;
}

export function resultAndThen<T, E, R>(
	result: Result<T, E>,
	fn: (value: T) => Result<R, E>
): Result<R, E> {
	return result.ok ? fn(result.value) : result;
}

export function resultErr<T, E>(result: Result<T, E>): Err<E> | null {
	return !result.ok ? result : null;
}

export function resultExpect<T, E>(result: Result<T, E>, msg: string): T {
	if (!result.ok) {
		throw new Error(msg);
	}
	return result.value;
}

export function resultExpectErr<T, E>(result: Result<T, E>, msg: string): Err<E> {
	if (result.ok) {
		throw new Error(msg);
	}
	return result;
}

export function resultFlatten<T, E>(result: Result<Result<T, E>, E>): Result<T, E> {
	return result.ok ? result.value : result;
}

export function resultInspect<T, E>(result: Result<T, E>, fn: (value: T) => void): Result<T, E> {
	if (result.ok) {
		fn(result.value);
	}
	return result;
}

export function resultInspectErr<T, E>(
	result: Result<T, E>,
	fn: (err: Err<E>) => void
): Result<T, E> {
	if (!result.ok) {
		fn(result);
	}
	return result;
}

export function resultIsErr<T, E>(r: Result<T, E>): r is Err<E> {
	return !r.ok;
}

export function resultIsErrAnd<T, E>(r: Result<T, E>, fn: (err: Err<E>) => boolean): boolean {
	return !r.ok && fn(r);
}

export function resultIsOk<T, E>(r: Result<T, E>): r is Ok<T> {
	return r.ok;
}

export function resultIsOkAnd<T, E>(r: Result<T, E>, fn: (value: T) => boolean): boolean {
	return r.ok && fn(r.value);
}

export function resultMap<T, E, R>(result: Result<T, E>, fn: (value: T) => R): Result<R, E> {
	return result.ok ? ok(fn(result.value)) : result;
}

export function resultMapErr<T, E, F>(
	result: Result<T, E>,
	fn: (err: Err<E>) => Err<F>
): Result<T, F> {
	return result.ok ? (result as Ok<T>) : fn(result);
}

export function resultMapOr<T, E, R>(
	result: Result<T, E>,
	defaultValue: R,
	fn: (value: T) => R
): R {
	return result.ok ? fn(result.value) : defaultValue;
}

export function resultMapOrElse<T, E, R>(
	result: Result<T, E>,
	defaultValue: (err: Err<E>) => R,
	fn: (value: T) => R
): R {
	return result.ok ? fn(result.value) : defaultValue(result);
}

export function resultOk<T, E>(result: Result<T, E>): T | null {
	return result.ok ? result.value : null;
}

export function resultOr<T, E>(result: Result<T, E>, other: Result<T, E>): Result<T, E> {
	return result.ok ? result : other;
}

export function resultOrElse<T, E>(
	result: Result<T, E>,
	fn: (err: Err<E>) => Result<T, E>
): Result<T, E> {
	return result.ok ? result : fn(result);
}

export function resultUnwrap<T, E>(result: Result<T, E>): T {
	if (!result.ok) {
		throw result;
	}
	return result.value;
}

export function resultUnwrapErr<T, E>(result: Result<T, E>): Err<E> {
	if (result.ok) {
		throw new Error("Result is ok; expected an error");
	}
	return result;
}

export function resultUnwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
	return result.ok ? result.value : defaultValue;
}

export function resultUnwrapOrElse<T, E>(result: Result<T, E>, fn: (err: Err<E>) => T): T {
	return result.ok ? result.value : fn(result);
}

export function tryCatchResult<T, E>(fn: () => T, err: (e: unknown) => Err<E>): Result<T, E> {
	try {
		return ok(fn());
	} catch (e) {
		return err(e);
	}
}

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

type ChainAnd<T, E> = (other: Result<T, E>) => Chain<T, E>;
type ChainAndThen<I, E> = <O>(fn: (value: I) => Result<O, E>) => Chain<O, E>;
type ChainMap<I, E> = <O>(fn: (value: I) => O) => Chain<O, E>;
type ChainMapErr<T, E> = <F>(fn: (err: Err<E>) => Err<F>) => Chain<T, F>;
type ChainMapOr<I> = <R>(defaultValue: R, fn: (value: I) => R) => R;
type ChainMapOrElse<I, E> = <R>(defaultValue: (err: Err<E>) => R, fn: (value: I) => R) => R;
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

type Chain<T, E> = {
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

export function chain<I, E>(initial: Result<I, E>): Chain<I, E> {
	return {
		result: initial,
		and: (other) => chain(resultAnd(initial, other)),
		andThen: (fn) => chain(resultAndThen(initial, fn)),
		map: <O>(fn: (value: I) => O) => chain(resultMap(initial, fn)),
		mapErr: <F>(fn: (err: Err<E>) => Err<F>) => chain(resultMapErr(initial, fn)),
		mapOr: <R>(defaultValue: R, fn: (value: I) => R) => resultMapOr(initial, defaultValue, fn),
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
