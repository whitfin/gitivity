const moment = require('moment');
const Gitlab = require('@gitbeaker/rest').Gitlab;

/**
 * Export action activity from GitLab.
 *
 * @param {object} args
 *      the argument passed to the command line.
 * @returns
 *      an array of actions to emit to stdout.
 */
module.exports = async function fetch(args) {
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
            action: type,
            after: args.date
        });

        // walk all user events
        for (let event of events) {
            let action = {
                id: `${event.id}`,
                name: user.name,
                email: user.email,
                author,
                timestamp: moment.utc(event.created_at)
            };
            actions.push(action);
        }
    }

    // return the shortened action format
    return actions;
};
