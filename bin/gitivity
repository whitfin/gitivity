#!/usr/bin/env node
require('yargs/yargs')(process.argv.slice(2))
    .usage('gitivity <command>')
    .command(require('../src/export'))
    .command(require('../src/import'))
    .demandCommand()
    .help()
    .argv;
