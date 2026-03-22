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

  // Google OAuth
  GOOGLE_CLIENT_ID = 'google.clientId',
  GOOGLE_CLIENT_SECRET = 'google.clientSecret',
  GOOGLE_CALLBACK_URL = 'google.callbackUrl',
  FRONTEND_URL = 'google.frontendUrl',

  // Redis
  REDIS_HOST = 'redis.host',
  REDIS_PORT = 'redis.port',
  REDIS_TTL = 'redis.ttl',
  REDIS_TLS = 'redis.tls',

  // Mail (Gmail SMTP)
  MAIL_USER = 'mail.user',
  MAIL_PASS = 'mail.pass',

  // Slack
  SLACK_WEBHOOK_URL = 'slack.webhookUrl',
}

export enum LogEnum {
  LOG_LEVEL = 'log.level',
  LOG_ON = 'log.on',
}
