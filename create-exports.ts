import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";

const command = new Command();

// pascal case detection
const componentNameRegex = /^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/;

type RunArgs = {
  onlyComponent: boolean;
};

const run = ({ onlyComponent }: RunArgs) => {
  const cmd = new Deno.Command("ls");
  const { stdout } = cmd.outputSync();
  const outputStr = new TextDecoder().decode(stdout);
  const nameSet = new Set<string>(
    outputStr.split("\n").map<string | null>((fileOrDirName) => {
      const name = fileOrDirName.split(".")[0];
      if (onlyComponent) {
        return componentNameRegex.test(name) ? name : null;
      }
      return name;
    }).filter((name): name is string => !!name),
  );
  const sortedNames = Array.from(nameSet).sort((a, b) => a.localeCompare(b));
  Deno.writeTextFileSync(
    "index.ts",
    sortedNames.map((name) => {
      if (componentNameRegex.test(name)) {
        return `export {default as ${name}} from './${name}';\nexport * from './${name}';`;
      }
      return `export * from './${name}'`;
    }).join("\n"),
  );
};

command
  .name("create-export-file")
  .description("creates re-exporting ts file")
  .option(
    "-c, --only-component",
    "should export components only (detected by filename)",
  )
  .action(({ onlyComponent = false }) => {
    run({ onlyComponent });
  })
  .parse();
