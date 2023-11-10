#!/usr/bin/env node
const yargs = require('yargs/yargs');
yargs(process.argv.slice(2))
    .usage('gitivity <command>')
    .commandDir('../src')
    .demandCommand()
    .help()
    .argv
