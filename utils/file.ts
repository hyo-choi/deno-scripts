export function readJSONFile<T>(path: string) {
  const raw = Deno.readFileSync(path);
  const data = new TextDecoder("utf-8").decode(raw);
  const json = JSON.parse(data) as T;
  return json;
}
