// service handlers
const services = require('./services');

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
        // allow re-use and stream overriding
        let stream = args.stream || process.stdout;

        // read back all actions from the selected service
        for await (let action of services[args.service](args)) {
            stream.write(JSON.stringify(action));
            stream.write('\n');
        }
    }
};
