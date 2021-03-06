#!/usr/bin/env node

const debug = require('debug')('trifid:')
const path = require('path')
const program = require('commander')
const ConfigHandler = require('trifid-core/lib/ConfigHandler')
const Trifid = require('trifid-core')
const fs = require('fs');

program
  .option('-v, --verbose', 'verbose output', () => true)
  .option('-c, --config <path>', 'configuration file', process.env.TRIFID_CONFIG)
  .option('-p, --port <port>', 'listener port', parseInt)
  .option('--sparql-endpoint-url <url>', 'URL of the SPARQL HTTP query interface')
  .option('--dataset-base-url <url>', 'Base URL of the dataset')
  .parse(process.argv)

// automatically switch to config-sparql if a SPARQL endpoint URL is given and no config file was defined
if (program.sparqlEndpointUrl && !program.config) {
  program.config = 'config-sparql.json'
} else if (!program.config) {
  program.config = 'config.json'
}

// create a minimal configuration with a baseConfig pointing to the given config file
const config = {
  baseConfig: path.join(process.cwd(), program.config)
}

// add optional arguments to the configuration


  config.listener = {
    port: process.env.PORT || 8080
  }


if (program.sparqlEndpointUrl) {
  config.sparqlEndpointUrl = program.sparqlEndpointUrl
}

if (program.datasetBaseUrl) {
  config.datasetBaseUrl = program.datasetBaseUrl
}

// load the configuration and start the server

const trifid = new Trifid()

trifid.configHandler.resolver.use('trifid', ConfigHandler.pathResolver(__dirname))

trifid.init(config).then(() => {
  if (program.verbose) {
    debug('expanded config:')
    debug(JSON.stringify(trifid.config, null, ' '))
  }

  // configure SPARQL examples by building URLs 
  // for buttons to open YASGUI
  // TODO: Move date placeholder to client

  trifid.config.sparqls = {}

  let YasguiParams = {
    "contentTypeSelect":"application/sparql-results+json",
    "contentTypeConstruct":"text/turtle",
    "requestMethod":"POST",
    "outputFormat":"table",
    "endpoint":"/query",
    "headers":"{}"
  }

  const examples = './examples/sparql'
  fs.readdirSync(examples).forEach(file => {
    var name = file.split('.')[0]
    var url = "/sparql/#query="
    url += encodeURIComponent(fs.readFileSync('./examples/sparql/' + file, 'utf8'))
    Object.keys(YasguiParams).forEach(function(key) {
      url += `&${key}=${encodeURIComponent(YasguiParams[key])}`
    })
    url += `&tabTitle=${name}`
    trifid.config.sparqls[name] = url
  });

  let eventSparql = trifid.config.sparqls.event
  let todayDate =  new Date().toISOString()
  trifid.config.sparqls.event =  eventSparql.replace(/DATE_PLACEHOLDER/g,  todayDate);
  console.log(trifid.config.sparqls)

  return trifid.app()
}).catch((err) => {
  debug(err)
})