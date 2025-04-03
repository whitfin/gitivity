import moment from 'moment';
import { Gitlab } from '@gitbeaker/rest';

/**
 * Export action activity from GitLab.
 *
 * @param {object} args
 *      the argument passed to the command line.
 * @returns
 *      an array of actions to emit to stdout.
 */
export default async function* fetch(args) {
    let actions = [];

    // open Gitlab API cliemt
    let client = new Gitlab({
        token: args.token,
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
        'updated',
    ];

    // walk all enabled types
    for (let type of enabled) {
        // params
        let opts = {
            action: type,
        };

        // lower bounds
        if (args.from) {
            opts.after = moment.utc(opts.after).format('YYYY-MM-DD');
        }

        // walk the events of the user matching the entry type
        for (let event of await client.Users.allEvents(user.id, opts)) {
            actions.push({
                id: `${event.id}`,
                name: user.name,
                email: user.email,
                author,
                timestamp: moment.utc(event.created_at),
            });
        }
    }

    // sort actions by timestamp
    actions.sort(function (left, right) {
        return left.timestamp.valueOf() - right.timestamp.valueOf();
    });

    // yield back
    yield* actions;
}
