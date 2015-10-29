import {default as process, processAST} from '../../src'
import fs from 'fs'

const inFile = __dirname + '/input.js'
const inSource = fs.readFileSync(inFile).toString()

const options = {
    sourceFileName: inFile,
    sourceMapName: `${inFile}.map`,
    values: {},
    macroes: {
        ARRAY: (...elements) => {
            const asts = {}
            let source = '['
            
            // for(let element of elements) {
            for(let i = 0, index = 0; i < elements.length; i += 1, index += 1) {
                if(Array.isArray(elements[i].body) && elements[i].body.length === 0) {
                    index -= 1
                }
                else {
                    asts['$$' + i] = elements[i]
                    source += '$$' + i + ','
                }
            }
            source += ']'
            
            return processAST(source, {asts})
            // processAST(`if(!$$test) $$kludge`, {asts: {$$test: test, $$kludge: kludge}})
            
        }
    }
}

options.values.PRODUCTION = true
const outProduction = process(inSource, options)

options.values.PRODUCTION = false
const outDevelopment = process(inSource, options)

fs.writeFileSync(__dirname + '/output.production.js', outProduction.code)
fs.writeFileSync(__dirname + '/output.production.js.map', outProduction.map)
fs.writeFileSync(__dirname + '/output.development.js', outDevelopment.code)
fs.writeFileSync(__dirname + '/output.development.js.map', outDevelopment.map)
