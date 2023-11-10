#!/usr/bin/env node
require('yargs/yargs')(process.argv.slice(2))
    .usage('gitivity <command>')
    .commandDir('../src')
    .demandCommand()
    .help()
    .argv;
