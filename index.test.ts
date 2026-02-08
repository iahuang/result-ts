import { describe, it, expect } from "vitest";
import {
    ok,
    err,
    resultType,
    resultAnd,
    resultAndThen,
    resultErr,
    resultExpect,
    resultExpectErr,
    resultFlatten,
    resultInspect,
    resultInspectErr,
    resultIsErr,
    resultIsErrAnd,
    resultIsOk,
    resultIsOkAnd,
    resultMap,
    resultMapErr,
    resultMapOr,
    resultMapOrElse,
    resultOk,
    resultOr,
    resultOrElse,
    resultUnwrap,
    resultUnwrapErr,
    resultUnwrapOr,
    resultUnwrapOrElse,
    resultFromThrowingFunction,
    resultFromThrowingAsyncFunction,
    resultFromThrowingPromise,
    chain,
    asyncChain,
    match,
    type Result,
    type Err,
} from "./index";

// --- Test helpers ---

type TestErrors = {
    not_found: string;
    invalid: number;
    empty: undefined;
};

const r = resultType<string, TestErrors>();

function mkOk(): Result<string, TestErrors> {
    return r.ok("hello");
}

function mkErr(): Result<string, TestErrors> {
    return r.err("not_found", "/path");
}

// --- Result shape tests ---

describe("Result shape", () => {
    it("ok() produces { ok: true, value }", () => {
        const result = ok(42);
        expect(result).toEqual({ ok: true, value: 42 });
        expect(result.ok).toBe(true);
        expect(result.value).toBe(42);
        expect(result.error).toBeUndefined();
    });

    it("err() produces { ok: false, error: { type, detail } }", () => {
        const result = err("not_found", "/missing");
        expect(result).toEqual({
            ok: false,
            error: { type: "not_found", detail: "/missing" },
        });
        expect(result.ok).toBe(false);
        expect(result.error).toEqual({ type: "not_found", detail: "/missing" });
    });

    it("ok result has value and undefined error", () => {
        const result = mkOk();
        if (result.ok) {
            expect(result.value).toBe("hello");
            expect(result.error).toBeUndefined();
        } else {
            throw new Error("expected ok");
        }
    });

    it("err result has error and undefined value", () => {
        const result = mkErr();
        if (!result.ok) {
            expect(result.error.type).toBe("not_found");
            expect(result.error.detail).toBe("/path");
            expect(result.value).toBeUndefined();
        } else {
            throw new Error("expected err");
        }
    });
});

// --- resultType constructors ---

describe("resultType constructors", () => {
    it("ok constructor creates ok results", () => {
        const result = r.ok("test");
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe("test");
    });

    it("err constructor creates err results with detail", () => {
        const result = r.err("not_found", "/file");
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.type).toBe("not_found");
            expect(result.error.detail).toBe("/file");
        }
    });

    it("err constructor creates err results without detail (undefined)", () => {
        const result = r.err("empty");
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.type).toBe("empty");
        }
    });
});

// --- Standalone functions ---

describe("resultAnd", () => {
    it("returns other when ok", () => {
        const result = resultAnd(mkOk(), r.ok("world"));
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe("world");
    });

    it("returns err when err", () => {
        const result = resultAnd(mkErr(), r.ok("world"));
        expect(result.ok).toBe(false);
    });
});

describe("resultAndThen", () => {
    it("calls fn when ok", () => {
        const result = resultAndThen(mkOk(), (v) => r.ok(v + " world"));
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe("hello world");
    });

    it("returns err when err", () => {
        const result = resultAndThen(mkErr(), (v) => r.ok(v + " world"));
        expect(result.ok).toBe(false);
    });
});

describe("resultErr", () => {
    it("returns error info when err", () => {
        const e = resultErr(mkErr());
        expect(e).toEqual({ type: "not_found", detail: "/path" });
    });

    it("returns null when ok", () => {
        expect(resultErr(mkOk())).toBeNull();
    });
});

