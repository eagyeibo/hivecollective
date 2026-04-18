const { spawn } = require("child_process");
const path = require("path");

const root = __dirname;

function startProcess(name, cmd, args, cwd) {
  const proc = spawn(cmd, args, {
    cwd,
    shell: true,
    stdio: "inherit",
  });

  proc.on("error", (err) => console.error(`[${name}] Error:`, err.message));
  proc.on("close", (code) => console.log(`[${name}] Exited with code ${code}`));

  return proc;
}

console.log("Starting HiveCollective...\n");

startProcess("backend", "node", ["index.js"], path.join(root, "backend"));
startProcess("frontend", "npm", ["run", "dev"], path.join(root, "frontend"));
