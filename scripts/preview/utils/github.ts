import * as github from '@actions/github';
import { octokit } from '../clients';
import config from '../config';

const { pull_number } = config.github;

export async function commentOnPR(body: string): Promise<void> {
  const request = {
    ...github.context.repo,
    issue_number: pull_number,
    body,
  };

  await octokit.rest.issues.createComment(request);
}

export async function getCurrentBranch(): Promise<string> {
  const request = {
    ...github.context.repo,
    pull_number,
  };

  const result = await octokit.rest.pulls.get(request);
  const branch = result.data.head.ref;

  return branch;
}
