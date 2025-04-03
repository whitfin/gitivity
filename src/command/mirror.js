const Git = require('simple-git');
const moment = require('moment');
const PassThrough = require('stream').PassThrough;

const exporter = require('./export');
const importer = require('./import');

// cmd definition
module.exports = {
    // command usage text
    command: 'mirror <service> <token> <target>',

    // command description text for the CLI
    describe: 'Mirror activity to a local repository.',

    // command argument builder
    builder: function build(args) {
        args = exporter.builder(args);
        args = importer.builder(args);

        return args;
    },

    // command handler definition
    handler: async function (args) {
        // lower bound
        let from;
        try {
            // switch to the target
            process.chdir(args.target);

            // init git repo
            args.git = new Git();

            // pull the last commit timestamp
            from = await args.git.log({ maxCount: 1 });
            from = moment.utc(from.latest.date);
        } catch {
            // nothing exists
        }

        // enable lower bound check
        args.from = args.from || from;

        // pseudo stream to pass events
        args.stream = new PassThrough();

        // pipe both children
        await Promise.all([
            importer.handler(args),
            exporter.handler(args).finally(function () {
                args.stream.end();
            }),
        ]);

        // terminate
        process.exit();
    },
};
