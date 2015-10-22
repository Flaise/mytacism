import {parse, print, types} from 'recast'

export default function process(code, options) {
    options = options || {}
    const ast = parse(code, options)
    walk(ast, options)
    return print(ast, options)
}

const binaryOperators = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '/': (a, b) => a / b,
    '*': (a, b) => a * b,
    '%': (a, b) => a % b,
    '===': (a, b) => a === b,
    '!==': (a, b) => a !== b
}
const unaryOperators = {
    '+': (a => +a),
    '-': (a => -a)
}

function valueToNode(value) {
    if(value && typeof value === 'object') {
        const nodes = []
        for(let key of Object.keys(value)) {
            nodes.push(types.builders.property(
                'init',
                types.builders.literal(key),
                valueToNode(value[key])
            ))
        }
        return types.builders.objectExpression(nodes)
    }
    else {
        return types.builders.literal(value)
    }
}

const FAIL = {}

function contextValueToNode(node, options, allowFunctions) {
    if(!options.context || !Object.prototype.hasOwnProperty.call(options.context, node.name))
        return FAIL
    const result = options.context[node.name]
    if(typeof result === 'function') {
        if(allowFunctions)
            return FAIL
        else
            throw new Error(`Compile-time function referenced but not called at line ` +
                            `${node.loc.start.line}, column ${node.loc.start.column}`)
    }
    return valueToNode(result)
}

function contextValue(node, options) {
    if(node.type !== 'Identifier')
        return FAIL
    if(!options.context || !Object.prototype.hasOwnProperty.call(options.context, node.name))
        return FAIL
    return options.context[node.name]
}

function literalsToValues(nodes) {
    const result = []
    for(let node of nodes) {
        if(node.type !== 'Literal')
            return FAIL
        result.push(node.value)
    }
    return result
}

function walk(node, options, trace, allowContextFunctions) {
    if(!trace)
        trace = [node.type || '<array>']
    else
        trace = trace.concat([node.type || '<array>'])
    
    if(Array.isArray(node)) {
        for(let i = 0; i < node.length; i += 1) {
            const result = walk(node[i], options, trace)
            if(result) {
                node[i] = result
            }
            else {
                node.splice(i, 1)
                i -= 1
            }
        }
    }
    else if(node.type === 'Literal' || node.type === 'FunctionDeclaration' || node.type === 'EmptyStatement') {
        // pass
    }
    else if(node.type === 'File')
        node.program = walk(node.program, options, trace)
    else if(node.type === 'Program' || node.type === 'BlockStatement')
        node.body = walk(node.body, options, trace)
    else if(node.type === 'UnaryExpression') {
        node.argument = walk(node.argument, options, trace)
        
        if(node.argument.type === 'Literal') {
            const operator = unaryOperators[node.operator]
            if(operator)
                return types.builders.literal(operator(node.argument.value))
            else
                console.warn(`Unknown unary operator "${node.operator}"`)
        }
    }
    else if(node.type === 'BinaryExpression') {
        node.left = walk(node.left, options, trace)
        node.right = walk(node.right, options, trace)
        
        if(node.left.type === 'Literal' && node.right.type === 'Literal') {
            const operator = binaryOperators[node.operator]
            if(operator)
                return types.builders.literal(operator(node.left.value, node.right.value))
            else
                console.warn(`Unknown binary operator "${node.operator}"`)
        }
    }
    else if(node.type === 'ExpressionStatement') {
        node.expression = walk(node.expression, options, trace)
    }
    else if(node.type === 'Identifier') {
        const result = contextValueToNode(node, options, allowContextFunctions)
        if(result !== FAIL)
            return result
    }
    else if(node.type === 'CallExpression' || node.type === 'NewExpression') {
        node.arguments = walk(node.arguments, options, trace)
        node.callee = walk(node.callee, options, trace, true)
        
        const args = literalsToValues(node.arguments)
        const func = contextValue(node.callee, options)
        
        if(args !== FAIL && func !== FAIL) {
            return valueToNode(func(...args))
        }
    }
    else if(node.type === 'VariableDeclaration') {
        node.declarations = walk(node.declarations, options, trace)
    }
    else if(node.type === 'VariableDeclarator') {
        node.id = walk(node.id, options, trace)
        node.init = walk(node.init, options, trace)
    }
    else if(node.type === 'IfStatement') {
        node.test = walk(node.test, options, trace)
        node.consequent = walk(node.consequent, options, trace)
        if(node.alternate)
            node.alternate = walk(node.alternate, options, trace)
    }
    else if(node.type === 'ThrowStatement') {
        node.argument = walk(node.argument, options, trace)
    }
    else if(node.type === 'ObjectExpression') {
        node.properties = walk(node.properties, options, trace)
    }
    else if(node.type === 'Property') {
        node.key = walk(node.key, options, trace)
        node.value = walk(node.value, options, trace)
    }
    else {
        console.log('unknown type\n', node, '\n', trace)
    }
    return node
}
