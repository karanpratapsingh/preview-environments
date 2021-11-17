import Preview from '../preview';
import { ArgumentParser } from 'argparse';
import * as GithubUtils from '../utils/github';

const parser = new ArgumentParser({
  description: 'Provision preview environment',
});

parser.add_argument('-td', '--task-def-arn', {
  required: true,
  help: 'Task definition arn',
});

async function run(): Promise<void> {
  const { task_def_arn } = parser.parse_args();
  const branch = await GithubUtils.getCurrentBranch();

  const preview = new Preview(branch);
  await preview.provision(task_def_arn);
}

run();
