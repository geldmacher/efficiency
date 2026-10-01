import { chmodSync, existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";

// Executable tools confined to the verifier's disposable workspace. No real manager is on PATH.
export function writeRtkTools(root, { version = null, wrong = false, pinned = false, fail = false, noChange = false, tapRegistered = true, failTap = false, catalogVersion = "0.50.0" } = {}) {
  const bin = join(root, "bin"), prefix = join(root, "brew"), rtk = join(prefix, "bin", "rtk");
  mkdirSync(bin, { recursive: true }); mkdirSync(join(prefix, "bin"), { recursive: true });
  const state = join(root, "state.json"), mutations = join(root, "mutations.jsonl");
  writeFileSync(state, JSON.stringify({ version, wrong, pinned, fail, noChange, tapRegistered, failTap, catalogVersion }));
  const rtkCode = `#!${process.execPath}\nconst { readFileSync } = require('node:fs');
const state = JSON.parse(readFileSync(${JSON.stringify(state)}, 'utf8'));
if (process.argv[2] === '--version') process.stdout.write('rtk ' + state.version + '\\n');
else if (process.argv[2] === 'gain' && process.argv[3] === '--help' && !state.wrong) process.stdout.write('Usage: rtk gain. Show token savings\\n');
else process.exit(2);
`;
  if (version) { writeFileSync(rtk, rtkCode); chmodSync(rtk, 0o755); } else rmSync(rtk, { force: true });
  const brew = join(bin, "brew");
  writeFileSync(brew, `#!${process.execPath}\nconst { appendFileSync, chmodSync, readFileSync, writeFileSync } = require('node:fs');
const statePath = ${JSON.stringify(state)}, state = JSON.parse(readFileSync(statePath, 'utf8')), args = process.argv.slice(2);
if (args.join(' ') === 'info --json=v2 rtk-ai/tap/rtk') {
  if (!state.tapRegistered) { process.stderr.write('This command requires the tap rtk-ai/tap. Tap it explicitly and then try again.'); process.exit(1); }
  process.stdout.write(JSON.stringify({ formulae: [{ name: 'rtk', tap: 'rtk-ai/tap', versions: { stable: state.catalogVersion }, installed: state.version ? [{ version: state.version }] : [], pinned: state.pinned }] }));
}
else if (args.join(' ') === '--prefix rtk-ai/tap/rtk') process.stdout.write(${JSON.stringify(prefix)} + '\\n');
else if (args.join(' ') === 'tap') process.stdout.write(state.tapRegistered ? 'rtk-ai/tap\\n' : '');
else if (args.join(' ') === 'tap rtk-ai/tap https://github.com/rtk-ai/homebrew-tap') {
  appendFileSync(${JSON.stringify(mutations)}, JSON.stringify(args) + '\\n');
  if (state.failTap) { process.stderr.write('Controlled tap registration failure'); process.exit(2); }
  state.tapRegistered = true; writeFileSync(statePath, JSON.stringify(state));
}
else if (['install', 'upgrade'].includes(args[0]) && args[1] === 'rtk-ai/tap/rtk' && args.length === 2) {
  appendFileSync(${JSON.stringify(mutations)}, JSON.stringify(args) + '\\n');
  if (state.fail) { process.stderr.write('Controlled package failure'); process.exit(2); }
  if (!state.noChange) { state.version = '0.50.0'; writeFileSync(statePath, JSON.stringify(state)); writeFileSync(${JSON.stringify(rtk)}, ${JSON.stringify(rtkCode)}); chmodSync(${JSON.stringify(rtk)}, 0o755); }
} else process.exit(3);
`); chmodSync(brew, 0o755);
  const metadata = join(root, "stable-release.json");
  writeFileSync(metadata, JSON.stringify({ tag_name: "v0.50.0", draft: false, prerelease: false, html_url: "https://github.com/rtk-ai/rtk/releases/tag/v0.50.0" }));
  return { env: { ...process.env, PATH: [join(prefix, "bin"), bin].join(delimiter) }, metadata, state, mutations, rtk };
}

// Rustup chooses its proxy mode by invocation name; resolving cargo's symlink breaks dispatch.
export function writeCargoTools(root, { version = null, fail = false } = {}) {
  const cargoHome = join(root, "cargo"), bin = join(cargoHome, "bin");
  mkdirSync(bin, { recursive: true });
  const state = join(root, "state.json"), mutations = join(root, "mutations.jsonl"), rtk = join(bin, "rtk");
  writeFileSync(state, JSON.stringify({ version, fail }));
  const rtkCode = `#!${process.execPath}\nconst {readFileSync}=require('node:fs');
const state=JSON.parse(readFileSync(${JSON.stringify(state)},'utf8'));
if(process.argv[2]==='--version') process.stdout.write('rtk '+state.version+'\\n');
else if(process.argv[2]==='gain' && process.argv[3]==='--help') process.stdout.write('Usage: rtk gain. Show token savings\\n');
else process.exit(2);
`;
  if (version) { writeFileSync(rtk, rtkCode); chmodSync(rtk, 0o755); } else rmSync(rtk, { force: true });
  const rustup = join(bin, "rustup"), cargo = join(bin, "cargo");
  writeFileSync(rustup, `#!${process.execPath}\nconst {basename}=require('node:path');
const {appendFileSync,chmodSync,readFileSync,writeFileSync}=require('node:fs');
if(basename(process.argv[1])!=='cargo') { process.stderr.write('rustup: received Cargo arguments without proxy dispatch'); process.exit(2); }
const args=process.argv.slice(2),statePath=${JSON.stringify(state)},state=JSON.parse(readFileSync(statePath,'utf8'));
if(args.join(' ')==='install --list') {
  if(state.version) process.stdout.write('rtk v'+state.version+' (https://github.com/rtk-ai/rtk?tag=v'+state.version+'#abcd):\\n    rtk\\n');
} else if(JSON.stringify(args)===JSON.stringify(['install','--git','https://github.com/rtk-ai/rtk','--tag','v0.50.0','--locked',...(state.version?['--force']:[]),'rtk'])) {
  appendFileSync(${JSON.stringify(mutations)},JSON.stringify(args)+'\\n');
  if(state.fail) { process.stderr.write('Controlled Cargo failure'); process.exit(2); }
  state.version='0.50.0'; writeFileSync(statePath,JSON.stringify(state));
  writeFileSync(${JSON.stringify(rtk)},${JSON.stringify(rtkCode)}); chmodSync(${JSON.stringify(rtk)},0o755);
} else process.exit(3);
`); chmodSync(rustup, 0o755);
  if (!existsSync(cargo)) symlinkSync("rustup", cargo);
  const metadata = join(root, "stable-release.json");
  writeFileSync(metadata, JSON.stringify({ tag_name: "v0.50.0", draft: false, prerelease: false, html_url: "https://github.com/rtk-ai/rtk/releases/tag/v0.50.0" }));
  return { env: { ...process.env, CARGO_HOME: cargoHome, PATH: bin }, metadata, state, mutations, rtk, cargo, rustup };
}