describe("resultExpect", () => {
    it("returns value when ok", () => {
        expect(resultExpect(mkOk(), "should not throw")).toBe("hello");
    });

    it("throws with message when err", () => {
        expect(() => resultExpect(mkErr(), "custom msg")).toThrow("custom msg");
    });
});

describe("resultExpectErr", () => {
    it("returns error info when err", () => {
        const e = resultExpectErr(mkErr(), "should not throw");
        expect(e).toEqual({ type: "not_found", detail: "/path" });
    });

    it("throws with message when ok", () => {
        expect(() => resultExpectErr(mkOk(), "custom msg")).toThrow("custom msg");
    });
});

describe("resultFlatten", () => {
    it("flattens nested ok", () => {
        const inner = r.ok("inner");
        const outer: Result<Result<string, TestErrors>, TestErrors> = ok(inner);
        const flat = resultFlatten(outer);
        expect(flat.ok).toBe(true);
        if (flat.ok) expect(flat.value).toBe("inner");
    });

    it("flattens outer err", () => {
        const outer: Result<Result<string, TestErrors>, TestErrors> = mkErr() as any;
        const flat = resultFlatten(outer);
        expect(flat.ok).toBe(false);
    });
});

describe("resultInspect", () => {
    it("calls fn with value when ok", () => {
        let inspected: string | undefined;
        const result = resultInspect(mkOk(), (v) => { inspected = v; });
        expect(inspected).toBe("hello");
        expect(result.ok).toBe(true);
    });

    it("does not call fn when err", () => {
        let called = false;
        resultInspect(mkErr(), () => { called = true; });
        expect(called).toBe(false);
    });
});

describe("resultInspectErr", () => {
    it("calls fn with error info when err", () => {
        let inspected: Err<TestErrors> | undefined;
        resultInspectErr(mkErr(), (e) => { inspected = e; });
        expect(inspected).toEqual({ type: "not_found", detail: "/path" });
    });

    it("does not call fn when ok", () => {
        let called = false;
        resultInspectErr(mkOk(), () => { called = true; });
        expect(called).toBe(false);
    });
});

describe("resultIsErr / resultIsOk", () => {
    it("resultIsErr returns true for err", () => {
        expect(resultIsErr(mkErr())).toBe(true);
    });

    it("resultIsErr returns false for ok", () => {
        expect(resultIsErr(mkOk())).toBe(false);
    });

    it("resultIsOk returns true for ok", () => {
        expect(resultIsOk(mkOk())).toBe(true);
    });

    it("resultIsOk returns false for err", () => {
        expect(resultIsOk(mkErr())).toBe(false);
    });
});

describe("resultIsErrAnd / resultIsOkAnd", () => {
    it("resultIsErrAnd returns true when predicate matches", () => {
        expect(resultIsErrAnd(mkErr(), (e) => e.type === "not_found")).toBe(true);
    });

    it("resultIsErrAnd returns false when predicate fails", () => {
        expect(resultIsErrAnd(mkErr(), (e) => e.type === "invalid")).toBe(false);
    });

    it("resultIsErrAnd returns false for ok", () => {
        expect(resultIsErrAnd(mkOk(), () => true)).toBe(false);
    });

    it("resultIsOkAnd returns true when predicate matches", () => {
        expect(resultIsOkAnd(mkOk(), (v) => v === "hello")).toBe(true);
    });

    it("resultIsOkAnd returns false when predicate fails", () => {
        expect(resultIsOkAnd(mkOk(), (v) => v === "nope")).toBe(false);
    });

    it("resultIsOkAnd returns false for err", () => {
        expect(resultIsOkAnd(mkErr(), () => true)).toBe(false);
    });
});

describe("resultMap", () => {
    it("maps value when ok", () => {
        const result = resultMap(mkOk(), (v) => v.length);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe(5);
    });

    it("passes through err", () => {
        const result = resultMap(mkErr(), (v) => v.length);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.type).toBe("not_found");
    });
});

