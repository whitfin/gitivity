const moment = require('moment');

const Gitlab = require('@gitbeaker/rest').Gitlab;
const Octokit = require('@octokit/rest').Octokit;

module.exports = {

    // command usage text
    command: ['export <service> <token>'],

    // command description text for the CLI
    describe: 'Exports a sorted array of action activity.',

    // command argument builder
    builder: function build(args) {
        return args
            .positional('service', {
                choices: [
                    'github',
                    'gitlab'
                ]
            })
            .positional('token', {
                describe: 'The token of the account to authenticate with.'
            })
            .require('service')
            .require('token');
    },

    // command handler definition
    handler: async function (args) {
        // service handlers
        let services = {
            github,
            gitlab
        };

        // pull the actions from the service handler
        let actions = await services[args.service](args);

        // sort actions by timestamp
        actions.sort(function (left, right) {
            return left.timestamp.valueOf() - right.timestamp.valueOf();
        });

        // write all to stdout
        for (let action of actions) {
            console.log(JSON.stringify(action));
        }
    }
};

/**
 * Export action activity from GitLab.
 *
 * @param {object} args
 *      the argument passed to the command line.
 * @returns
 *      an array of actions to emit to stdout.
 */
async function gitlab(args) {
    let actions = [];

    // open Gitlab API cliemt
    let client = new Gitlab({
        token: args.token
    });


    // fetch current user metadata for author tag
    let user = await client.Users.showCurrentUser();
    let author = user.name + ' <' + user.email + '>';

    // events we like
    let enabled = [
        'closed',
        'commented',
        'created',
        'destroyed',
        'merged',
        'pushed',
        'reopened',
        'updated'
    ];

    // walk all enabled types
    for (let type of enabled) {
        // walk the events of the user matching the entry type
        let events = await client.Users.allEvents(user.id, {
            action: type
        });

        // walk all user events
        for (let event of events) {
            let action = {
                id: event.id,
                author,
                timestamp: moment.utc(event.created_at)
            };
            actions.push(action);
        }
    }

    // return the shortened action format
    return actions;
}

/**
 * Export action activity from GitHub.
 *
 * @param {object} args
 *      the argument passed to the command line.
 * @returns
 *      an array of actions to emit to stdout.
 */
async function github(args) {
    let actions = [];

    // open GitHub API cliemt
    let client = new Octokit({
        auth: args.token
    });

    // retrieve the current user info
    let viewer = await client.graphql(`{
        viewer {
            name
            email
            login
            createdAt
        }
    }`);

    // initialize timestamps
    let user = viewer.viewer;
    let author = `${user.name} <${user.email}>`;
    let created = moment.utc(user.createdAt);
    let current = moment.utc();

    // walk through all actions (yearly)
    while (created.isBefore(current)) {
        let lower = created.toISOString();
        let upper = created.add(1, 'year').toISOString();

        // current year
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

        // pull back the bucket of weeks to walk
        let result = await client.graphql(query);
        let bucket = result.user.contributionsCollection.contributionCalendar.weeks;

        // flatten into actions
        for (let week of bucket) {
            for (let day of week.contributionDays) {
                for (let i = 1; i <= day.contributionCount; i++) {
                    let date = moment.utc(day.date);
                    let action = {
                        id: `${date.valueOf()}${i}`,
                        author,
                        timestamp: date
                    };
                    actions.push(action);
                }
            }
        }
    }

    // done !
    return actions;
}
