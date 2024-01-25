import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";

const command = new Command();

const run = async ({ path }: { path: string }) => {
  const cmd = new Deno.Command("du", {
    args: ["-hd", "1", path],
    stdout: "piped",
  });
  const { stdout } = await cmd.output();
  const output = new TextDecoder().decode(stdout);
  const result = output.replaceAll(/^\s*[0-9.GKM]*\s*/gm, "");
  console.log(result.split('\n').sort());
};

command
  .name("package-analyzer")
  .description("NodeJS package analyzer")
  .option(
    "-i, --input <file-path>",
    "path to a node_modules or .pnpm directory",
    {
      default: "node_modules/.pnpm",
    },
  )
  .action(({ input }) => {
    run({ path: input });
  })
  .parse();
