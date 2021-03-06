Mytacism
---

Evaluates statically analyzable expressions in Javascript and can evaluate injected compile-time
constants and functions. Inspired by
[static-eval](https://github.com/substack/static-eval), which at the time of writing was a promising
but incomplete solution.


Installation
---

    npm install --save-dev mytacism


Usage
---

Basic usage:

    var mytacism = require('mytacism')
    
    var options = {}
    var source = '1 + 1'
    var result = mytacism(source, options)
    
    console.log(result.code) // 2

You can also pass values in the options parameter to be used in computations:

    var mytacism = require('mytacism')
    
    var source = '1 + a'
    var result = mytacism(source, {values: {a: 2}})
    
    console.log(result.code) // 3
    
You can also pass functions to be statically executed:

    var mytacism = require('mytacism')
    
    var source = '1 + foo(1)'
    var result = mytacism(source, {functions: {foo: function(a) { return a + 2 }}})
    
    console.log(result.code) // 4
