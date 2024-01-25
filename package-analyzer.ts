const cmd = new Deno.Command(Deno.execPath(), {
  args: ["du", "-hd", "1", "node_modules/.pnpm"],
});
const { stdout } = await cmd.output();

console.log(stdout);