describe("resultMapErr", () => {
    it("maps error when err", () => {
        const result = resultMapErr(mkErr(), (e) => ({
            type: "general" as const,
            detail: `${e.type}: ${e.detail}`,
        }));
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.type).toBe("general");
            expect(result.error.detail).toBe("not_found: /path");
        }
    });

    it("passes through ok", () => {
        const result = resultMapErr(mkOk(), (e) => ({
            type: "general" as const,
            detail: String(e.detail),
        }));
        expect(result.ok).toBe(true);
    });
});

describe("resultMapOr", () => {
    it("applies fn when ok", () => {
        expect(resultMapOr(mkOk(), 0, (v) => v.length)).toBe(5);
    });

    it("returns default when err", () => {
        expect(resultMapOr(mkErr(), 0, (v) => v.length)).toBe(0);
    });
});

describe("resultMapOrElse", () => {
    it("applies fn when ok", () => {
        expect(resultMapOrElse(mkOk(), () => 0, (v) => v.length)).toBe(5);
    });

    it("applies default fn when err", () => {
        expect(
            resultMapOrElse(mkErr(), (e) => (e.type === "not_found" ? -1 : -2), (v) => v.length)
        ).toBe(-1);
    });
});

describe("resultOk", () => {
    it("returns value when ok", () => {
        expect(resultOk(mkOk())).toBe("hello");
    });

    it("returns null when err", () => {
        expect(resultOk(mkErr())).toBeNull();
    });
});

describe("resultOr", () => {
    it("returns first when ok", () => {
        const result = resultOr(mkOk(), r.ok("other"));
        if (result.ok) expect(result.value).toBe("hello");
    });

    it("returns other when err", () => {
        const result = resultOr(mkErr(), r.ok("other"));
        if (result.ok) expect(result.value).toBe("other");
    });
});

describe("resultOrElse", () => {
    it("returns first when ok", () => {
        const result = resultOrElse(mkOk(), () => r.ok("fallback"));
        if (result.ok) expect(result.value).toBe("hello");
    });

    it("calls fn when err", () => {
        const result = resultOrElse(mkErr(), (e) => r.ok(`recovered: ${e.type}`));
        if (result.ok) expect(result.value).toBe("recovered: not_found");
    });
});

describe("resultUnwrap", () => {
    it("returns value when ok", () => {
        expect(resultUnwrap(mkOk())).toBe("hello");
    });

    it("throws error info when err", () => {
        try {
            resultUnwrap(mkErr());
            throw new Error("should have thrown");
        } catch (e) {
            expect(e).toEqual({ type: "not_found", detail: "/path" });
        }
    });
});

describe("resultUnwrapErr", () => {
    it("returns error info when err", () => {
        expect(resultUnwrapErr(mkErr())).toEqual({ type: "not_found", detail: "/path" });
    });

    it("throws when ok", () => {
        expect(() => resultUnwrapErr(mkOk())).toThrow("Result is ok; expected an error");
    });
});

describe("resultUnwrapOr", () => {
    it("returns value when ok", () => {
        expect(resultUnwrapOr(mkOk(), "default")).toBe("hello");
    });

    it("returns default when err", () => {
        expect(resultUnwrapOr(mkErr(), "default")).toBe("default");
    });
});

describe("resultUnwrapOrElse", () => {
    it("returns value when ok", () => {
        expect(resultUnwrapOrElse(mkOk(), () => "default")).toBe("hello");
    });

    it("calls fn when err", () => {
        expect(resultUnwrapOrElse(mkErr(), (e) => `err: ${e.type}`)).toBe("err: not_found");
    });
});

// --- tryCatchResult ---

describe("tryCatchResult", () => {
    it("returns ok on success", () => {
        const result = resultFromThrowingFunction(
            () => JSON.parse('{"a":1}'),
            (e) => err("parse_error", String(e))
        );
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toEqual({ a: 1 });
    });

    it("returns err on throw", () => {
        const result = resultFromThrowingFunction(
            () => JSON.parse("invalid"),
            (e) => err("parse_error", String(e))
        );
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.type).toBe("parse_error");
        }
    });
});

// --- match ---

