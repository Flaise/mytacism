function doSomething(parameter) {
    if(!Number.isInteger(parameter)) throw new Error();
    if(!(parameter + 15 < 3)) throw new Error();
    if(!parameter) throw new Error();
    
    return parameter + 3
}