import { DefaultCommandRunner } from "./command_runner.ts";

Deno.test("DefaultCommandRunner smoke test", async () => {
  const runner = new DefaultCommandRunner();
  await runner.run(".", ["sh", "-c", "echo 'Hello World!'"]);
});
