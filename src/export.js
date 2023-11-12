// service handlers
let services = {
    github: require('./services/github'),
    gitlab: require('./services/gitlab')
};

// cmd definition
module.exports = {

    // command usage text
    command: 'export <service> <token>',

    // command description text for the CLI
    describe: 'Exports a sorted array of activity.',

    // command argument builder
    builder: function build(args) {
        return args
            .positional('service', {
                choices: Object.keys(services).sort(),
                describe: 'The name of the service to export from.'
            })
            .positional('token', {
                describe: 'The token of the account to authenticate with.'
            })
            .require('service')
            .require('token');
    },

    // command handler definition
    handler: async function (args) {
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
