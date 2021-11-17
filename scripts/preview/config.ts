import * as env from 'env-var';

const config = {
  // Domain for Cloudflare access policy
  domain: '<todo_your_domain>',
  aws: {
    region: 'us-east-1',
  },
  github: {
    // Token and Pull request no. will be available in Github Action
    token: env.get('GITHUB_TOKEN').required().asString(),
    pull_number: env.get('PULL_NUMBER').required().asInt(),
  },
  vpc: {
    securityGroups: {
      filter: '<todo_your_security_group_tag>',
    },
    subnets: {
      filter: '<todo_your_subnet_tag>',
    },
  },
  ecs: {
    cluster: '<todo_your_ecs_cluster_name>',
  },
  cloudflare: {
    path: './outputs/tunnel',
    auth_email: '<todo_your_cloudflare_email>',
    api_key: env.get('CLOUDFLARE_API_KEY').required().asString(),
    token: env.get('CLOUDFLARE_API_TOKEN').required().asString(),
    accountId: env.get('CLOUDFLARE_ACCOUNT_ID').required().asString(),
    zoneId: env.get('CLOUDFLARE_ZONE_ID').required().asString(),
    domain: '<todo_your_cloudflare_domain>',
  },
};

export default config;
