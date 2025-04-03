const readline = require('readline');
const mkdirp = require('mkdirp').mkdirp;

const Git = require('simple-git');

module.exports = {
    // command usage text
    command: ['import <target>'],

    // command description text for the CLI
    describe: 'Imports a sorted array of activity.',

    // command argument builder
    builder: function build(args) {
        return args
            .positional('target', {
                describe: 'The location of the targeted repository on disk.',
            })
            .option('author', {
                alias: 'a',
                description: 'Author name and email being attached to each commit.',
            })
            .option('branch', {
                alias: 'b',
                default: 'main',
                description: 'Branch name commits are assigned to in the repo.',
            });
    },

    // command handler definition
    handler: async function (args) {
        // set up target context
        await mkdirp(args.target);
        process.chdir(args.target);

        // init git repo as needed
        let git = args.git || new Git();
        await git.init(false, ['-b', args.branch]);

        // duplicate filter
        let known = new Set();
        try {
            // fetch the entire git log
            let logged = await git.log();

            // collect all known actions by type
            for (let action of logged.all) {
                known.add(action.message);
            }
        } catch {
            // no commits yet
        }

        // open our read stream from stdin
        let stream = readline.createInterface({
            input: args.stream || process.stdin,
            crlfDelay: Infinity,
        });

        // process each line of input
        for await (let line of stream) {
            // pull author and commit char
            let action = JSON.parse(line);
            let author = args.author || action.author;

            // skip any actions tracked in the log
            if (known.has(action.id)) {
                continue;
            }

            // usually redundant
            known.add(action.id);

            // make a commit using the id
            await git.commit(`${action.id}`, [
                '--allow-empty',
                '--date',
                action.timestamp,
                '--author',
                author,
            ]);
        }
    },
};
