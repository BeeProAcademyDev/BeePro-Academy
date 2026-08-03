const createApp = require('../src/app')
const createContainer = require('../src/container')

const container = createContainer()
const app = createApp(container)

// Export the Express API
module.exports = app
