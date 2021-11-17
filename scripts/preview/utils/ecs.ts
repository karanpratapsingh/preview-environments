import * as Clients from '../clients';
import config from '../config';
import log from './log';

const { cluster } = config.ecs;

export default class ECSUtils {
  private slug: string;

  constructor(slug: string) {
    this.slug = slug;
  }

  async runTask(
    taskDefinitionArn: string,
    subnets: string[],
    securityGroups: string[]
  ): Promise<void> {
    await this.stopTask();

    const tags: Array<AWS.ECS.Tag> = [
      {
        key: 'slug',
        value: this.slug,
      },
      {
        key: 'platform',
        value: 'Fargate',
      },
      {
        key: 'type',
        value: 'Preview',
      },
    ];

    const params: AWS.ECS.RunTaskRequest = {
      cluster,
      taskDefinition: taskDefinitionArn,
      launchType: 'FARGATE',
      tags,
      enableExecuteCommand: true,
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets,
          securityGroups,
          assignPublicIp: 'ENABLED',
        },
      },
    };

    const tagParams: AWS.ECS.Types.TagResourceRequest = {
      resourceArn: taskDefinitionArn,
      tags,
    };

    log.info('Tagging task definition');
    await Clients.ecs.tagResource(tagParams).promise();

    log.info('Starting a new task');
    const { tasks } = await Clients.ecs.runTask(params).promise();

    if (!tasks?.length) {
      throw new Error('[runTask]: Tasks not found');
    }

    const [task] = tasks;

    if (!task) {
      throw new Error('[runTask]: No task was started');
    }

    if (!task.taskArn) {
      throw new Error('[runTask]: No task ARN found');
    }

    await waitForTaskState(task.taskArn, 'RUNNING');
  }

  async stopTask(): Promise<void> {
    const runningTask = await getRunningTask(this.slug);

    if (!runningTask) return;

    if (!runningTask?.taskArn) {
      throw new Error(`[stopTask]: Running task returned invalid taskArn`);
    }

    const params: AWS.ECS.StopTaskRequest = {
      cluster,
      task: runningTask.taskArn,
    };

    log.info(`Stopping running task`);
    await Clients.ecs.stopTask(params).promise();
    await waitForTaskState(runningTask.taskArn, 'STOPPED');
    log.info(`Stopped task ${runningTask.taskArn}`);
  }
}

type TaskState = 'RUNNING' | 'PROVISIONING' | 'PENDING' | 'STOPPED';

async function waitForTaskState(
  taskArn: string,
  state: TaskState
): Promise<AWS.ECS.Task> {
  return new Promise((resolve, reject) => {
    let timer = 0;
    const timeout = 300_000; // 300 seconds
    const interval = 10_000; // 10 seconds

    const intervalId = setInterval(async () => {
      const time = timer / 1000;
      log.info(`Waiting for task to be in ${state} state ${time}s...`);

      const [task] = await getTasksDetails([taskArn]);

      if (task.lastStatus === state) {
        clearInterval(intervalId);
        log.info(`Task is in ${state} state`);
        return resolve(task);
      }

      timer += interval;

      if (timer >= timeout) {
        clearInterval(intervalId);
        return reject(`Timeout for task ${state} state`);
      }
    }, interval);
  });
}

async function getTasksDetails(taskArns: string[]): Promise<AWS.ECS.Task[]> {
  const params: AWS.ECS.DescribeTasksRequest = {
    cluster,
    tasks: taskArns,
    include: ['TAGS'],
  };

  const { tasks } = await Clients.ecs.describeTasks(params).promise();
  if (!tasks?.length) {
    throw new Error(`[getTasksDetails]: Tasks not found`);
  }

  return tasks;
}

async function getRunningTask(slug: string): Promise<AWS.ECS.Task | undefined> {
  const params: AWS.ECS.ListTasksRequest = {
    cluster,
    desiredStatus: 'RUNNING',
  };

  const tasks = await Clients.ecs.listTasks(params).promise();

  if (!tasks.taskArns) {
    throw new Error('[getRunningTask]: tasks arns does not exist');
  }

  const allTasks = await getTasksDetails(tasks.taskArns);
  const runningTasks = allTasks.filter(task => {
    const hasTag = (task.tags || []).find(tag => tag.value === slug);
    return Boolean(hasTag);
  });

  if (!runningTasks.length) {
    log.warn(`No running task found for: ${slug}`);
    return undefined;
  }

  const [runningTask] = runningTasks;
  log.info(`Running task found for: ${slug}`);
  return runningTask;
}
