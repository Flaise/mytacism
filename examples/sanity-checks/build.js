import {default as process, processAST} from '../../src'
import fs from 'fs'
import {types} from 'recast'
const builders = types.builders

const inFile = __dirname + '/input.js'
const inSource = fs.readFileSync(inFile).toString()

const options = {
    sourceFileName: inFile,
    sourceMapName: `${inFile}.map`,
    macroes: {}
}

options.macroes.SANITY = (test, kludge) => {
    if(kludge) {
        if(kludge.type === 'Literal' && typeof kludge.value === 'string')
            kludge = processAST(kludge.value)
        console.log(kludge.type)
        return processAST(`if(!$$test) $$kludge`, {asts: {$$test: test, $$kludge: kludge}})
    }
    else
        return processAST(';')
}
const outProduction = process(inSource, options)

options.macroes.SANITY = 'if(!$0) throw new Error()'
const outDevelopment = process(inSource, options)

fs.writeFileSync(__dirname + '/output.production.js', outProduction.code)
fs.writeFileSync(__dirname + '/output.production.js.map', outProduction.map)
fs.writeFileSync(__dirname + '/output.development.js', outDevelopment.code)
fs.writeFileSync(__dirname + '/output.development.js.map', outDevelopment.map)
