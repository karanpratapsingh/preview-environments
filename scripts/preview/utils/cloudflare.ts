import * as Cloudflare from 'cloudflare';
import { cloudflare } from '../clients';
import config from '../config';
import * as fs from 'fs';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import * as shortid from 'shortid';
import * as yml from 'js-yaml';
import log from './log';

const { zoneId, domain, path, accountId, api_key, auth_email } = config.cloudflare;

export default class CloudflareUtils {
  private slug: string;
  public domain: string;

  constructor(slug: string) {
    this.slug = slug;
    this.domain = getDomainName(this.slug);
  }

  async createTunnel(): Promise<string> {
    const uuid = shortid.generate();
    const name = `${this.slug}-${uuid}`;
    const tunnel_secret = crypto.randomBytes(32).toString('base64');

    const data = {
      name,
      tunnel_secret,
    };

    log.info(`Creating tunnel: ${name}`);

    const response: any = await API().post('/tunnels', data);
    const { result } = response.data;

    const tunnelId = result.id;
    log.info(`Creating credentials file for tunnelId: ${tunnelId}`);

    const credentials = JSON.stringify(result.credentials_file);
    fs.writeFileSync(`${path}/${tunnelId}.json`, credentials);

    return tunnelId;
  }

  createConfigFile(tunnelId: string): void {
    log.info(`Creating config.yml using tunnelId: ${tunnelId}`);

    const credentialsFile = `/root/.cloudflared/${tunnelId}.json`;

    const config = yml.dump({
      tunnel: tunnelId,
      'credentials-file': credentialsFile,
      ingress: [
        {
          hostname: `${this.slug}.cb-access.com`,
          service: 'http://localhost:80',
        },
        {
          service: 'http_status:404',
        },
      ],
    });

    fs.writeFileSync(`${path}/config.yml`, config);
  }

  async deleteTunnels(): Promise<void> {
    const tunnels = await findTunnels(this.slug);

    log.info('Deleting tunnels');

    for (const tunnel of tunnels) {
      try {
        await API().delete(`/tunnels/${tunnel.id}`);
        log.warn(`Deleted tunnel ${tunnel.name}`);
      } catch (error) {
        const { id, name } = tunnel;
        log.error(`Failed to delete tunnel: ${id} -> ${name}`);
        const [{ message }] = error?.response?.data?.errors;
        log.error(message);
      }
    }

    log.info(`Deleted ${tunnels.length} tunnels`);
  }

  async addDNSRecord(tunnelId: string): Promise<void> {
    const name = getDomainName(this.slug);

    const type: Cloudflare.RecordTypes = 'CNAME';
    const content = `${tunnelId}.cfargotunnel.com`;

    const foundRecord = await findRecord(this.slug);

    const record: Cloudflare.DnsRecord = {
      type,
      name,
      content,
      ttl: 300,
      proxied: true,
    };

    if (foundRecord) {
      log.info(`Updating Cloudflare DNS record: ${name}`);
      await cloudflare.dnsRecords.edit(zoneId, foundRecord.id, record);
      return;
    }

    log.info(`Adding Cloudflare DNS record: ${name}`);
    await cloudflare.dnsRecords.add(zoneId, record);
    await developmentMode('on');
  }

  async removeDNSRecord(): Promise<void> {
    const foundRecord = await findRecord(this.slug);

    const name = getDomainName(this.slug);

    if (!foundRecord) {
      log.warn('Cloudflare DNS record not found (skipping)');
      return;
    }

    log.info(`Removing Cloudflare DNS record: ${name}`);
    await cloudflare.dnsRecords.del(zoneId, foundRecord.id);
    await developmentMode('off');
  }

  async createAccess(): Promise<void> {
    try {
      log.info(`Creating access for domain: ${getDomainName(this.slug)}`);

      const id = await createAccessApp(this.slug);
      await createAccessPolicy(id, this.slug);
    } catch (error) {
      const [{ message }] = error?.response?.data?.errors;
      log.error(message);
    }
  }

