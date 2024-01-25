import fs from "https://deno.land/std@0.173.0/node/fs/promises.ts";
import { parse as parseYaml } from "https://deno.land/std@0.173.0/encoding/yaml.ts";
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";

const command = new Command();

const isPnpmLockFile = (
  a: unknown,
): a is { packages: Record<string, unknown> } => {
  // deno-lint-ignore no-explicit-any
  if (typeof a === "object" && typeof (a as any).packages === "object") {
    return true;
  }
  return false;
};

type RunArgs = {
  path: string;
  onlyDuplicated: boolean;
  showFileSize: boolean;
};

// FIXME: pipe 형식으로 하도록 고쳐야지
const run = async ({ path, onlyDuplicated, showFileSize }: RunArgs) => {
  const pnpmLockFileBody = await fs.readFile(path, { encoding: "utf8" });
  const parsed = parseYaml(pnpmLockFileBody);
  if (showFileSize) {
    const cmd = new Deno.Command("du", {
      args: ["-hd", "1", "node_modules/.pnpm"],
      stdout: "piped",
    });
    const { stdout } = await cmd.output();
    const output = new TextDecoder().decode(stdout);
    const sizeMap = new Map<string, string>();
    output.split("\n").forEach((info) =>
      {
        const matchResult = info.match(/^\s*([0-9.GKM]*)\s*node_modules\/\.pnpm\/(.*)$/);
        if (matchResult) {
          const [size, packageName] = matchResult;
          sizeMap.set(packageName, size);
        }
      }
    );
    console.log(sizeMap);
    return;
  }
  if (!isPnpmLockFile(parsed)) {
    console.error(`${path} is not a pnpm lock file`);
    Deno.exit(1);
  }
  const packages = Object.keys(parsed.packages).sort();
  if (!onlyDuplicated) {
    packages.forEach((packageName) => console.log(packageName));
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
  .option(
    "-s, --size",
    "show file size per package from store",
  )
  .action(({ input, duplicated = false, size = false }) => {
    run({ path: input, onlyDuplicated: duplicated, showFileSize: size });
  })
  .parse();
