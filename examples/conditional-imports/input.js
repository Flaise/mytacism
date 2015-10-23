let value

if(PRODUCTION) {
    import {func1, func2} from 'a'
    
    value = func1(1, func2('z'))
}
else {
    import b from 'b'
    
    value = b
}

console.log(value)
