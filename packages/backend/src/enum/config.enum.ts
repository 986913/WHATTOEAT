export enum ConfigEnum {
  // MySQL 配置
  DB_HOST = 'db.mysql.host',
  DB_NAME = 'db.mysql.name',
  DB_PORT = 'db.mysql.port',
  DB_SYNC = 'db.mysql.sync',
  DB_TYPE = 'db.mysql.type',
  DB_USERNAME = 'db.mysql.username',
  DB_PASSWORD = 'db.mysql.password',

  // JWT 密钥
  JWT_SECRET = 'secrets.jwtsecret',
}

export enum LogEnum {
  LOG_LEVEL = 'log.level',
  LOG_ON = 'log.on',
}
