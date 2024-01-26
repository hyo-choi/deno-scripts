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
  sortBySize: boolean;
  reverse: boolean;
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
    this.packageNames = Object.keys(parsed.packages).map(packageName => packageName.slice(1).split('(')[0]).sort();
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
    const { stdout } = cmd.outputSync();
    const output = new TextDecoder().decode(stdout);
    output.split("\n").forEach((info) => {
      const matchResult = info.match(
        /^\s*([0-9.GMKB]*)\s*node_modules\/\.pnpm\/(@{0,1}[\w\d.+-]*@{1}[0-9.]*)/,
      );
      if (matchResult) {
        const [_, size, packageName] = matchResult;
        this.fileSizeMap.set(packageName.replace('+', '/'), size);
      }
    });
    return this;
  }
  
  print({sortBySize, reverse}: Pick<RunArgs, 'sortBySize' | 'reverse'>) {
    const makeResult = (packageName: string, size?: string) => {
      const prefix = this.fileSizeMap.size === 0 ? '' : `${size ?? ''}\t`;
      return `${prefix}${packageName}`;
    }
    const results: string[] = [];

    if (sortBySize) {
      const unitMap = {
        B: 0,
        K: 1,
        M: 2,
        G: 3,
      }
      const getSizeNumberAndUnit = (sizeStr?: string): {number: number; unit: keyof typeof unitMap} => {
        if (!sizeStr) return {number: 0, unit: 'B'};
        const result = sizeStr.match(/([0-9.]*)([GMKB]{1})/);
        if (!result) throw new Error('TODO:');
        return {number: Number(result[1]), unit: result[2] as keyof typeof unitMap};
      };
      [...this.packageNames].sort((a, b) => {
        const {number: aNumber, unit: aUnit} = getSizeNumberAndUnit(this.fileSizeMap.get(a));
        const {number: bNumber, unit: bUnit} = getSizeNumberAndUnit(this.fileSizeMap.get(b));
        if (aUnit === bUnit) {
          return aNumber - bNumber;
        };
        return unitMap[aUnit] - unitMap[bUnit];
      }).forEach((packageName) => {
        results.push(makeResult(packageName, this.fileSizeMap.get(packageName)));
      });

    } else {
      this.packageNames.forEach(packageName => {
        results.push(makeResult(packageName, this.fileSizeMap.get(packageName)));
      });
    }

    if (reverse) {
      results.reverse();
    }
    results.forEach((result) => console.log(result));
    return this;
  }
}

const run = ({ path, onlyDuplicated, showFileSize, sortBySize, reverse }: RunArgs) => {
  const runner = new Runner(path);
  if (onlyDuplicated) {
    runner.filterDuplicated();
  }
  if (showFileSize) {
    runner.getFileSizes();
  }
  runner.print({sortBySize, reverse});
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
    "show only duplicated packages"
  )
  .option(
    "-s, --size",
    "show file size per package from store",
  )
  .option(
    "-S, --size-and-sort",
    "show file size per package from store and sort by size",
  )
  .option(
    "-r, --reverse",
    "reverse sorted result"
  )
  .action(({ input, duplicated = false, size = false, sizeAndSort = false, reverse = false }) => {
    run({ path: input, onlyDuplicated: duplicated, showFileSize: size || sizeAndSort, sortBySize: sizeAndSort, reverse });
  })
  .parse();
