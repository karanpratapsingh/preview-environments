import * as env from 'env-var';

const config = {
  // Domain for Cloudflare access policy
  domain: '<todo-your-domain>',
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
      filter: '<todo-your-security-group-tag>',
    },
    subnets: {
      filter: '<todo-your-subnet-tag>',
    },
  },
  ecs: {
    cluster: '<todo-your-ecs-cluster-name>',
  },
  cloudflare: {
    path: './outputs/tunnel',
    auth_email: '<todo-your-cloudflare-email>',
    api_key: env.get('CLOUDFLARE_API_KEY').required().asString(),
    token: env.get('CLOUDFLARE_API_TOKEN').required().asString(),
    accountId: env.get('CLOUDFLARE_ACCOUNT_ID').required().asString(),
    zoneId: env.get('CLOUDFLARE_ZONE_ID').required().asString(),
    domain: '<todo-your-cloudflare-domain>',
  },
};

export default config;
