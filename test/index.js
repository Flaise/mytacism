import assert from 'power-assert'
import {default as process, processAST} from '../src'
import {types} from 'recast'

suite('mytacism')


const options = Object.freeze({
    values: {
        num: 1,
        obj: {x: {y: 39}},
        arr: [9, 'a'],
        str: "red",
        shallowHash: {a: 1, b: 2},
        nestedArr: {x: ['b', null]},
    },
    functions: {
        func: (a) => a + 1,
        func2: (a, b) => a + b,
        returnsUndefined: () => undefined,
    },
    macroes: {
        mac: (a) => types.builders.ifStatement(
            a,
            types.builders.expressionStatement(
                types.builders.assignmentExpression('+=', a, types.builders.literal(1))
            )
        ),
        macAddition: (a, b) => processAST('A + B', {asts: {A: a, B: b}}),
        macShortcut: '$0 + $1',
        mac2: 'u(); t()',
        empty: () => undefined,
        functionBody: (a) => a.body,
    },
    asts: {
        branch: 'if(n) w();',
        numAST: '20'
    }
})


for(let pair of [
    `1`,
    '0',
    'Infinity',
    '-Infinity',
    'undefined',
    'null',
    `"asdf"`,
    '1.0',
    '1.5',
    'NaN',
    
    `a`,
    `asdf`,
    `wqer_oiup`,
    [`num`, `1`],
    [`num; num;`, `1; 1;`],
    
    '-1',
    '-1.5',
    '-a',
    [`-num`, '-1'],
    
    [`1 + 1`, `2`],
    [`5 / 10`, `0.5`],
    [`5 * 10`, `50`],
    [`1 + 5 * 10`, `51`],
    [`5 % 2`, `1`],
    [`1 - 3`, `-2`],
    
    [`num + 1`, `2`],
    [`str + 1`, `"red1"`],
    [`str + "a"`, `"reda"`],
    [`str + num`, `"red1"`],
    
    `a(1); b(2);`,
    [`a(1); 1 + 1;`, `a(1); 2;`],
    ['func(1)', '2'],
    [`func2(3, 'a')`, `"3a"`],
    [`func2('r', 3 - 2)`, `"r1"`],
    
    `let a = 1`,
    `var a = 1`,
    `const a = 1`,
    [`let a = func(1)`, 'let a = 2'],
    [`var a = func(1)`, 'var a = 2'],
    [`const a = func(1)`, 'const a = 2'],
    ['let r = func(1)', 'let r = 2'],
    [`let r = func2(3, 'a')`, `let r = "3a"`],
    
    [`{}`, ``],
    [`;`, ``],
    [`;;`, ``],
    
    [`if(true) {}`, ``],
    [`if( true )  ;`, ``],
    `if(a) {}`,
    
    [`if(num === 1) a`, `a`],
    [`if(num !== 2 && a) { throw new Error() }`, `throw new Error()`],
    [`if(num == 1) { a }`, `a`],
    [`if(num != 1 || a) { throw new Error() }`, `if(a) { throw new Error() }`],
    
    `(b || [])[1]`,
    
    [`true && b`, `true`],
    [`false && b`, `b`],
    
    `if(a === 1) {}`,
    `if(a !== 1) { throw new Error() }`,
    `if(a == 1) {}`,
    `if(a != 1) { throw new Error() }`,
    
    `a > b`,
    [`num > b`, `1 > b`],
    [`num > 10`, `false`],
    [`num < 2`, `true`],
    [`num + num >= 2`, `true`],
    [`2 <= num + num`, `true`],
    
    // NOTE: This might be a bug in recast@0.10.34 - it's supposed to preserve formatting
    ['if(a);else;', "if (a)\n  ;"],
    
    `if(a);else a;`,
    ['if(a){} else {;}', 'if(a){} else {}'],
    
    [`if(true) 1;`, `1;`],
    [`if(false) 1;`, ``],
    [`true? 1: 0`, `1`],
    [`false? 1: 0`, `0`],
    
    `({})`,
    `({a: 2})`,
    `({r: 's'})`,
    ['({a: num})', '({a: 1})'],
    ['({a: {b: num}})', '({a: {b: 1}})'],
    '({"a": -1})',
    '({[r]: "qwer"})',
    ['( {[1 + 1]: d} )', '( {[2]: d} )'],
    ['( {["asdf" + num]: num} )', '( {["asdf1"]: 1} )'],
    
    '() => {}',
    '() => 1',
    '() => a',
    ['() => num', '() => 1'],
    'a => a',
    'num => a',
    ['a => num', 'a => 1'],
    
    `function r() {}`,
    `function a(n) {}`,
    `function q(num) {}`,
    `function q() { -5 }`,
    `function q(num) { 1 }`,
    `function q() { return 5 }`,
    [`function q() { return 5 + 1 }`, `function q() { return 6 }`],
    [`function q() { num }`, `function q() { 1 }`],
    [`function q() { return -num }`, `function q() { return -1 }`],
    `let q = function q() {}`,
    `let q = function() {}`,
    [`let q = function() { return num + 1 }`, `let q = function() { return 2 }`],
    
    `function* r() {}`,
    `function* a(n) {}`,
    `function* q(num) {}`,
    `function* q() { -5 }`,
    `function* q(num) { 1 }`,
    `function* q() { return 5 }`,
    [`function* q() { return 5 + 1 }`, `function* q() { return 6 }`],
    [`function* q() { num }`, `function* q() { 1 }`],
    [`function* q() { return -num }`, `function* q() { return -1 }`],
    `let q = function* q() {}`,
    `let q = function*() {}`,
    [`let q = function*() { return num + 1 }`, `let q = function*() { return 2 }`],
    
    `function* r() { yield 3 }`,
    [`function* r() { yield 3 - num }`, `function* r() { yield 2 }`],
    `function* r(werw, eois, jlksdc) { return yield "asdf" }`,
    [`function* r() { return yield "asdf" + num }`, `function* r() { return yield "asdf1" }`],
    
    `a = 1`,
    `a = 3`,
    `a = "asdf"`,
    `a += 2`,
    [`a += num`, `a += 1`],
    [`a -= num - 3`, `a -= -2`],
    `a(r *= 3)`,
    [`if(n %= num) { b /= num / 4 }`, `if(n %= 1) { b /= 0.25 }`],
    
    [`({a: num})`, `({a: 1})`],
    [`({a: {a: num}})`, `({a: {a: 1}})`],
    `(a.r)`,
    `(a["2"])`,
    [`(a[num])`, `(a[1])`],
    [`(a[num + 1])`, `(a[2])`],
    `(a.num)`,
    `(a.obj)`,
    
    `k.a = 1`,
    `k["qwer"] = 1`,
    [`k[2 + 2] -= 3`, `k[4] -= 3`],
    
    [`obj`, "({\n  \"x\": {\n    \"y\": 39\n  }\n})"],
    
    `q? a: b`,
    [`num + a ? r: s`, `1 + a ? r: s`],
    
    `delete a`,
    `delete a.a`,
    `delete a[1]`,
    [`delete a[num]`, `delete a[1]`],
    
    `[]`,
    `[b, r, 3, 0.25]`,
    [`[num]`, `[1]`],
    [`[1 + 1, 3]`, `[2, 3]`],
    
    [`func(num)`, `2`],
    [`func2(str, num)`, `"red1"`],
    [`func2(func(str), -num)`, `"red1-1"`],
    
    `import 'y'`,
    `import * as y from 'y'`,
    `import y from 'y'`,
    `import {a} from 'y'`,
    ` import {a, b} from 'y'`,
    `import {a as b} from 'y'`,
    `import {default as fault} from 'y'`,
    
    `if(a) { import 'y' }`,
    [`if(num) { import 'y' }`, `import 'y'`],
    [`if(num === 0) { import 'y' }`, ``],
    [`if(num === 0) { import 'y' } else { import 'z' }`, `import 'z'`],
    [`if(true) { a(); b(); }`, `a();b();`],
    
    `return`,
    `return 1`,
    [`return num`, `return 1`],
    
    `~a`,
    [`~1`, `-2`],
    `a ^ b`,
    `a ^ 9`,
    [`num ^ 3`, `2`],
    [`num & 2`, `0`],
    [`num & 3`, `1`],
    [`0 ||str`, `"red"`],
    
    [`a && false`, `false`],
    [`a && true`, `true`],
    [`1 && false`, String(1 && false)],
    [`1 && true`, String(1 && true)],
    [`0 && false`, String(0 && false)],
    [`0 && true`, String(0 && true)],
    
    `!a`,
    [`!true`, `false`],
    [`!num`, `false`],
    
    `for(let i = 0; i < r.length; i += 1) {}`,
    `for(let i = 0; i < r.length; i++) {}`,
    `for(let i = r.length - 1; i >= 0; i -= 1) {}`,
    `for(let i = r.length - 1; i >= 0; i--) {}`,
    [`for(let i = num; i < num; i += num) {}`, `for(let i = 1; i < 1; i += 1) {}`],
    
    [`for(;;);`, `for (; ; )\n  ;`],
    
    `let i;`,
    `var i`,
    `const i = 1`,
    `let i, j, b`,
    
    [`func('')`, `"1"`],
    [`func({})`, `"${String({} + 1)}"`],
    [`obj.x.y`, `39`],
    [`arr[0]`, `9`],
    [`arr[1]`, `"a"`],
    [`arr`, `[9, "a"]`],
    [`arr[a]`, `[9, "a"][a]`],
    [`shallowHash.a`, `1`],
    [`shallowHash["a"]`, `1`],
    [`[4][0]`, `4`],
    [`[4, 3].length`, `2`],
    [`nestedArr.x`, `["b", null]`],
    [`nestedArr.x[1]`, `null`],
    
    [`branch`, `if(n) w();;`],
    
    [`mac(r)`, `if (r)\n  r += 1;;`],
    [`macAddition(a, b)`, `a + b`],
    [`1 + macAddition(a, b)`, `1 + a + b`],
    [`macAddition(1, b)`, `1 + b`],
    [`macAddition(1, 2)`, `3`],
    [`macAddition(a(1), b(2))`, `a(1) + b(2)`],
    [`func(macAddition(1, 2))`, `4`],
    [`macAddition(func(1), 2)`, `4`],
    
    [`macShortcut(1, 2)`, `3;`],
    [`macShortcut(a, b)`, `a + b;`],
    
    [`mac2()`, `u();t()`],
    [`if(b) mac2()`, `if (b) {\n  u();t()\n}`],
    
    `export function a() {}`,
    `export default function a() {}`,
    `export const a = 2`,
    [`export const a = 1 + 1`, `export const a = 2`],
    
    `this`,
    `this.a`,
    `this[1]`,
    `this['1']`,
    [`this[1 + 1]`, `this[2]`],
    
    `for(let z of b) a()`,
    [`for(let z of b) a(1 + 1)`, `for(let z of b) a(2)`],
    
    `for(let z in b) a()`,
    [`for(let z in b) a(1 + 1)`, `for(let z in b) a(2)`],
    
    `for(;;) { continue; }`,
    `for(let z = 1, b = 2;;) {}`,
    
    `while(true) {}`,
    [`while(1 + 1) {}`, `while(2) {}`],
    [`while(false) { a() }`, ``],
    `while(a) { a() }`,
    [`while(a) { a(1 - 1); }`, `while(a) { a(0); }`],
    `while(a) { continue; }`,
    `while(a) { break; }`,
    
    `do { } while(b);`,
    [`do {num} while(num);`, `do {1} while(1);`],
    
    `a(...asdf)`,
    
    '``',
    '`asdf`',
    '`${a}`',
    ['`${-3}`', '`-3`'],
    ['`${num}`', '`1`'],
    ['`a - ${num} + 3`', '`a - 1 + 3`'],
    ['`${num}${"a"}`', '`1a`'],
    ['`${a} ${1}`', '`${a} 1`'],
    "`${a} 1`",
    
    [`empty()`, ``],
    
    `try {} catch(e) {}`,
    `try { a(); } catch(err) {}`,
    [`try { a(num) } catch(err) { a(err, num) }`, `try { a(1) } catch(err) { a(err, 1) }`],
    [`try {} finally { num }`, `try {} finally { 1 }`],
    
    `let {a, b} = n()`,
    `const {a, b} = n()`,
    `var {a: d, b: z} = p()`,
    `let [a, b] = n()`,
    `const [a, b] = n()`,
    
    `switch(b) {}`,
    `switch(b) { case a: break; }`,
    [`switch(b) { case num: break; }`, `switch(b) { case 1: break; }`],
    [`switch(b + num) { case r: return 3; case "asdf": return num + 1 }`,
     `switch(b + 1) { case r: return 3; case "asdf": return 2 }`],
    [`switch(num) { case 1: throw new Error(); }`, `throw new Error();`],
    [`switch(1) { case 1: a(); case 2: b(); break; }`, `a();b();`],
    [`switch(1) { case 1: for(;;) break; case 2: b(); break; }`, `for(;;) break;b();`],
    `switch(b.c()) { case 0: break; }`,
    `switch(b.c(2)) { case 0: break; }`,
    `switch(r) { default: break; }`,
    [`switch(true) { case true: a(); default: b(); }`, `a();b();`],
    
    [`functionBody(() => 1)`, `1`],
    [`functionBody(function() { return 1 })`, `return 1`],
    [`functionBody(() => {if(a) b()})\nfunctionBody(() => {if(b) a()})`, `if(a) b()\nif(b) a()`],
    
    [`[1].concat([2])`, `[1, 2]`],
    `[1].concat`,
    [`'a' + 'b'`, `"ab"`],
    
    [`arr.concat`, `[9, "a"].concat`],
    [`arr.concat([1])`, `[9, "a", 1]`],
    
    `void a()`,
    [`void a`, `void 0`],
    [`void (1 + 1)`, `void (0)`],
    [`void num`, `void 0`],
    
    `typeof a`,
    [`typeof "a"`, `"string"`],
    [`typeof 1`, `"number"`],
    [`typeof {}`, `"object"`],
    [`typeof null`, `"object"`],
    [`typeof []`, `"object"`],
    [`typeof true`, `"boolean"`],
    `typeof void a()`,
    
    [`returnsUndefined()`, `void 0`],
    [`typeof returnsUndefined()`, `"undefined"`],
    
    `a in b`,
    [`a in num`, `a in 1`],
    [`'asdf' in obj`, `false`],
    [`0 in arr`, `true`],
    
    `a instanceof b`,
    `a instanceof Object`,
    
    `class K {\nconstructor(r) {}\nasdf(r, n) {}\n}`,
    [`class K {\nconstructor(r) {}\nasdf(r, n) {return num}\n}`,
     `class K {\nconstructor(r) {}\nasdf(r, n) {return 1}\n}`],
    [`class K {[num]() { throw e }}`, `class K {[1]() { throw e }}`],
    
    `1,2`,
    `a(),b()`,
    [`a(num), b()`, `a(1), b()`],

    [`function a() { return 1; return 2; }`, `function a() {\n  return 1;\n}`],
    [`if(a) { throw 1; a = 2 } a = 3`, `if(a) {\n  throw 1;\n} a = 3`],

    [`var d = numAST`, `var d = 20`],
    [`var d = numAST + 1`, `var d = 21`],

    [`function a(b) { return b + 1 }\na(1)`, `function a(b) { return b + 1 }\n2`],
    `function a(b) { return b + b }\na(1)`,
    [`function a(b) { return 9 }\na(2)`, `function a(b) { return 9 }\n9`],
    [`function a(b) { return b + 1 }\nfunction c(d) { return a(d) }\nc(4)`,
     `function a(b) { return b + 1 }\nfunction c(d) { return d + 1 }\n5`]
]) {
    let [source, expectation] = (Array.isArray(pair)? pair: [pair, pair])
    expectation = expectation.trim()
    test(`[   ${source}   ] `, () => {
        const result = process(source, options).code.trim()
        assert(result === expectation)
    })
}

