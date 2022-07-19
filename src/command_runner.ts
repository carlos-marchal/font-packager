export interface CommandRunner {
  run: (cwd: string, command: string[]) => Promise<void>;
}

export class DefaultCommandRunner implements CommandRunner {
  async run(cwd: string, command: string[]): Promise<void> {
    const process = Deno.run({
      cmd: command,
      stderr: "piped",
      stdout: "null",
      cwd,
    });
    try {
      await process.status();
    } finally {
      process.stderr.close();
      process.close();
    }
  }
}
