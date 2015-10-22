Mytacism
---

Evaluates statically analyzable expressions in Javascript. Inspired by
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

You can also pass an object as the second parameter and its contents will be used in computations:

    var mytacism = require('mytacism')
    
    var source = '1 + a'
    var result = mytacism(source, {context: {a: 2}})
    
    console.log(result.code) // 3
    
You can also pass functions to be statically executed:

    var mytacism = require('mytacism')
    
    var source = '1 + foo(1)'
    var result = mytacism(source, {context: {foo: function(a) { return a + 2 }}})
    
    console.log(result.code) // 4
