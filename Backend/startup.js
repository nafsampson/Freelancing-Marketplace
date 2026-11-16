async function startServer({ server, connect, port, host }) {
    await connect();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
            server.removeListener('error', reject);
            resolve();
        });
    });
    return server;
}
module.exports = { startServer };