describe("match", () => {
    it("calls ok handler when ok", () => {
        const msg = match(mkOk(), {
            ok: (v) => `value: ${v}`,
            err: (e) => `error: ${e.type}`,
        });
        expect(msg).toBe("value: hello");
    });

    it("calls err handler when err", () => {
        const msg = match(mkErr(), {
            ok: (v) => `value: ${v}`,
            err: (e) => `error: ${e.type}`,
        });
        expect(msg).toBe("error: not_found");
    });

    it("err handler receives error info with type and detail", () => {
        match(mkErr(), {
            ok: () => {},
            err: (e) => {
                expect(e.type).toBe("not_found");
                expect(e.detail).toBe("/path");
            },
        });
    });
});

// --- Chain API ---

describe("chain", () => {
    it("map transforms ok value", () => {
        const result = chain(mkOk()).map((v) => v.length).unwrap();
        expect(result).toBe(5);
    });

    it("map passes through err", () => {
        const result = chain(mkErr()).map((v) => v.length).unwrapOr(0);
        expect(result).toBe(0);
    });

    it("andThen chains ok results", () => {
        const result = chain(mkOk())
            .andThen((v) => r.ok(v + " world"))
            .unwrap();
        expect(result).toBe("hello world");
    });

    it("andThen short-circuits on err", () => {
        let called = false;
        chain(mkErr()).andThen(() => {
            called = true;
            return r.ok("nope");
        });
        expect(called).toBe(false);
    });

    it("mapErr transforms error", () => {
        const c = chain(mkErr()).mapErr((e) => ({
            type: "wrapped" as const,
            detail: e.type as string,
        }));
        const e = c.err();
        expect(e).toEqual({ type: "wrapped", detail: "not_found" });
    });

    it("or returns first when ok", () => {
        const result = chain(mkOk()).or(r.ok("other")).unwrap();
        expect(result).toBe("hello");
    });

    it("or returns other when err", () => {
        const result = chain(mkErr()).or(r.ok("other")).unwrap();
        expect(result).toBe("other");
    });

    it("orElse calls fn when err", () => {
        const result = chain(mkErr())
            .orElse((e) => r.ok(`recovered: ${e.type}`))
            .unwrap();
        expect(result).toBe("recovered: not_found");
    });

    it("unwrap throws error info for err", () => {
        try {
            chain(mkErr()).unwrap();
            throw new Error("should have thrown");
        } catch (e) {
            expect(e).toEqual({ type: "not_found", detail: "/path" });
        }
    });

    it("unwrapOr returns default for err", () => {
        expect(chain(mkErr()).unwrapOr("default")).toBe("default");
    });

    it("unwrapOrElse calls fn for err", () => {
        expect(chain(mkErr()).unwrapOrElse((e) => `err: ${e.type}`)).toBe("err: not_found");
    });

    it("expect throws custom message for err", () => {
        expect(() => chain(mkErr()).expect("custom")).toThrow("custom");
    });

    it("expectErr returns error info for err", () => {
        expect(chain(mkErr()).expectErr("msg")).toEqual({ type: "not_found", detail: "/path" });
    });

    it("unwrapErr returns error info for err", () => {
        expect(chain(mkErr()).unwrapErr()).toEqual({ type: "not_found", detail: "/path" });
    });

    it("inspect calls fn for ok", () => {
        let inspected: string | undefined;
        chain(mkOk()).inspect((v) => { inspected = v; });
        expect(inspected).toBe("hello");
    });

    it("inspectErr calls fn for err", () => {
        let inspected: Err<TestErrors> | undefined;
        chain(mkErr()).inspectErr((e) => { inspected = e; });
        expect(inspected).toEqual({ type: "not_found", detail: "/path" });
    });

    it("isOk / isErr return correct booleans", () => {
        expect(chain(mkOk()).isOk()).toBe(true);
        expect(chain(mkOk()).isErr()).toBe(false);
        expect(chain(mkErr()).isOk()).toBe(false);
        expect(chain(mkErr()).isErr()).toBe(true);
    });

    it("isOkAnd / isErrAnd with predicates", () => {
        expect(chain(mkOk()).isOkAnd((v) => v === "hello")).toBe(true);
        expect(chain(mkOk()).isOkAnd((v) => v === "nope")).toBe(false);
        expect(chain(mkErr()).isErrAnd((e) => e.type === "not_found")).toBe(true);
        expect(chain(mkErr()).isErrAnd((e) => e.type === "invalid")).toBe(false);
    });

    it("ok() / err() extract values", () => {
        expect(chain(mkOk()).ok()).toBe("hello");
        expect(chain(mkOk()).err()).toBeNull();
        expect(chain(mkErr()).ok()).toBeNull();
        expect(chain(mkErr()).err()).toEqual({ type: "not_found", detail: "/path" });
    });

    it("mapOr / mapOrElse work through chain", () => {
        expect(chain(mkOk()).mapOr(0, (v) => v.length)).toBe(5);
        expect(chain(mkErr()).mapOr(0, (v) => v.length)).toBe(0);
        expect(chain(mkOk()).mapOrElse(() => 0, (v) => v.length)).toBe(5);
        expect(chain(mkErr()).mapOrElse((e) => (e.type === "not_found" ? -1 : -2), (v) => v.length)).toBe(-1);
    });

    it("flatten unwraps nested result", () => {
        const nested: Result<Result<string, TestErrors>, TestErrors> = ok(r.ok("inner"));
        const c = chain(nested).flatten();
        expect(c.unwrap()).toBe("inner");
    });

    it("result property exposes the raw result", () => {
        const c = chain(mkOk());
        expect(c.result).toEqual({ ok: true, value: "hello" });
    });
});

