import {types} from 'recast'

export default function(node) {
    return operators[node.operator](node)
}

const FAIL = {}

const operators = {
    '||': or,
    '&&': and,
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
        
        return node
    }
}

function or(node) {
    if(node.left.type === 'Literal') {
        if(node.right.type === 'Literal')
            return types.builders.literal(node.left.value || node.right.value)
        if(node.left.value)
            return types.builders.literal(node.left.value)
        return node.right
    }
    
    return node
}

function and(node) {
    if(node.left.type === 'Literal') {
        if(node.right.type === 'Literal')
            return types.builders.literal(node.left.value && node.right.value)
        if(!node.left.value)
            return node.right
        return types.builders.literal(node.left.value)
    }
    else {
        if(node.right.type === 'Literal')
            return types.builders.literal(node.right.value)
    }

    return node
}
