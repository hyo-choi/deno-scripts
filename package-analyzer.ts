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

class Runner {
  packageNames: string[];
  fileSizeMap = new Map<string, string>();

  constructor(public path: string) {
    const stream = Deno.readFileSync(path);
    const pnpmLockFileBody = new TextDecoder().decode(stream);
    const parsed = parseYaml(pnpmLockFileBody);
    if (!isPnpmLockFile(parsed)) {
      console.error(`${path} is not a pnpm lock file`);
      Deno.exit(1);
    }
    this.packageNames = Object.keys(parsed.packages).map(packageName => packageName.slice(1)).sort();
  }

  filterDuplicated() {
    const result = new Set<string>();
    for (let i = 0; i < this.packageNames.length - 1; i += 1) {
      const cur = this.packageNames[i];
      const next = this.packageNames[i + 1];
      const curPackageName = cur.split("@")[cur.startsWith("@") ? 1 : 0];
      const nextPackageName = next.split("@")[next.startsWith("@") ? 1 : 0];
      if (curPackageName === nextPackageName) {
        result.add(cur);
        result.add(next);
      }
    }
    this.packageNames = Array.from(result);
    return this;
  }

  getFileSizes() {
    const cmd = new Deno.Command("du", {
      args: ["-hd", "1", "node_modules/.pnpm"],
      stdout: "piped",
    });
    // FIXME: @mui/base@5.0.0-beta.24(@types/react@18.2.48)(react-dom@18.2.0)(react@18.2.0) 이런 케이스
    // 때문에 파일쪽이랑 lock쪽 둘다 뭐 해줘야할지도
    const { stdout } = cmd.outputSync();
    const output = new TextDecoder().decode(stdout);
    output.split("\n").forEach((info) => {
      const matchResult = info.match(
        /^\s*([0-9.GKM]*)\s*node_modules\/\.pnpm\/(.*@{1}[0-9.]*)$/,
        // /^\s*([0-9.GKM]*)\s*node_modules\/\.pnpm\/(.*)$/,
      );
      if (matchResult) {
        const [_, size, packageName] = matchResult;
        this.fileSizeMap.set(packageName.replace('+', '/'), size);
      }
    });
    return this;
  }
  
  print() {
    this.packageNames.forEach(packageName => {
      const size = this.fileSizeMap.get(packageName);
      console.log(`${size || '    '}\t${packageName}`);
    });
    return this;
  }
}

const run = ({ path, onlyDuplicated, showFileSize }: RunArgs) => {
  const runner = new Runner(path);
  if (onlyDuplicated) {
    runner.filterDuplicated();
  }
  if (showFileSize) {
    runner.getFileSizes();
  }
  runner.print();
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
