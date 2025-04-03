import moment from 'moment';
import { Octokit } from '@octokit/rest';

/**
 * Export action activity from GitHub.
 *
 * @param {object} args
 *      the argument passed to the command line.
 * @returns
 *      an array of actions to emit to stdout.
 */
export default async function* fetch(args) {
    // open GitHub API cliemt
    let client = new Octokit({
        auth: args.token,
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
                    yield {
                        id: `${date.valueOf()}${i}`,
                        name: user.name,
                        email: user.email,
                        author,
                        timestamp: date,
                    };
                }
            }
        }
    }
}
