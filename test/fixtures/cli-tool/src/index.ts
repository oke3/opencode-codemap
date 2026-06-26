import { Command } from "commander";

const program = new Command();
program
  .name("my-cli")
  .description("A sample CLI tool")
  .version("1.0.0");

program.parse(process.argv);
