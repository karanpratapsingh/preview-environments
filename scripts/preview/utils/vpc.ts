import * as Clients from '../clients';
import config from '../config';
import * as AWS from 'aws-sdk';
import log from './log';

const { subnets, securityGroups } = config.vpc;

export async function getSubnets(): Promise<Array<string>> {
  const params: AWS.EC2.DescribeSubnetsRequest = {
    Filters: [
      {
        Name: 'tag:Name',
        Values: [subnets.filter],
      },
    ],
  };

  const result = await Clients.ec2.describeSubnets(params).promise();
  const ids: Array<string> = [];
  const tags: Array<string> = [];

  result.Subnets?.forEach(({ SubnetId, Tags }): void => {
    if (SubnetId) ids.push(SubnetId);
    if (Tags) {
      const [tag] = Tags;
      if (tag?.Value) tags.push(tag.Value);
    }
  });

  log.info('Using subnets:', formatTags(tags));
  return ids;
}

export async function getSecurityGroups(): Promise<Array<string>> {
  const params: AWS.EC2.DescribeSubnetsRequest = {
    Filters: [
      {
        Name: 'group-name',
        Values: [securityGroups.filter],
      },
    ],
  };

  const result = await Clients.ec2.describeSecurityGroups(params).promise();

  const ids: Array<string> = [];
  const names: Array<string> = [];

  result.SecurityGroups?.forEach(({ GroupId, GroupName }): void => {
    if (GroupId) ids.push(GroupId);
    if (GroupName) names.push(GroupName);
  });

  log.info('Using security groups:', formatTags(names));

  return ids;
}

function formatTags(tags: Array<string>): string {
  return tags.join(', ');
}