  async removeAccess(): Promise<void> {
    try {
      const foundApp = await findAccessApp(this.slug);
      const domain = getDomainName(this.slug);

      if (!foundApp) {
        log.warn(`Access app not found for domain: ${domain} (skipping)`);
        return;
      }

      log.info(`Removing access for domain: ${domain}`);
      await removeAccessPolicy(foundApp.id, this.slug);
      await removeAccessApp(foundApp.id);
    } catch (error) {
      const [{ message }] = error?.response?.data?.errors;
      log.error(message);
    }
  }
}

/**
 * TODO: This will be removed once cloudflare updates their node sdk
 * Ref: https://github.com/cloudflare/node-cloudflare/issues/100
 */
function API(): AxiosInstance {
  const baseURL = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;

  const headers = {
    'X-Auth-Email': auth_email,
    'X-Auth-Key': api_key,
    'Content-Type': 'application/json',
  };

  const config = {
    baseURL,
    headers,
  };

  return axios.create(config);
}

type TunnelInfo = {
  id: string;
  name: string;
};

async function findTunnels(slug: string): Promise<Array<TunnelInfo>> {
  const result: any = await API().get('/tunnels');

  return result.data.result
    .filter((res: any) => res.name.includes(slug))
    .map(({ id, name }: any) => ({ id, name }));
}

async function findRecord(slug: string): Promise<any> {
  const name = getDomainName(slug);
  const records: any = await cloudflare.dnsRecords.browse(zoneId);
  const type: Cloudflare.RecordTypes = 'CNAME';

  const [record] = records?.result?.filter(
    (record: Cloudflare.DnsRecordWithoutPriority) =>
      record.name === name && record.type === type
  );

  return record;
}

async function createAccessApp(slug: string): Promise<string> {
  const foundApp = await findAccessApp(slug);

  if (foundApp) {
    log.warn(`Access app found (skipping)`);
    return foundApp.id;
  }

  const name = `Preview Environment (${slug})`;
  const domain = getDomainName(slug);

  const request = {
    name,
    domain,
  };

  log.info('Creating access app');
  const { data }: any = await API().post('/access/apps', request);

  return data.result.id;
}

async function createAccessPolicy(appId: string, slug: string): Promise<void> {
  const { domain } = config;

  const foundPolicy = await findAccessPolicy(appId, slug);

  if (foundPolicy) {
    log.warn('Access policy found (skipping)');
    return;
  }

  const request = {
    name: slug,
    decision: 'allow',
    include: [{ email_domain: { domain } }],
  };

  log.info(`Creating access policy for appId: ${appId}`);
  await API().post(`/access/apps/${appId}/policies`, request);
}

async function removeAccessApp(id: string): Promise<void> {
  await API().delete(`/access/apps/${id}`);
  log.success('Removed access app');
}

async function removeAccessPolicy(appId: string, slug: string): Promise<void> {
  const foundPolicy = await findAccessPolicy(appId, slug);

  if (!foundPolicy) {
    log.warn('Access policy not found (skipping)');
    return;
  }

  await API().delete(`/access/apps/${appId}/policies/${foundPolicy.id}`);
  log.success(`Removed access policy`);
}

type AppInfo = {
  id: string;
  name: string;
  domain: string;
};

async function findAccessApp(slug: string): Promise<AppInfo | undefined> {
  const { data }: any = await API().get('/access/apps');
  const app = data?.result?.find(
    ({ domain }: any) => domain === getDomainName(slug)
  );

  if (app) {
    const { id, name, domain } = app;
    return { id, name, domain };
  }

  return undefined;
}

type PolicyInfo = {
  id: string;
  name: string;
};

async function findAccessPolicy(
  id: string,
  slug: string
): Promise<PolicyInfo | undefined> {
  const { data }: any = await API().get(`/access/apps/${id}/policies`);
  const policy = data?.result?.find(({ name }: any) => name === slug);

  if (policy) {
    const { id, name } = policy;
    return { id, name };
  }

  return undefined;
}

type AccessGroupsInfo = {
  group: {
    id: string;
  };
};

type DevelopmentModeValue = 'on' | 'off';

async function developmentMode(value: DevelopmentModeValue): Promise<void> {
  await cloudflare.zoneSettings.edit(zoneId, 'development_mode', { value });
  log.warn(`Turned ${value} development mode`);
}

function getDomainName(slug: string): string {
  return `${slug}.${domain}`;
}
