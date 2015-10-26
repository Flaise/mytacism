function doSomething(parameter) {
    if(!Number.isInteger(parameter)) parameter = 0;
    ;
    if(!parameter) {
      parameter += 1;return doSomething(parameter)
    };;
    
    return parameter + 3
}