// --- tryCatchResultAsync / tryCatchResultPromise ---

describe("tryCatchResultAsync", () => {
    it("returns ok on success", async () => {
        const result = await resultFromThrowingAsyncFunction(
            async () => 42,
            (e) => err("fail", String(e))
        );
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe(42);
    });

    it("returns err on throw", async () => {
        const result = await resultFromThrowingAsyncFunction(
            async () => { throw new Error("boom"); },
            (e) => err("fail", String(e))
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.type).toBe("fail");
    });
});

describe("tryCatchResultPromise", () => {
    it("returns ok on resolve", async () => {
        const result = await resultFromThrowingPromise(
            Promise.resolve(42),
            (e) => err("fail", String(e))
        );
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe(42);
    });

    it("returns err on reject", async () => {
        const result = await resultFromThrowingPromise(
            Promise.reject(new Error("boom")),
            (e) => err("fail", String(e))
        );
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.type).toBe("fail");
    });
});

// --- AsyncChain ---

describe("asyncChain", () => {
    const asyncOk = () => Promise.resolve(mkOk());
    const asyncErr = () => Promise.resolve(mkErr());

    it("map transforms ok value", async () => {
        const result = await asyncChain(asyncOk()).map((v) => v.length).unwrap();
        expect(result).toBe(5);
    });

    it("andThen chains ok", async () => {
        const result = await asyncChain(asyncOk())
            .andThen(async (v) => r.ok(v + "!"))
            .unwrap();
        expect(result).toBe("hello!");
    });

    it("mapErr transforms error", async () => {
        const e = await asyncChain(asyncErr())
            .mapErr((e) => ({ type: "wrapped" as const, detail: e.type as string }))
            .err();
        expect(e).toEqual({ type: "wrapped", detail: "not_found" });
    });

    it("or / orElse work", async () => {
        expect(
            await asyncChain(asyncErr()).or(Promise.resolve(r.ok("other"))).unwrap()
        ).toBe("other");
        expect(
            await asyncChain(asyncErr())
                .orElse(async (e) => r.ok(`recovered: ${e.type}`))
                .unwrap()
        ).toBe("recovered: not_found");
    });

    it("unwrapOr / unwrapOrElse work", async () => {
        expect(await asyncChain(asyncErr()).unwrapOr("default")).toBe("default");
        expect(await asyncChain(asyncErr()).unwrapOrElse((e) => `err: ${e.type}`)).toBe("err: not_found");
    });

    it("expect / expectErr work", async () => {
        expect(await asyncChain(asyncOk()).expect("msg")).toBe("hello");
        await expect(asyncChain(asyncErr()).expect("msg")).rejects.toThrow("msg");
        expect(await asyncChain(asyncErr()).expectErr("msg")).toEqual({ type: "not_found", detail: "/path" });
    });

    it("unwrapErr works", async () => {
        expect(await asyncChain(asyncErr()).unwrapErr()).toEqual({ type: "not_found", detail: "/path" });
    });

    it("inspect / inspectErr work", async () => {
        let okVal: string | undefined;
        let errVal: Err<TestErrors> | undefined;
        await asyncChain(asyncOk()).inspect((v) => { okVal = v; }).result;
        await asyncChain(asyncErr()).inspectErr((e) => { errVal = e; }).result;
        expect(okVal).toBe("hello");
        expect(errVal).toEqual({ type: "not_found", detail: "/path" });
    });

    it("isOk / isErr / isOkAnd / isErrAnd work", async () => {
        expect(await asyncChain(asyncOk()).isOk()).toBe(true);
        expect(await asyncChain(asyncErr()).isErr()).toBe(true);
        expect(await asyncChain(asyncOk()).isOkAnd((v) => v === "hello")).toBe(true);
        expect(await asyncChain(asyncErr()).isErrAnd((e) => e.type === "not_found")).toBe(true);
    });

    it("ok / err extract values", async () => {
        expect(await asyncChain(asyncOk()).ok()).toBe("hello");
        expect(await asyncChain(asyncOk()).err()).toBeNull();
        expect(await asyncChain(asyncErr()).ok()).toBeNull();
        expect(await asyncChain(asyncErr()).err()).toEqual({ type: "not_found", detail: "/path" });
    });

    it("mapOr / mapOrElse work", async () => {
        expect(await asyncChain(asyncOk()).mapOr(0, (v) => v.length)).toBe(5);
        expect(await asyncChain(asyncErr()).mapOr(0, (v) => v.length)).toBe(0);
        expect(await asyncChain(asyncOk()).mapOrElse(() => 0, (v) => v.length)).toBe(5);
        expect(await asyncChain(asyncErr()).mapOrElse(() => -1, (v) => v.length)).toBe(-1);
    });

    it("result property exposes the raw promise", async () => {
        const result = await asyncChain(asyncOk()).result;
        expect(result).toEqual({ ok: true, value: "hello" });
    });
});

