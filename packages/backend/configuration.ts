import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import * as _ from 'lodash';
import * as dotenv from 'dotenv';

// 在 YML 解析之前先加载 .env，确保 ${VAR} 占位符能正确解析
dotenv.config();

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

// 递归解析所有 ${ENV_VAR} 占位符，替换为对应的环境变量值
function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] || '');
  }
  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars);
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveEnvVars(value);
    }
    return result;
  }
  return obj;
}

// 因为ConfigModule有一个load方法 -> 函数
export default () => {
  const merged = _.merge(commonConfig, envConfig);
  return resolveEnvVars(merged) as Record<string, any>;
};
