const crypto = require('node:crypto');

// Map of ephemeral output ids -> absolute file paths
const outputs = new Map();

function idForPath(p) {
  return crypto.createHash('sha1').update(p).digest('hex');
}

module.exports = { outputs, idForPath };
