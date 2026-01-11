/**
 * Reserved Subdomains List
 * These subdomains are blocked from being registered by users
 */

export const RESERVED_SUBDOMAINS = [
  // System/Admin
  'admin',
  'administrator',
  'root',
  'system',
  'sys',
  'superuser',
  'moderator',
  'mod',
  'staff',
  'support',
  'help',
  'helpdesk',
  'service',

  // API/Technical
  'api',
  'www',
  'mail',
  'email',
  'smtp',
  'pop',
  'pop3',
  'imap',
  'ftp',
  'ssh',
  'sftp',
  'webmail',
  'ns',
  'ns1',
  'ns2',
  'ns3',
  'ns4',
  'dns',
  'mx',
  'mx1',
  'mx2',
  'cdn',
  'static',
  'assets',
  'media',
  'images',
  'img',
  'cdn1',
  'cdn2',
  'files',
  'download',
  'downloads',
  'uploads',
  'storage',
  'backup',
  'cache',

  // Services
  'blog',
  'shop',
  'store',
  'forum',
  'community',
  'wiki',
  'docs',
  'documentation',
  'dev',
  'development',
  'staging',
  'stage',
  'test',
  'testing',
  'qa',
  'demo',
  'sandbox',
  'preview',
  'app',
  'application',
  'web',
  'mobile',

  // Database
  'db',
  'database',
  'mysql',
  'postgres',
  'postgresql',
  'mongo',
  'mongodb',
  'redis',
  'elasticsearch',
  'elastic',
  'cassandra',

  // Monitoring/Tools
  'status',
  'monitor',
  'monitoring',
  'metrics',
  'analytics',
  'stats',
  'statistics',
  'logs',
  'logger',
  'logging',
  'grafana',
  'prometheus',
  'kibana',
  'sentry',

  // Business
  'billing',
  'payment',
  'payments',
  'checkout',
  'invoice',
  'invoices',
  'account',
  'accounts',
  'dashboard',
  'console',
  'portal',
  'panel',
  'cpanel',
  'controlpanel',

  // Security
  'security',
  'ssl',
  'tls',
  'cert',
  'certificate',
  'ca',
  'vpn',
  'firewall',
  'auth',
  'oauth',
  'saml',
  'sso',

  // Common words that might cause confusion
  'saas',
  'platform',
  'cloud',
  'server',
  'servers',
  'client',
  'clients',
  'user',
  'users',
  'customer',
  'customers',
  'public',
  'private',
  'internal',
  'external',
  'prod',
  'production',

  // Brand protection (major tech companies)
  'google',
  'facebook',
  'amazon',
  'microsoft',
  'apple',
  'twitter',
  'instagram',
  'linkedin',
  'github',
  'gitlab',
  'bitbucket',
  'stripe',
  'paypal',
  'aws',
  'azure',
  'gcp',
  'digitalocean',
  'heroku',
  'vercel',
  'netlify',

  // Reserved for internal use
  'internal',
  'localhost',
  'local',
  'example',
  'test',
  'demo',

  // IP-like patterns
  '127',
  '192',
  '10',
  '172',

  // Mail-related
  'postmaster',
  'hostmaster',
  'webmaster',
  'abuse',
  'noc',
  'sales',
  'marketing',
  'info',
  'contact',

  // Common typos/variations
  'wwww',
  'ww',
  'w3',
  'ftp1',
  'ftp2',
  'mail1',
  'mail2',

  // Special/Meta
  'beta',
  'alpha',
  'v1',
  'v2',
  'version',
  'old',
  'new',
  'temp',
  'tmp',
];

/**
 * Check if a subdomain name is reserved
 */
export const isReservedSubdomain = (name: string): boolean => {
  return RESERVED_SUBDOMAINS.includes(name.toLowerCase());
};

/**
 * Get the count of reserved subdomains
 */
export const getReservedSubdomainCount = (): number => {
  return RESERVED_SUBDOMAINS.length;
};