// --- Type narrowing tests ---

describe("type narrowing", () => {
    it("ok branch narrows to value access", () => {
        const result: Result<number, { fail: string }> = ok(42);
        if (result.ok) {
            const v: number = result.value;
            expect(v).toBe(42);
            expect(result.error).toBeUndefined();
        }
    });

    it("err branch narrows to error access", () => {
        const result: Result<number, { fail: string }> = err("fail", "oops");
        if (!result.ok) {
            const e = result.error;
            expect(e.type).toBe("fail");
            expect(e.detail).toBe("oops");
            expect(result.value).toBeUndefined();
        }
    });

    it("resultIsOk narrows type", () => {
        const result: Result<number, { fail: string }> = ok(10);
        if (resultIsOk(result)) {
            const v: number = result.value;
            expect(v).toBe(10);
        }
    });

    it("resultIsErr narrows type", () => {
        const result: Result<number, { fail: string }> = err("fail", "oops");
        if (resultIsErr(result)) {
            expect(result.error.type).toBe("fail");
        }
    });
});

// --- Undetailed errors ---

describe("Undetailed errors", () => {
    it("errConstructor works without detail for undefined-valued keys", () => {
        type Errors = { timeout: undefined; cancelled: undefined };
        const r2 = resultType<string, Errors>();
        const result = r2.err("timeout");
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.type).toBe("timeout");
        }
    });
});
