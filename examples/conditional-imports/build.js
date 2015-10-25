import process from '../../src'
import fs from 'fs'

const inFile = __dirname + '/input.js'
const inSource = fs.readFileSync(inFile).toString()

const options = {
    sourceFileName: inFile,
    sourceMapName: `${inFile}.map`,
    values: {}
}

options.values.PRODUCTION = true
const outProduction = process(inSource, options)

options.values.PRODUCTION = false
const outDevelopment = process(inSource, options)

fs.writeFileSync(__dirname + '/output.production.js', outProduction.code)
fs.writeFileSync(__dirname + '/output.production.js.map', outProduction.map)
fs.writeFileSync(__dirname + '/output.development.js', outDevelopment.code)
fs.writeFileSync(__dirname + '/output.development.js.map', outDevelopment.map)
