import {types} from 'recast'

export default function(node) {
    return operators[node.operator](node)
}

function normalBinaryOperator(func) {
    return (node) => {
        if(node.left.type === 'Literal' && node.right.type === 'Literal')
            return types.builders.literal(func(node.left.value, node.right.value))
        
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
    '&': normalBinaryOperator((a, b) => a & b),
    '^': normalBinaryOperator((a, b) => a ^ b),
}
