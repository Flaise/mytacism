

function doSomething(parameter) {
    SANITY(Number.isInteger(parameter), parameter = 0)
    SANITY(parameter + 15 < 3)
    SANITY(parameter, () => { parameter += 1; return doSomething(parameter) })
    
    return parameter + 3
}
