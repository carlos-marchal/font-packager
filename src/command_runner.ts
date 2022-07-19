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
      const status = await process.status();
      if (!status.success) {
        const stderrRaw = await process.stderrOutput();
        const stderrString = new TextDecoder().decode(stderrRaw);
        throw new CommandExecutionError(command, stderrString);
      } else {
        process.stderr.close();
      }
    } finally {
      process.close();
    }
  }
}

export class CommandExecutionError extends Error {
  command: string[];
  stederr: string;
  constructor(command: string[], stderr: string) {
    super(`error executing command "${command.join(" ")}":\n${stderr}`);
    this.command = command;
    this.stederr = stderr;
  }
}
