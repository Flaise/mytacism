![Mytacism](./images/mytacism.png)

# Mytacism

The word *mytacism* means excessive or wrong use of the sound of the letter *M*. This library analyzes "mabstract myntax mrees" - JavaScript expressions - and evaluates what can be resolved at build time.

## Summary

Mytacism evaluates statically-resolvable parts of JavaScript code and rewrites the AST: it folds constants, simplifies expressions, trims obviously unreachable branches, and lets you inject your own compile-time constants, functions, and macros.

Under the hood it uses [recast](https://github.com/benjamn/recast) to parse and print ESTree-compatible ASTs, so it integrates cleanly with other JS tooling and preserves formatting and source maps as far as recast allows.

## Status

Archived.

When this was written, tools like Rollup were quite new and didn't yet cover this space well. These days, mature bundlers and minifiers (Rollup, Webpack + Terser, Parcel, Vite, etc.) provide constant folding, dead-code elimination, and tree-shaking out of the box.

Mytacism is kept around as a small, self-contained example of:

* Working directly with JavaScript ASTs
* Implementing a safe static-evaluation pass
* Adding a simple macro / inlining system on top of that

For most production uses you should reach for a modern bundler instead.

## Features

Mytacism operates on a subset of JavaScript that can be resolved safely at build time:

* **Constant folding**

  * Arithmetic, comparison, logical, bitwise, `in`, `typeof`, `void`, and unary operators on literals and literal-like structures
  * Property access on compile-time objects and arrays (`{a: 1}.a`, `[10, 20][1]`, etc.)
  * Simplification of template literals when interpolated expressions are constants

* **Branch and control-flow simplification**

  * `if` / `?:` where the condition is statically known
  * `while (false) { ... }` is removed
  * `switch (CONST)` is reduced to the matching case (up to `break`)
  * Control-flow aware flattening: code after `return`, `throw`, `break`, or `continue` in a block is dropped

* **Compile-time environment**

  * Inject **constants** via `options.values` (e.g. `ENV`, feature flags, numeric thresholds)
  * Register **compile-time functions** via `options.functions`, evaluated only when all arguments are statically known
  * Perform object-method calls on compile-time objects when both receiver and arguments are static

* **Macros and inlining**

  * AST-level **macros** via `options.macroes`

    * String macros with `$0`, `$1`, ... placeholders for argument ASTs
    * Function macros that receive AST nodes and return an AST

  * Simple automatic **function inlining**:

    * Single-`return` functions
    * Parameters used at most once (to avoid duplicating side effects)
    * Converted to macros and expanded at call sites

* **Safety checks**

  * Attempts to mutate compile-time constants (e.g. `++CONST`, `delete CONST`, assigning to a literal, mutating a literal object/array) throw with a useful error message and line/column information
  * Referencing compile-time functions or macros as plain values (without calling them) is rejected
  * If a property lookup on a compile-time object is resolvable but the property is missing, an error is raised instead of silently continuing

## Installation

```bash
npm install --save-dev mytacism
```

## Basic usage

```js
var mytacism = require('mytacism')

var source = '1 + 1'
var result = mytacism(source)

console.log(result.code) // 2
```

`mytacism(source, options)` parses the source code, walks the AST, applies any static evaluations it can, and returns the result of `recast.print` (typically an object with a `code` property and optional source map).

## Injecting compile-time values

Use `options.values` to substitute constants and simplify code that depends on them:

```js
var mytacism = require('mytacism')

var source = `
if (ENV === 'production') {
  enableAnalytics()
} else {
  enableDebugPanel()
}
`

var result = mytacism(source, {
  values: { ENV: 'production' }
})

console.log(result.code)
// enableAnalytics()
```

The `ENV` identifier is replaced with a literal, the `if` condition becomes a literal, and the unused branch can be discarded.

## Compile-time functions

You can register pure helper functions to be executed at build time when all arguments are static:

```js
var mytacism = require('mytacism')

var source = `
const timeoutMs = secondsToMs(30)
`

var result = mytacism(source, {
  functions: {
    secondsToMs: function (s) { return s * 1000 }
  }
})

console.log(result.code)
// const timeoutMs = 30000
```

If any argument to a compile-time function cannot be resolved statically, Mytacism throws an error rather than guessing.

## Macros

Mytacism also supports simple AST macros via `options.macroes`.

### String macros

String macros treat the macro body as source code that will be parsed and expanded. Arguments are available as `$0`, `$1`, etc.:

```js
var mytacism = require('mytacism')

var source = `
assert(user != null, "user is required")
`

var result = mytacism(source, {
  macroes: {
    assert: 'if (!$0) throw new Error($1)'
  }
})

console.log(result.code)
// if (user == null) throw new Error("user is required")
```

### Function macros

Function macros receive the call-site argument AST nodes and return an AST node (or `undefined` to remove the call entirely). Mytacism then walks whatever you return as part of the main tree.

This makes it possible to build small, specialized compile-time transforms without writing a full recast visitor by hand.

## Automatic inlining

Mytacism can automatically turn simple functions into macros and inline them:

* Function declarations (and exported function declarations)
* Exactly one `return` statement in the body
* Parameters used at most once

For example:

```js
function double(x) {
  return x * 2
}

const result = double(21)
```

can be transformed into:

```js
const result = 42
```

If a function doesn't meet these constraints (multiple returns, reused parameters, etc.) it is left alone.

## AST-level API

If you already have an AST or need to integrate Mytacism into a larger transform pipeline, you can use the AST API:

* `processAST(code, options)` - parse source and return a transformed `Program` node instead of printed code
* `walk(node, context)` - internal walker exposed for advanced use; you can call it on subtrees if you know what you're doing

## How it works (in brief)

1. Parse the input with `recast.parse`, producing an ESTree-compatible AST.
2. Recursively walk the tree:

   * When an expression can be fully resolved from literals, `options.values`, compile-time functions, or macros, replace it with a literal (or other AST) via `valueToNode`.
   * When branch conditions and switch discriminants become literals, keep only the reachable path.
   * Track simple functions that are safe to inline and convert them into macros on a second pass.
   * Enforce safety rules (no mutating compile-time constants, no treating compile-time helpers as values).
3. Print the transformed AST with `recast.print`, preserving as much original structure and source mapping as recast allows.

## Limitations and safety

* Only a restricted subset of JavaScript is evaluated statically. Anything that can't be proven safe and deterministic is left as-is.
* Mutating compile-time constants (or their literal objects/arrays) is rejected with an error.
* Unknown node types are not transformed; they are left in place and may emit a warning.
* This is not a full optimizer or bundler. It focuses on expression-level simplification, simple branch trimming, and small macros/inlining, not on whole-program analysis or tree-shaking modules.

## License

MIT. See the `LICENSE` file for details.
