import Git from 'simple-git';
import moment from 'moment';
import { PassThrough } from 'stream';

import exporter from './export.js';
import importer from './import.js';

// cmd definition
export default {
    // command usage text
    command: 'mirror <service> <token> <target>',

    // command description text for the CLI
    describe: 'Mirrors user activity to a Git repo.',

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