for(let [source, validator] of [
    ['func', /referenced but not called/],
    ['func; num;', /referenced but not called/],
    [`num += 1`, /Can't assign to/],
    [`num = 1`, /Can't assign to/],
    [`delete num`, /Can't delete/],
    [`delete func`],
    [`delete num.a`],
    [`delete obj`, /Can't delete/],
    [`delete obj.a`, /Can't mutate/],
    [`delete obj[1]`, /Can't mutate/],
    [`delete arr`, /Can't delete/],
    [`delete arr.a`, /Can't mutate/],
    [`delete arr[1]`, /Can't mutate/],
    [`delete arr[num]`, /Can't mutate/],
    [`num++`, /Can't mutate/],
    [`num--`, /Can't mutate/],
    [`++num`, /Can't mutate/],
    [`--num`, /Can't mutate/],
    [`a.1`],
    [`arr.1`],
    [`mac(num)`, /Can't assign to/],
    [`func(a)`, /Can't evaluate/],
    [`shallowHash.c`, /has no property/],
    [`null.c`, /has no property/],
]) {
    test(`[   ${source}   ] `, () => assert.throws(() => process(source, options), validator))
}


test('source maps', () => {
    const result = process(
        `num\n"asdf"`,
        Object.assign({}, options, {sourceFileName: 'file.js', sourceMapName: 'file.js.map'})
    )
    assert(result.code === `1\n"asdf"`)
    assert(result.map)
})
