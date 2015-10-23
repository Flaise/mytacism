import assert from 'power-assert'
import process from '../src'
import {merge} from 'ramda'


suite('mytacism')

const options = Object.freeze({
    context: {
        num: 1,
        func: (a) => a + 1,
        func2: (a, b) => a + b,
        obj: {x: {y: 39}},
        arr: [9, 'a'],
        str: "red",
        macro: (a) => `if(${a}) { ${a} += 1 }`
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
    [`if(num !== 2 && a) { throw new Error() }`, `if(a) { throw new Error() }`],
    [`if(num == 1) { a }`, `a`],
    [`if(num != 1 || a) { throw new Error() }`, `if(a) { throw new Error() }`],
    
    `if(a === 1) {}`,
    `if(a !== 1) { throw new Error() }`,
    `if(a == 1) {}`,
    `if(a != 1) { throw new Error() }`,
    
    `a > b`,
    [`num > b`, `1 > b`],
    [`num > 10`, `false`],
    [`num < 2`, `true`],
    [`num + num >= 2`, `true`],
    
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
    `({}.r)`,
    `({}["2"])`,
    [`({}[num])`, `({}[1])`],
    [`({}[num + 1])`, `({}[2])`],
    `({}.num)`,
    `({}.obj)`,
    
    `({}).a = 1`,
    `({})["qwer"] = 1`,
    [`({})[2 + 2] -= 3`, `({})[4] -= 3`],
    
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
    
    `let i;`,
    `var i`,
    `const i = 1`,
]) {
    let source, expectation
    if(Array.isArray(pair)) {
        ;[source, expectation] = pair
    }
    else {
        ;[source, expectation] = [pair, pair]
    }
    const result = process(source, options).code.trim()
    expectation = expectation.trim()
    test(`[   ${source}   ] `, () => assert(result === expectation))
}

for(let [source, validator] of [
    ['func', /Compile-time function referenced but not called/],
    ['func; num;', /Compile-time function referenced but not called/],
    [`num += 1`, /Can't assign to/],
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
]) {
    test(source, () => assert.throws(() => process(source, options), validator))
}


test('source maps', () => {
    const result = process(`num\n"asdf"`, merge(options, {sourceFileName: 'file.js', sourceMapName: 'file.js.map'}))
    assert(result.code === `1\n"asdf"`)
    assert(result.map)
    // console.log(result.map)
})
