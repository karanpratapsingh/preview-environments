import * as AWS from 'aws-sdk';
import * as github from '@actions/github';
import * as Cloudflare from 'cloudflare';
import config from './config';

/**
 * AWS
 *
 * credentials are present at run time
 */
export const ecs = new AWS.ECS(config.aws);
export const ec2 = new AWS.EC2(config.aws);

/**
 * Github
 *
 * temporary token is provided at runtime by the github action
 */
export const octokit = github.getOctokit(config.github.token);

/**
 * Cloudflare
 *
 * cloudflare api client
 */
export const cloudflare = new Cloudflare({ token: config.cloudflare.token });
