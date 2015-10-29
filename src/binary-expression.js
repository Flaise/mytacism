import {types} from 'recast'
import {FAIL, literalToValue} from '.'

export default function(node) {
    if(node.operator === 'instanceof')
        return node
    if(!operators[node.operator]) {
        console.warn(`Unknown binary operator ${node.operator}`)
        return node
    }
    return operators[node.operator](node)
}

function normalBinaryOperator(func) {
    return (node) => {
        const left = literalToValue(node.left)
        const right = literalToValue(node.right)
        if(left !== FAIL && right !== FAIL)
            return types.builders.literal(func(left, right))
        
        return node
    }
}

const operators = {
    '+': normalBinaryOperator((a, b) => a + b),
    '-': normalBinaryOperator((a, b) => a - b),
    '/': normalBinaryOperator((a, b) => a / b),
    '*': normalBinaryOperator((a, b) => a * b),
    '%': normalBinaryOperator((a, b) => a % b),
    '===': normalBinaryOperator((a, b) => a === b),
    '!==': normalBinaryOperator((a, b) => a !== b),
    '==': normalBinaryOperator((a, b) => a == b),
    '!=': normalBinaryOperator((a, b) => a != b),
    '>': normalBinaryOperator((a, b) => a > b),
    '<': normalBinaryOperator((a, b) => a < b),
    '>=': normalBinaryOperator((a, b) => a >= b),
    '<=': normalBinaryOperator((a, b) => a <= b),
    '&': normalBinaryOperator((a, b) => a & b),
    '^': normalBinaryOperator((a, b) => a ^ b),
    'in': normalBinaryOperator((a, b) => a in b),
}
