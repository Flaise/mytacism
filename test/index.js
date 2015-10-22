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
    
    [`num`, `1`],
    [`num; num;`, `1; 1;`],
    
    '-1',
    '-1.5',
    '-a',
    [`-num`, '-1'],
    
    `let a = 1`,
    [`1 + 1`, `2`],
    [`5 / 10`, `0.5`],
    [`5 * 10`, `50`],
    [`1 + 5 * 10`, `51`],
    [`5 % 2`, `1`],
    [`1 - 3`, `-2`],
    `function r() {}`,
    `a(1); b(2);`,
    [`a(1); 1 + 1;`, `a(1); 2;`],
    `let a = 1`,
    `var a = 1`,
    `const a = 1`,
    [`let a = func(1)`, 'let a = 2'],
    [`var a = func(1)`, 'var a = 2'],
    [`const a = func(1)`, 'const a = 2'],
    ['func(1)', '2'],
    ['let r = func(1)', 'let r = 2'],
    [`func2(3, 'a')`, `"3a"`],
    [`let r = func2(3, 'a')`, `let r = "3a"`],
    [`func2('r', 3 - 2)`, `"r1"`],
    
    `if(true) {}`,
    `if(a) {}`,
    [`if(num === 1) {}`, `if(true) {}`],
    [`if(num !== 1) { throw new Error() }`, `if(false) { throw new Error() }`],
    'if(true);else;',
    'if(false){} else {;}',
    `;`,
    
    `({})`,
    `({a: 2})`,
    `({r: 's'})`,
    ['({a: num})', '({a: 1})'],
    ['({a: {b: num}})', '({a: {b: 1}})'],
    '({"a": -1})',
    '({[r]: "qwer"})',
    ['( {[1 + 1]: d} )', '( {[2]: d} )'],
    ['( {["asdf" + num]: num} )', '( {["asdf1"]: 1} )']
]) {
    if(Array.isArray(pair)) {
        const [source, expectation] = pair
        test(source, () => assert(process(source, options).code === expectation))
    }
    else {
        const source = pair
        test(source, () => assert(process(source, options).code === source))
    }
}

for(let [source, validator] of [
    ['func', /Compile-time function referenced but not called/],
    ['func; num;', /Compile-time function referenced but not called/]
]) {
    assert.throws(() => process(source, options), validator)
}


function objectEquality(objCodeA, objCodeB) {
    assert(arguments.length === 2)
    
    const a = eval(objCodeA)
    assert(a && typeof a === 'object')
    
    const b = eval(`(${objCodeB})`)
    assert(b && typeof b === 'object')
    
    assert.deepEqual(a, b)
}

test('simple substitution', () => {
    objectEquality(process(`obj`, options).code, `{x: {y: 39}}`)
})


test('source maps', () => {
    const result = process(`num\n"asdf"`, merge(options, {sourceFileName: 'file.js', sourceMapName: 'file.js.map'}))
    assert(result.code === `1\n"asdf"`)
    assert(result.map)
    // console.log(result.map)
})
