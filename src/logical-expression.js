import {types} from 'recast'

export default function(node) {
    return operators[node.operator](node)
}

const FAIL = {}

const operators = {
    '||': shortcutBinaryOperator((a => a? a: FAIL), (a => a? a: FAIL), ((a, b) => a || b)),
    '&&': shortcutBinaryOperator((a => a? FAIL: a), (a => a), ((a, b) => a && b)),
}

function shortcutBinaryOperator(funcLeft, funcRight, func2) {
    return (node) => {
        if(node.left.type === 'Literal' && node.right.type === 'Literal')
            return types.builders.literal(func2(node.left.value, node.right.value))
        
        let leftValue = FAIL
        
        if(node.left.type === 'Literal') {
            leftValue = funcLeft(node.left.value)
            if(leftValue !== FAIL)
                return types.builders.literal(leftValue)
        }
        
        if(node.right.type === 'Literal') {
            const result = funcRight(node.right.value)
            if(result === FAIL) {
                return node.left
            }
            return types.builders.literal(result)
        }
        else if(leftValue === FAIL) {
            return node.right
        }
        
        return node
    }
}
