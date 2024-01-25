import fs from "https://deno.land/std@0.173.0/node/fs/promises.ts";
import { parse as parseYaml } from "https://deno.land/std@0.173.0/encoding/yaml.ts";
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";

const command = new Command();

const isPnpmLockFile = (a: unknown): a is {packages: Record<string, unknown>} => {
  // deno-lint-ignore no-explicit-any
  if (typeof a === 'object' && typeof (a as any).packages === 'object') return true;
   return false;
}

type RunArgs = {
  path: string;
  onlyDuplicated: boolean;
}
const run = async ({ path, onlyDuplicated }: RunArgs) => {
  const pnpmLockFileBody = await fs.readFile(path, { encoding: "utf8" });
  const parsed = parseYaml(pnpmLockFileBody);
  if (!isPnpmLockFile(parsed)) {
    console.error(`${path} is not a pnpm lock file`);
    Deno.exit(1);
  }
  const packages = Object.keys(parsed.packages).sort();
  if (!onlyDuplicated) {
    packages.forEach(packageName => console.log(packageName));
    Deno.exit(0);
  }
  const result = new Set<string>();
  for (let i = 0; i < packages.length - 1; i += 1) {
    const cur = packages[i];
    const next = packages[i + 1];
    const curPackageName = cur.split("@")[cur.startsWith("/@") ? 1 : 0];
    const nextPackageName = next.split("@")[next.startsWith("/@") ? 1 : 0];
    if (curPackageName === nextPackageName) {
      result.add(cur);
      result.add(next);
    }
  }
  result.forEach((packageName) => console.log(packageName));

  // NOTE: pnpm 폴더 용량 계산하는 버전
  // const cmd = new Deno.Command("du", {
  //   args: ["-hd", "1", path],
  //   stdout: "piped",
  // });
  // const { stdout } = await cmd.output();
  // const output = new TextDecoder().decode(stdout);
  // const result = output.replaceAll(/^\s*[0-9.GKM]*\s*/gm, "");
  // console.log(result.split('\n').sort());
};

command
  .name("package-analyzer")
  .description("pnpm lock file analyzer")
  .option(
    "-i, --input <file-path>",
    "path to a pnpm-lock.yaml",
    { default: "pnpm-lock.yaml" },
  )
  .option(
    "-d, --duplicated",
    "show only duplicated packages",
  )
  .action(({ input, duplicated = false }) => {
    run({ path: input, onlyDuplicated: duplicated });
  })
  .parse();
