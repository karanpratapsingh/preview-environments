import * as github from '@actions/github';
import slugify from 'slugify';
import CloudflareUtils from './utils/cloudflare';
import ECSUtils from './utils/ecs';
import * as GithubUtils from './utils/github';
import * as VPCUtils from './utils/vpc';
import log from './utils/log';

interface PreviewInterface {
  /**
   * PROVISION
   *  state: open
   *  event: labeled, synchronize
   */
  provision(taskDefArn: string): Promise<void>;
  /**
   * Destroy
   *  state: open | closed
   *  event: unlabeled, closed
   */
  destroy(): Promise<void>;
  /**
   * Tunnel
   *  state: open
   *  event: labeled, synchronize
   */
  tunnel(): Promise<void>;
}

class Preview implements PreviewInterface {
  private slug: string;

  constructor(branch: string) {
    const options = {
      lower: true,
    };

    const suffix = `${branch}-preview`;
    this.slug = slugify(suffix, options);

    log.info(`Using slug "${this.slug}" for branch "${branch}"`);
  }

  async provision(taskDefArn: string): Promise<void> {
    try {
      log.info(`Provisioning resources for task definition arn: ${taskDefArn}`);

      const subnets = await VPCUtils.getSubnets();
      const securityGroups = await VPCUtils.getSecurityGroups();

      const ecs = new ECSUtils(this.slug);
      const cloudflare = new CloudflareUtils(this.slug);

      await ecs.runTask(taskDefArn, subnets, securityGroups);

      const comment = `Your preview environment should be up at https://${cloudflare.domain} in few moments! 🎉`;

      if (github.context.payload.action === 'labeled') {
        await GithubUtils.commentOnPR(comment);
      }

      log.success(comment);
    } catch (error) {
      log.error(error);
      log.warn('Performing rollback!');
      this.destroy();
      process.exit(1);
    }
  }

  async destroy(): Promise<void> {
    try {
      log.info(`Destroying resources`);
      const ecs = new ECSUtils(this.slug);
      const cloudflare = new CloudflareUtils(this.slug);

      await ecs.stopTask();

      await cloudflare.removeDNSRecord();
      await cloudflare.deleteTunnels();
      await cloudflare.removeAccess();
      log.success('Resources destroyed');
    } catch (error) {
      log.error(error);
      process.exit(1);
    }
  }

  async tunnel(): Promise<void> {
    try {
      const cloudflare = new CloudflareUtils(this.slug);

      const tunnelId = await cloudflare.createTunnel();
      cloudflare.createConfigFile(tunnelId);
      await cloudflare.addDNSRecord(tunnelId);
      await cloudflare.createAccess();
      log.success('Tunnel setup complete');
    } catch (error) {
      log.error(error);
      process.exit(1);
    }
  }
}

export default Preview;
