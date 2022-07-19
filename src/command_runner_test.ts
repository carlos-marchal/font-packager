import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
} from "https://deno.land/std@0.148.0/testing/asserts.ts";

import {
  CommandExecutionError,
  DefaultCommandRunner,
} from "./command_runner.ts";

Deno.test("DefaultCommandRunner smoke test", async () => {
  const runner = new DefaultCommandRunner();
  await runner.run(".", ["sh", "-c", "echo 'Hello World!'"]);
});

Deno.test("DefaultCommandRunner runs in specified directory", async () => {
  const runner = new DefaultCommandRunner();
  const command = ["sh", "-c", '[ "$PWD" = "/tmp" ] && exit 0 || exit 1'];
  await runner.run("/tmp", command);
});

Deno.test("DefaultCommandRunner throws on error", async () => {
  const runner = new DefaultCommandRunner();
  const stderr = "Sample Stderr Error!";
  const failCommand = `echo -n '${stderr}' > /dev/stderr && exit 1`;
  const error = await assertRejects(async () => {
    await runner.run(".", ["sh", "-c", failCommand]);
  });
  assertInstanceOf(error, CommandExecutionError);
  assertEquals(error.stederr, stderr);
});
