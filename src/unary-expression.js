import {types} from 'recast'
import {walk, raiseError, literalToValue, FAIL, valueToNode} from './index'

const unaryOperators = {
    '+': (a => +a),
    '-': (a => -a),
    '~': (a => ~a),
    '!': (a => !a),
    'typeof': (a => typeof a),
}

export default function(node, context) {
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
        
        if(literalToValue(node.argument) !== FAIL)
            raiseError(node, "Can't delete compile-time constant.")
        if(node.argument.type === 'MemberExpression') {
            const obj = node.argument.object
            if(obj.type === 'Literal' || obj.type === 'ObjectExpression'
                    || obj.type === 'ArrayExpression')
                raiseError(node, "Can't mutate compile-time constant or literal. Assign a " +
                                 "copy to a variable first.")
        }
        
        return node
    }
    
    node.argument = walk(node.argument, context)
    if(node.operator === 'void') {
        if(node.argument.type !== 'CallExpression')
            node.argument = types.builders.literal(0)
    }
    else if(node.operator === 'typeof' && node.argument.operator === 'void'
            && literalToValue(node.argument.argument) !== FAIL) {
        return valueToNode('undefined')
    }
    else {
        const operator = unaryOperators[node.operator]
        if(operator) {
            const arg = literalToValue(node.argument)
            if(arg !== FAIL)
                return valueToNode(operator(arg))
        }
        else
            console.warn(`Unknown unary operator`, node)
    }
    return node
}
