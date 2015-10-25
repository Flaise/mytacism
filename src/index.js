import {parse, print, types} from 'recast'
import binaryExpression from './binary-expression'
import logicalExpression from './logical-expression'


export default function process(code, options) {
    options = options || {}
    const ast = parse(code, options)
    walk(ast, options.values || {}, options.functions || {}, options.macroes || {})
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
    if(Array.isArray(value)) {
        return types.builders.arrayExpression(value.map(a => valueToNode(a)))
    }
    else if(value && typeof value === 'object') {
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
    if(node.loc)
        message += ` (line ${node.loc.start.line}, column ${node.loc.start.column})`
    const error = new Error(message)
    if(node.loc) {
        error.line = node.loc.start.line
        error.column = node.loc.start.column
    }
    throw error
}

function contextValueToNode(node, values, functions, macroes) {
    if(Object.prototype.hasOwnProperty.call(functions, node.name))
        raiseError(node, 'Compile-time function referenced but not called.')
    if(Object.prototype.hasOwnProperty.call(macroes, node.name))
        raiseError(node, 'Macro referenced but not called.')
    if(!Object.prototype.hasOwnProperty.call(values, node.name))
        return FAIL
    return valueToNode(values[node.name])
}

function contextValue(node, context) {
    if(node.type !== 'Identifier')
        return FAIL
    if(!Object.prototype.hasOwnProperty.call(context, node.name))
        return FAIL
    return context[node.name]
}

function literalToValue(node) {
    if(node.type === 'Literal')
        return node.value
    else if(node.type === 'ObjectExpression') {
        const result = {}
        for(let prop of node.properties) {
            const key = literalToValue(prop.key)
            if(key === FAIL)
                return FAIL
            const value = literalToValue(prop.value)
            if(value === FAIL)
                return FAIL
            result[key] = value
        }
        return result
    }
    else if(node.type === 'ArrayExpression') {
        const result = []
        for(let element of node.elements) {
            const value = literalToValue(element)
            if(value === FAIL)
                return FAIL
            result.push(value)
        }
        return result
    }
    else
        return FAIL
}

function literalsToValues(nodes) {
    const result = []
    for(let node of nodes) {
        const value = literalToValue(node)
        if(value === FAIL)
            return FAIL
        result.push(value)
    }
    return result
}

function walk(node, values, functions, macroes) {
    if(Array.isArray(node)) {
        for(let i = 0; i < node.length; i += 1) {
            const result = walk(node[i], values, functions, macroes)
            if(!result) {
                node.splice(i, 1)
                i -= 1
            }
            else if(Array.isArray(result.body)) {
                node.splice(i, 1, ...result.body)
                i += result.body.length - 1
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
        node.program = walk(node.program, values, functions, macroes)
    }
    else if(node.type === 'Program' || node.type === 'BlockStatement'
            || node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration'
            || node.type === 'FunctionExpression') {
        node.body = walk(node.body, values, functions, macroes)
    }
    else if(node.type === 'UnaryExpression') {
        if(node.operator === 'delete') {
            if(node.argument.type !== 'Identifier' && node.argument.type !== 'MemberExpression')
                raiseError(node, `Can't delete ${node.argument.type}.`)
            if(node.argument.type === 'MemberExpression') {
                node.argument.object = walk(node.argument.object, values, functions, macroes)
                node.argument.property = walk(node.argument.property, values, functions, macroes)
            }
            else {
                node.argument = walk(node.argument, values, functions, macroes)
            }
            if(node.argument.type === 'Literal' || node.argument.type === 'ObjectExpression'
                    || node.argument.type === 'ArrayExpression')
                raiseError(node, "Can't delete compile-time constant.")
            if(node.argument.type === 'MemberExpression') {
                const obj = node.argument.object
                if(obj.type === 'Literal' || obj.type === 'ObjectExpression'
                        || obj.type === 'ArrayExpression')
                    raiseError(node, "Can't mutate compile-time constant or literal. Assign a " +
                                     "copy to a variable first.")
            }
        }
        else {
            node.argument = walk(node.argument, values, functions, macroes)
            
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
        node.argument = walk(node.argument, values, functions, macroes)
        
        if(node.argument.type === 'Literal')
            raiseError(node, "Can't mutate compile-time constant or literal. Assign a copy to a " +
                             "variable first.")
    }
    else if(node.type === 'BinaryExpression') {
        node.left = walk(node.left, values, functions, macroes)
        node.right = walk(node.right, values, functions, macroes)
        return binaryExpression(node)
    }
    else if(node.type === 'LogicalExpression') {
        node.left = walk(node.left, values, functions, macroes)
        node.right = walk(node.right, values, functions, macroes)
        return logicalExpression(node)
    }
    else if(node.type === 'ExpressionStatement') {
        node.expression = walk(node.expression, values, functions, macroes)
    }
    else if(node.type === 'Identifier') {
        const result = contextValueToNode(node, values, functions, macroes)
        if(result !== FAIL)
            return result
    }
    else if(node.type === 'CallExpression' || node.type === 'NewExpression') {
        node.arguments = walk(node.arguments, values, functions, macroes)
        node.callee = walk(node.callee, values, {}, {})
        
        const func = contextValue(node.callee, functions)
        if(func !== FAIL) {
            const args = literalsToValues(node.arguments)
            if(args === FAIL)
                raiseError(node, `Can't evaluate compile-time function with arguments that don't ` +
                                 `resolve statically.`)
            return valueToNode(func(...args))
        }
        
        const mac = contextValue(node.callee, macroes)
        if(mac !== FAIL) {
            const subNode = mac(...node.arguments)
            if(!subNode)
                return undefined
            return walk(subNode, values, functions, macroes)
        }
    }
    else if(node.type === 'MemberExpression') {
        node.object = walk(node.object, values, functions, macroes)
        if(node.computed)
            node.property = walk(node.property, values, functions, macroes)
        
        let name = FAIL
        if(node.property.type === 'Literal')
            name = node.property.value
        else if(node.property.type === 'Identifier')
            name = node.property.name
            
        const obj = literalToValue(node.object)
        if(name !== FAIL && obj !== FAIL) {
            if(Object.prototype.hasOwnProperty.call(obj, name))
                return valueToNode(obj[name])
            else
                raiseError(node, `${obj} / ${JSON.stringify(obj)} has no property "${name}"`)
        }
    }
    else if(node.type === 'VariableDeclaration') {
        node.declarations = walk(node.declarations, values, functions, macroes)
    }
    else if(node.type === 'VariableDeclarator') {
        node.id = walk(node.id, values, functions, macroes)
        if(node.init)
            node.init = walk(node.init, values, functions, macroes)
    }
    else if(node.type === 'IfStatement' || node.type === 'ConditionalExpression') {
        node.test = walk(node.test, values, functions, macroes)
        if(node.consequent.type !== 'EmptyStatement') // keeps original source map
            node.consequent = walk(node.consequent, values, functions, macroes)
        if(node.alternate)
            node.alternate = walk(node.alternate, values, functions, macroes)
            
        if(node.test.type === 'Literal') {
            if(node.test.value)
                return node.consequent
            else
                return node.alternate
        }
    }
    else if(node.type === 'ThrowStatement' || node.type === 'YieldExpression') {
        node.argument = walk(node.argument, values, functions, macroes)
    }
    else if(node.type === 'ReturnStatement') {
        if(node.argument)
            node.argument = walk(node.argument, values, functions, macroes)
    }
    else if(node.type === 'ObjectExpression') {
        node.properties = walk(node.properties, values, functions, macroes)
    }
    else if(node.type === 'Property') {
        node.key = walk(node.key, values, functions, macroes)
        node.value = walk(node.value, values, functions, macroes)
    }
    else if(node.type === 'AssignmentExpression') {
        if(node.left.type !== 'Identifier' && node.left.type !== 'MemberExpression')
            raiseError(node, `Can't assign to ${node.left.type}.`)
        node.left = walk(node.left, values, functions, macroes)
        if(node.left.type === 'Literal')
            raiseError(node, "Can't assign to compile-time constant.")
        
        node.right = walk(node.right, values, functions, macroes)
    }
    else if(node.type === 'ArrayExpression') {
        node.elements = walk(node.elements, values, functions, macroes)
    }
    else if(node.type === 'ForStatement') {
        if(node.init)
            node.init = walk(node.init, values, functions, macroes)
        if(node.test)
            node.test = walk(node.test, values, functions, macroes)
        if(node.update)
            node.update = walk(node.update, values, functions, macroes)
        node.body = walk(node.body, values, functions, macroes)
    }
    else {
        console.log('unknown type\n', node, '\n')
    }
    return node
}
