const moment = require('moment');

const Gitlab = require('@gitbeaker/rest').Gitlab;
const Octokit = require('@octokit/rest').Octokit;

module.exports = {

    // command usage text
    command: ['export <source> <token>'],

    // command description text for the CLI
    describe: 'Exports a sorted array of commit activity.',

    // command argument builder
    builder: function build(args) {
        return args
            .positional('source', {
                choices: [
                    'github',
                    'gitlab'
                ]
            })
            .positional('token', {
                describe: 'The token of the account to authenticate with.'
            })
            .require('source')
            .require('token');
    },

    // command handler definition
    handler: async function (args) {
        // source handlers
        let sources = {
            github,
            gitlab
        };

        // pull the commits from the source handler
        let commits = await sources[args.source](args);

        // sort commits by timestamp
        commits.sort(function (left, right) {
            return left.timestamp.valueOf() - right.timestamp.valueOf();
        })

        // write all to stdout
        for (let commit of commits) {
            console.log(JSON.stringify(commit));
        }
    }
}

/**
 * Export commit activity from GitLab.
 *
 * @param {object} args
 *      the argument passed to the command line.
 * @returns
 *      an array of commits to emit to stdout.
 */
async function gitlab(args) {
    let commits = [];

    // open Gitlab API cliemt
    let client = new Gitlab({
        token: args.token
    });

    // fetch projects the user contributed to
    let user = await client.Users.showCurrentUser();
    let projects = await client.Users.allContributedProjects(user.id);

    // walk through all projects
    for (let project of projects) {
        // fetch the authored commits from the current project
        let entries = await client.Commits.all(project.id, {
            author: user.name
        });

        // push the commits to the buffer
        for (let entry of entries) {
            let commit = {
                id: entry.id,
                author: entry.author_name + ' <' + entry.author_email + '>',
                timestamp: moment.utc(entry.created_at)
            };
            commits.push(commit);
        }
    }

    // return the shortened commit format
    return commits;
}

/**
 * Export commit activity from GitHub.
 *
 * @param {object} args
 *      the argument passed to the command line.
 * @returns
 *      an array of commits to emit to stdout.
 */
async function github(args) {
    let commits = [];

    // open GitHub API cliemt
    let client = new Octokit({
        auth: args.token
    });

    let viewer = await client.graphql(`{
        viewer {
            name
            email
            login
            createdAt
        }
    }`);

    let user = viewer.viewer;
    let author = `${user.name} <${user.email}>`;
    let created = moment.utc(user.createdAt);
    let current = moment.utc();

    while (created.isBefore(current)) {
        let lower = created.toISOString();
        let upper = created.add(1, 'year').toISOString();

        let query = `{
            user(login: "${user.login}") {
                contributionsCollection(from: "${lower}", to: "${upper}") {
                    contributionCalendar {
                        weeks {
                            contributionDays {
                                contributionCount
                                date
                            }
                        }
                    }
                }
            }
        }`;

        let result = await client.graphql(query);
        let bucket = result.user.contributionsCollection.contributionCalendar.weeks;

        for (let week of bucket) {
            for (let day of week.contributionDays) {
                for (let i = 1; i <= day.contributionCount; i++) {
                    let date = moment.utc(day.date);
                    let commit = {
                        id: `${date.valueOf()}${i}`,
                        author,
                        timestamp: date
                    };
                    commits.push(commit);
                }
            }
        }
    }


    // done !
    return commits;
}
