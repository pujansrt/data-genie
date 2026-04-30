const { setupWorker } = require('../dist/index');
const { MemoryWriter } = require('../dist/index');

// Note: This expects the project to be built or we use a different path
// To make it work with tsx directly in the test, we can use require('tsx/register')

try {
    const internalWriter = new MemoryWriter();
    setupWorker(internalWriter);
} catch (e) {
    console.error("Worker init failed", e);
}
