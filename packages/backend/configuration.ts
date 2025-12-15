import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import * as _ from 'lodash';

const YAML_COMMON_CONFIG_FILENAME = 'config.yml';

const commonYamlPath = join(
  __dirname,
  '../config',
  YAML_COMMON_CONFIG_FILENAME,
);

const envYamlPath = join(
  __dirname,
  '../config',
  `config.${process.env.NODE_ENV || 'development'}.yml`,
);

const commonConfig = yaml.load(readFileSync(commonYamlPath, 'utf8'));
const envConfig = yaml.load(readFileSync(envYamlPath, 'utf8'));

// 因为ConfigModule有一个load方法 -> 函数
export default () => {
  return _.merge(commonConfig, envConfig) as Record<string, any>;
};
