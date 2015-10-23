import {parse, print, types} from 'recast'
import binaryExpression from './binary-expression'
import logicalExpression from './logical-expression'

export default function process(code, options) {
    options = options || {}
    const ast = parse(code, options)
    walk(ast, options)
    return print(ast, options)
}

const FAIL = {}

const unaryOperators = {
    '+': (a => +a),
    '-': (a => -a),
    '~': (a => ~a),
    '!': (a => !a),
}


function valueToNode(value) {
    if(value && typeof value === 'object') {
        const nodes = []
        for(let key of Object.keys(value)) {
            nodes.push(types.builders.property('init',
                                               types.builders.literal(key),
                                               valueToNode(value[key])))
        }
        return types.builders.objectExpression(nodes)
    }
    else {
        return types.builders.literal(value)
    }
}

function raiseError(node, message) {
    message = message || 'Unknown error.'
    message += ` (line ${node.loc.start.line}, column ${node.loc.start.column})`
    const error = new Error(message)
    error.line = node.loc.start.line
    error.column = node.loc.start.column
    throw error
}

function contextValueToNode(node, options, allowFunctions) {
    if(!options.context || !Object.prototype.hasOwnProperty.call(options.context, node.name))
        return FAIL
    const result = options.context[node.name]
    if(typeof result === 'function') {
        if(allowFunctions)
            return FAIL
        else
            raiseError(node, 'Compile-time function referenced but not called.')
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
            if(!result) {
                node.splice(i, 1)
                i -= 1
            }
            else if(Array.isArray(result.body)) {
                if(result.body.length === 0) {
                    node.splice(i, 1)
                    i -= 1
                }
                else if(result.body.length === 1) {
                    node[i] = result.body[0]
                }
                else {
                    node[i] = result
                }
            }
            else {
                node[i] = result
            }
        }
    }
    else if(node.type === 'EmptyStatement') {
        return undefined
    }
    else if(node.type === 'Literal' || node.type === 'ImportDeclaration') {
        // pass
    }
    else if(node.type === 'File') {
        node.program = walk(node.program, options, trace)
    }
    else if(node.type === 'Program' || node.type === 'BlockStatement'
            || node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration'
            || node.type === 'FunctionExpression') {
        node.body = walk(node.body, options, trace)
    }
    else if(node.type === 'UnaryExpression') {
        if(node.operator === 'delete') {
            if(node.argument.type !== 'Identifier' && node.argument.type !== 'MemberExpression')
                raiseError(node, `Can't delete ${node.argument.type}.`)
            node.argument = walk(node.argument, options, trace)
            if(node.argument.type === 'Literal' || node.argument.type === 'ObjectExpression')
                raiseError(node, "Can't delete compile-time constant.")
            if(node.argument.type === 'MemberExpression') {
                const obj = node.argument.object
                if(obj.type === 'Literal' || obj.type === 'ObjectExpression' || obj.type === 'ArrayExpression')
                    raiseError(node, "Can't mutate compile-time constant or literal. Assign a copy to a variable first.")
            }
        }
        else {
            node.argument = walk(node.argument, options, trace)
            
            if(node.argument.type === 'Literal') {
                const operator = unaryOperators[node.operator]
                if(operator)
                    return types.builders.literal(operator(node.argument.value))
                else
                    console.warn(`Unknown unary operator`, node)
            }
        }
    }
    else if(node.type === 'UpdateExpression') {
        node.argument = walk(node.argument, options, trace)
        
        if(node.argument.type === 'Literal')
            raiseError(node, "Can't mutate compile-time constant or literal. Assign a copy to a variable first.")
    }
    else if(node.type === 'BinaryExpression') {
        node.left = walk(node.left, options, trace)
        node.right = walk(node.right, options, trace)
        return binaryExpression(node)
    }
    else if(node.type === 'LogicalExpression') {
        node.left = walk(node.left, options, trace)
        node.right = walk(node.right, options, trace)
        return logicalExpression(node)
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
        if(node.init)
            node.init = walk(node.init, options, trace)
    }
    else if(node.type === 'IfStatement' || node.type === 'ConditionalExpression') {
        node.test = walk(node.test, options, trace)
        if(node.consequent.type !== 'EmptyStatement') // keeps original source map
            node.consequent = walk(node.consequent, options, trace)
        if(node.alternate)
            node.alternate = walk(node.alternate, options, trace)
            
        if(node.test.type === 'Literal') {
            if(node.test.value)
                return node.consequent
            else
                return node.alternate
        }
    }
    else if(node.type === 'ThrowStatement' || node.type === 'YieldExpression') {
        node.argument = walk(node.argument, options, trace)
    }
    else if(node.type === 'ReturnStatement') {
        if(node.argument)
            node.argument = walk(node.argument, options, trace)
    }
    else if(node.type === 'ObjectExpression') {
        node.properties = walk(node.properties, options, trace)
    }
    else if(node.type === 'Property') {
        node.key = walk(node.key, options, trace)
        node.value = walk(node.value, options, trace)
    }
    else if(node.type === 'AssignmentExpression') {
        if(node.left.type !== 'Identifier' && node.left.type !== 'MemberExpression')
            raiseError(node, `Can't assign to ${node.left.type}.`)
        node.left = walk(node.left, options, trace)
        if(node.left.type === 'Literal')
            raiseError(node, "Can't assign to compile-time constant.")
        
        node.right = walk(node.right, options, trace)
    }
    else if(node.type === 'MemberExpression') {
        node.object = walk(node.object, options, trace)
        if(node.computed)
            node.property = walk(node.property, options, trace)
    }
    else if(node.type === 'ArrayExpression') {
        node.elements = walk(node.elements, options, trace)
    }
    else if(node.type === 'ForStatement') {
        node.init = walk(node.init, options, trace)
        node.test = walk(node.test, options, trace)
        node.update = walk(node.update, options, trace)
        node.body = walk(node.body, options, trace)
    }
    else {
        console.log('unknown type\n', node, '\n', trace)
    }
    return node
}
