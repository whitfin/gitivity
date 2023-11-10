const readline = require('readline');
const mkdirp = require('mkdirp').mkdirp;

const Git = require('simple-git');

module.exports = {

    // command usage text
    command: ['import <target>'],

    // command description text for the CLI
    describe: 'Imports a sorted array of commit activity.',

    // command argument builder
    builder: function build(args) {
        return args
            .describe('author', 'Customize the author name and email being attached to each commit.')
            .describe('branch', 'Customize the branch name commits are assigned to in the repo.')
            .default('branch', 'main')
            .alias('author', 'a')
            .alias('branch', 'b')
            .require('target');
    },

    // command handler definition
    handler: async function (args) {
        // set up target context
        await mkdirp(args.target);
        process.chdir(args.target);

        // init git repo
        let git = Git();
        await git.init(false, ['-b', args.branch]);

        let known = new Set();
        try {
            let logged = await git.log();

            for (let commit of logged.all) {
                known.add(commit.message.split(' ').pop());
            }
        } catch {
            // no commits yet
        }

        // open our read stream from stdin
        let stream = readline.createInterface({
            input: process.stdin,
            crlfDelay: Infinity
        });

        // process each line of input
        for await (const line of stream) {
            // pull author and commit char
            let commit = JSON.parse(line);
            let author = args.author || commit.author;

            // skip commits in the log
            if (known.has(commit.id)) {
                continue;
            }

            // usually redundant
            known.add(commit.id);

            // commit the file, putting the id in the message
            await git.commit(`Adding commit for ${commit.id}`, [
                '--allow-empty',
                '--date',
                commit.timestamp,
                '--author',
                author
            ]);
        }
    }
}
