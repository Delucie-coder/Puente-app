const { spawn, execFile } = require('child_process');
const path = require('path');

// CI-style runner: starts server on an OS-assigned port (PORT=0), runs tests, then stops server.
const ROOT = path.join(__dirname, '..');

function startServer() {
  return new Promise((resolve, reject) => {
    // find a free port first
    const net = require('net');
    const tester = net.createServer();
    tester.listen(0, () => {
      const port = tester.address().port;
      tester.close(() => {
        const node = process.execPath;
        const serverJs = path.join(ROOT, 'server.js');
        const env = Object.assign({}, process.env, { PORT: String(port) });
        const proc = spawn(node, [serverJs], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';
        let resolved = false;

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            proc.kill();
            reject(new Error('Server did not start in time'));
          }
        }, 10000);

        proc.stdout.on('data', (d) => { const s = d.toString(); stdout += s; process.stdout.write(s); });
        proc.stderr.on('data', (d) => { const s = d.toString(); stderr += s; process.stderr.write(s); });
        proc.on('error', (err) => { if (!resolved) { resolved = true; clearTimeout(timeout); reject(err); } });
        proc.on('exit', (code, sig) => { if (!resolved) { resolved = true; clearTimeout(timeout); reject(new Error('Server exited prematurely: ' + code + ' ' + sig)); } });

        // Wait briefly then assume server is listening on chosen port
        setTimeout(()=>{
          resolved = true; clearTimeout(timeout); resolve({ proc, port, stdout, stderr });
        }, 700);
      });
    });
    tester.on('error', (err) => reject(err));
  });
}

function runTest(script, host) {
  return new Promise((resolve) => {
    const node = process.execPath;
    const opts = { cwd: ROOT, env: Object.assign({}, process.env, { HOST: host }) };
    const child = execFile(node, [script], opts, (err, stdout, stderr) => {
      resolve({ script, err, stdout, stderr });
    });
  });
}

(async function main(){
  console.log('CI runner: starting server...');
  try{
    const { proc, port } = await startServer();
    const host = `http://localhost:${port}`;
    console.log('\nServer started on', host);

    const tests = [ 'scripts/test_settings_save.js', 'scripts/test_upload.js', 'scripts/test_cross_session.js', 'scripts/test_unauth_attempt.js' ];
    const results = [];
    for (const t of tests){
      console.log('\nRunning', t);
      /* eslint-disable no-await-in-loop */
      const res = await runTest(t, host);
      results.push(res);
      console.log('--- stdout ---\n', res.stdout);
      if (res.stderr) console.log('--- stderr ---\n', res.stderr);
      console.log('--- exit ---\n', res.err ? res.err.message : 'ok');
    }

    // shutdown server
    console.log('\nStopping server...');
    try{ proc.kill(); }catch(e){ }

    // report summary
    let failed = 0;
    results.forEach(r => { if (r.err) failed++; });
    if (failed){
      console.error('\nCI runner: Some tests failed (count=' + failed + ').');
      process.exit(2);
    }
    console.log('\nCI runner: All tests passed.');
    process.exit(0);
  }catch(err){
    console.error('CI runner error', err && err.stack || err);
    process.exit(3);
  }
})();
