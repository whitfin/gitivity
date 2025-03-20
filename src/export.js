const fs = require('fs');
const path = require('path');

// service handlers
let services = {
    github: require('./services/github'),
    gitlab: require('./services/gitlab')
};

function cleanUpFileAndExtractLastSyncDate(filePath) {
    let lastSyncDate = null;

    if (fs.existsSync(filePath)) {
        let fileContent = fs.readFileSync(filePath, 'utf-8').trim();
        let lines = fileContent.split('\n');

        if (lines.length > 0) {
            let lastEntry = JSON.parse(lines[lines.length - 1]);
            let lastEntryDate = new Date(lastEntry.timestamp).toISOString().split('T')[0];

            // Remove all lines with last entry's date
            lines = lines.filter(line => {
                let entryDate = new Date(JSON.parse(line).timestamp).toISOString().split('T')[0];
                return entryDate !== lastEntryDate;
            });

            // Rewrite file with remaining lines
            fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
        }

        // Read new last line and extract its date
        if (lines.length > 0) {
            let newLastEntry = JSON.parse(lines[lines.length - 1]);
            lastSyncDate = new Date(newLastEntry.timestamp).toISOString();
        }
    }

    return lastSyncDate;
}

// cmd definition
module.exports = {

    // command usage text
    command: 'export <service> <token> [exportFilename] [date]',

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
            .positional('exportFilename', {
                describe: 'The filename to export the git activity to.',
                default: 'export.jsonl'
            })
            .positional('date', {
                describe: 'The date to export from.',
                default: '2005-01-01T00:00:00Z'
            })
            .require('service')
            .require('token');
    },

    handler: async function (args) {
        const exportFilePath = path.join(__dirname, '..', args.exportFilename);
        console.log('Exporting git activity to:', exportFilePath);
        
        let lastSyncDate = cleanUpFileAndExtractLastSyncDate(exportFilePath);

        if (lastSyncDate) {
            args.date = lastSyncDate
        }

        console.log('Exporting activity starting from:', args.date);
        
        let actions = await services[args.service](args);
        actions.sort((left, right) => left.timestamp.valueOf() - right.timestamp.valueOf());

        for (let action of actions) {
            fs.appendFileSync(exportFilePath, JSON.stringify(action) + '\n');
        }

        console.log('Number of activities exported:', actions.length);
    }
};
