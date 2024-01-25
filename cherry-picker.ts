import { parse } from "https://deno.land/std@0.184.0/flags/mod.ts";

const args = parse(Deno.args);
const identifier = args["_"][0];

const a = await new Deno.Command(Deno.execPath(), {args: ['ls']}).output();
console.log(new TextDecoder().decode(a.stderr));
const cmd = new Deno.Command(Deno.execPath(), {
  args: ["git", "--no-pager", "log", "--oneline", "--max-count", "100"],
  stdout: "piped",
});
const { stdout } = await cmd.output();
const output = new TextDecoder().decode(stdout);

const commitList = output.split("\n").filter((commit) =>
  commit.includes(String(identifier))
);
console.log(commitList);
console.log(
  commitList.map((commit) => commit.split(" ")[0]).reverse().join(" "),
);
