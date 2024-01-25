const cmd = new Deno.Command("du", {
  args: ["-hd", "1", "node_modules/.pnpm"],
});
const { stdout } = await cmd.output();

console.log(stdout);
