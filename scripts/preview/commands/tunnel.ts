import Preview from '../preview';
import * as GithubUtils from '../utils/github';

async function run(): Promise<void> {
  const branch = await GithubUtils.getCurrentBranch();

  const preview = new Preview(branch);
  await preview.tunnel();
}

run();
