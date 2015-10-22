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

function objectEquality(objCodeA, objCodeB) {
    // console.log(arguments)
    assert(arguments.length === 2)
    
    // const a = eval(`(${objCodeA})`)
    const a = eval(objCodeA)
    assert(a && typeof a === 'object')
    
    const b = eval(`(${objCodeB})`)
    assert(b && typeof b === 'object')
    
    // console.log(a, b)
    
    assert.deepEqual(a, b)
}

test('literals', () => {
    assert(process(`1`).code === `1`)
    assert(process(`"asdf"`).code === `"asdf"`)
    objectEquality(process(`({})`).code, `{}`)
    objectEquality(process(`({a: 2})`).code, `{a: 2}`)
    objectEquality(process(`({r: 's'})`).code, `{"r": 's'}`)
})

test('arithmetic', () => {
    assert(process(`1 + 1`).code === `2`)
    assert(process(`5 / 10`).code === `0.5`)
    assert(process(`5 * 10`).code === `50`)
    assert(process(`1 + 5 * 10`).code === `51`)
    assert(process(`5 % 2`).code === `1`)
    assert(process(`1 - 3`).code === `-2`)
})

test('function', () => {
    assert(process(`function r() {}`).code === `function r() {}`)
})

test('multiple statements', () => {
    assert(process(`a(1); b(2);`).code === `a(1); b(2);`)
    assert(process(`a(1); 1 + 1;`).code === `a(1); 2;`)
})

test('simple substitution', () => {
    assert(process(`num`, options).code === `1`)
    objectEquality(process(`obj`, options).code, `{x: {y: 39}}`)
    assert(process(`num; num;`, options).code === `1; 1;`)
})

test('statically called function', () => {
    assert(process('func(1)', options).code === '2')
    assert(process('let r = func(1)', options).code === 'let r = 2')
})

test('function called statically with 2 arguments', () => {
    assert(process(`func2(3, 'a')`, options).code === `"3a"`)
    assert(process(`let r = func2(3, 'a')`, options).code === `let r = "3a"`)
})

test('variable declarations', () => {
    assert(process(`let a = 1`, options).code === 'let a = 1')
    assert(process(`var a = 1`, options).code === 'var a = 1')
    assert(process(`const a = 1`, options).code === 'const a = 1')
    
    assert(process(`let a = func(1)`, options).code === 'let a = 2')
    assert(process(`var a = func(1)`, options).code === 'var a = 2')
    assert(process(`const a = func(1)`, options).code === 'const a = 2')
})

test("can't have bare compile-time function", () => {
    assert.throws(() => process('func', options))
})

test.skip('trim dead code', () => {
    for(let expression in ['1', '1 + 1', '-1', '-a', '1;2;3;', 'num', 'obj'])
        assert(process(expression, merge(options, {trimDeadCode: true})).code === '')
})

test('source maps', () => {
    const result = process(`num\n"asdf"`, merge(options, {sourceFileName: 'file.js', sourceMapName: 'file.js.map'}))
    assert(result.code === `1\n"asdf"`)
    assert(result.map)
    console.log(result.map)
})
