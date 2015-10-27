import {parse, print, types} from 'recast'
import binaryExpression from './binary-expression'
import logicalExpression from './logical-expression'


export function process(code, options) {
    return print(processAST(code, options), options)
}
export default process

export function processAST(code, options) {
    options = options || {}
    const asts = {}
    if(options.asts)
        for(let key of Object.keys(options.asts)) {
            if(typeof options.asts[key] === 'string')
                asts[key] = processAST(options.asts[key])
            else
                asts[key] = options.asts[key]
                
            if(asts[key].type === 'Program') {
                if(asts[key].body.length === 1)
                    asts[key] = asts[key].body[0]
                else if(asts[key].body.length > 1)
                    asts[key].type = 'BlockStatement'
            }
        }
    
    const ast = parse(code, options)
    walk(ast, {
        values: options.values || {},
        functions: options.functions || {},
        macroes: options.macroes || {},
        asts
    })
    return ast.program
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

function contextValueToNode(node, context) {
    if(Object.prototype.hasOwnProperty.call(context.functions, node.name))
        raiseError(node, 'Compile-time function referenced but not called.')
    if(Object.prototype.hasOwnProperty.call(context.macroes, node.name))
        raiseError(node, 'Macro referenced but not called.')
    if(Object.prototype.hasOwnProperty.call(context.asts, node.name))
        return context.asts[node.name]
    if(Object.prototype.hasOwnProperty.call(context.values, node.name))
        return valueToNode(context.values[node.name])
    return FAIL
}

function contextValue(node, data) {
    if(node.type !== 'Identifier')
        return FAIL
    if(!Object.prototype.hasOwnProperty.call(data, node.name))
        return FAIL
    return data[node.name]
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
    else if(node.type === 'ExpressionStatement') {
        return literalToValue(node.expression)
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

function walk(node, context) {
    if(Array.isArray(node)) {
        for(let i = 0; i < node.length; i += 1) {
            const result = walk(node[i], context)
            if(!result) {
                node.splice(i, 1)
                i -= 1
            }
            else if(Array.isArray(result.body)) {
                node.splice(i, 1, ...result.body)
                i += result.body.length - 1
            }
            else if(result.type === 'ExpressionStatement' && result.expression.type === 'BlockStatement') {
                node.splice(i, 1, ...result.expression.body)
                i += result.expression.body.length - 1
            }
            else {
                node[i] = result
            }
        }
    }
    else if(node.type === 'EmptyStatement') {
        return undefined
    }
    else if(node.type === 'Literal' || node.type === 'ImportDeclaration'
            || node.type === 'ThisExpression' || node.type === 'ContinueStatement') {
        // pass
    }
    else if(node.type === 'File') {
        node.program = walk(node.program, context)
    }
    else if(node.type === 'Program' || node.type === 'BlockStatement'
            || node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration'
            || node.type === 'FunctionExpression') {
        node.body = walk(node.body, context)
    }
    else if(node.type === 'UnaryExpression') {
        if(node.operator === 'delete') {
            if(node.argument.type !== 'Identifier' && node.argument.type !== 'MemberExpression')
                raiseError(node, `Can't delete ${node.argument.type}.`)
            if(node.argument.type === 'MemberExpression') {
                node.argument.object = walk(node.argument.object, context)
                node.argument.property = walk(node.argument.property, context)
            }
            else {
                node.argument = walk(node.argument, context)
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
            node.argument = walk(node.argument, context)
            
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
        node.argument = walk(node.argument, context)
        
        if(node.argument.type === 'Literal')
            raiseError(node, "Can't mutate compile-time constant or literal. Assign a copy to a " +
                             "variable first.")
    }
    else if(node.type === 'BinaryExpression') {
        node.left = walk(node.left, context)
        node.right = walk(node.right, context)
        return binaryExpression(node)
    }
    else if(node.type === 'LogicalExpression') {
        node.left = walk(node.left, context)
        node.right = walk(node.right, context)
        return logicalExpression(node)
    }
    else if(node.type === 'ExpressionStatement') {
        node.expression = walk(node.expression, context)
    }
    else if(node.type === 'Identifier') {
        const result = contextValueToNode(node, context)
        if(result !== FAIL) {
            if(result.type === 'Program')
                result.type = 'BlockStatement'
            return result
        }
    }
    else if(node.type === 'CallExpression' || node.type === 'NewExpression') {
        node.arguments = walk(node.arguments, context)
        node.callee = walk(node.callee, {values: context.values, functions: {}, macroes: {}, asts: context.asts})
        
        const func = contextValue(node.callee, context.functions)
        if(func !== FAIL) {
            const args = literalsToValues(node.arguments)
            if(args === FAIL)
                raiseError(node, `Can't evaluate compile-time function with arguments that don't ` +
                                 `resolve statically.`)
            return valueToNode(func(...args))
        }
        
        const mac = contextValue(node.callee, context.macroes)
        if(mac !== FAIL) {
            if(typeof mac === 'string') {
                const args = {}
                for(let i = 0; i < node.arguments.length; i += 1)
                    args['$' + i] = node.arguments[i]
                const program = processAST(mac, {asts: args})
                if(program.body.length > 1) {
                    program.type = 'BlockStatement'
                    return program
                }
                else {
                    return program.body[0] // returning undefined for length 0 clips node
                }
            }
            else {
                const subNode = mac(...node.arguments)
                if(!subNode)
                    return undefined
                return walk(subNode, context)
            }
        }
    }
    else if(node.type === 'MemberExpression') {
        node.object = walk(node.object, context)
        if(node.computed)
            node.property = walk(node.property, context)
        
        let name = FAIL
        if(node.computed && node.property.type === 'Literal')
            name = node.property.value
        else if(!node.computed && node.property.type === 'Identifier')
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
        node.declarations = walk(node.declarations, context)
    }
    else if(node.type === 'VariableDeclarator') {
        node.id = walk(node.id, context)
        if(node.init)
            node.init = walk(node.init, context)
    }
    else if(node.type === 'IfStatement' || node.type === 'ConditionalExpression') {
        node.test = walk(node.test, context)
        if(node.consequent.type !== 'EmptyStatement') // keeps original source map
            node.consequent = walk(node.consequent, context)
        if(node.alternate)
            node.alternate = walk(node.alternate, context)
            
        if(node.test.type === 'Literal') {
            if(node.test.value)
                return node.consequent
            else
                return node.alternate
        }
    }
    else if(node.type === 'ThrowStatement' || node.type === 'YieldExpression'
            || node.type === 'SpreadElement') {
        node.argument = walk(node.argument, context)
    }
    else if(node.type === 'ReturnStatement') {
        if(node.argument)
            node.argument = walk(node.argument, context)
    }
    else if(node.type === 'ObjectExpression') {
        node.properties = walk(node.properties, context)
    }
    else if(node.type === 'Property') {
        node.key = walk(node.key, context)
        node.value = walk(node.value, context)
    }
    else if(node.type === 'AssignmentExpression') {
        if(node.left.type !== 'Identifier' && node.left.type !== 'MemberExpression')
            raiseError(node, `Can't assign to ${node.left.type}.`)
        node.left = walk(node.left, context)
        if(node.left.type === 'Literal')
            raiseError(node, "Can't assign to compile-time constant.")
        
        node.right = walk(node.right, context)
    }
    else if(node.type === 'ArrayExpression') {
        node.elements = walk(node.elements, context)
    }
    else if(node.type === 'ForStatement') {
        if(node.init)
            node.init = walk(node.init, context)
        if(node.test)
            node.test = walk(node.test, context)
        if(node.update)
            node.update = walk(node.update, context)
        node.body = walk(node.body, context)
    }
    else if(node.type === 'ForOfStatement') {
        node.right = walk(node.right, context)
        node.body = walk(node.body, context)
    }
    else if(node.type === 'WhileStatement') {
        node.test = walk(node.test, context)
        if(node.test.type === 'Literal' && !node.test.value)
            return undefined
        node.body = walk(node.body, context)
    }
    else if(node.type === 'ExportDeclaration') {
        node.declaration = walk(node.declaration, context)
    }
    else if(node.type === 'TemplateLiteral') {
        node.expressions = walk(node.expressions, context)
        
        for(let i = 0; i < node.expressions.length; i += 1) {
            if(node.expressions[i].type === 'Literal') {
                node.quasis[i].value.raw += node.expressions[i].value + node.quasis[i + 1].value.raw
                node.quasis[i].value.cooked += node.expressions[i].value + node.quasis[i + 1].value.cooked
                node.quasis.splice(i + 1, 1)
                node.expressions.splice(i, 1)
                i -= 1
            }
        }
        node.quasis[node.quasis.length - 1].tail = true
        
        return JSON.parse(JSON.stringify(node))
    }
    else {
        console.log('unknown type\n', JSON.stringify(node,null,2), '\n')
    }
    return node
}
