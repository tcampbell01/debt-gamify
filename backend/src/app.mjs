import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManagerClient({});
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:8000';

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json',
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  },
  body: JSON.stringify(body)
});

async function readSecret() {
  const result = await secretsManager.send(new GetSecretValueCommand({ SecretId: process.env.PLAID_SECRET_ARN }));
  const value = JSON.parse(result.SecretString || '{}');
  if (!value.clientId || !value.secret) throw new Error('Plaid clientId and secret are not configured');
  return value;
}

async function writeSecret(value) {
  await secretsManager.send(new PutSecretValueCommand({
    SecretId: process.env.PLAID_SECRET_ARN,
    SecretString: JSON.stringify(value)
  }));
}

function plaidClient(credentials) {
  const environment = process.env.PLAID_ENV || 'sandbox';
  const configuration = new Configuration({
    basePath: PlaidEnvironments[environment],
    baseOptions: { headers: { 'PLAID-CLIENT-ID': credentials.clientId, 'PLAID-SECRET': credentials.secret } }
  });
  return new PlaidApi(configuration);
}

export const handler = async event => {
  if (event.requestContext?.http?.method === 'OPTIONS') return response(204, {});
  try {
    const credentials = await readSecret();
    const plaid = plaidClient(credentials);
    const path = event.rawPath || '';

    if (path.endsWith('/plaid/link-token')) {
      const result = await plaid.linkTokenCreate({
        user: { client_user_id: 'personal-debt-hero' },
        client_name: 'Debt Hero',
        products: [Products.Transactions],
        optional_products: [Products.Balance],
        country_codes: [CountryCode.Us],
        language: 'en'
      });
      return response(200, { link_token: result.data.link_token });
    }

    if (path.endsWith('/plaid/exchange-token')) {
      const body = JSON.parse(event.body || '{}');
      if (!body.public_token) return response(400, { error: 'public_token is required' });
      const result = await plaid.itemPublicTokenExchange({ public_token: body.public_token });
      await writeSecret({ ...credentials, accessToken: result.data.access_token, itemId: result.data.item_id, cursor: null });
      return response(200, { connected: true });
    }

    if (path.endsWith('/plaid/sync')) {
      if (!credentials.accessToken) return response(409, { error: 'No bank account is connected' });
      const accounts = await plaid.accountsBalanceGet({ access_token: credentials.accessToken });
      let cursor = credentials.cursor || undefined;
      const changes = { added: [], modified: [], removed: [] };
      let hasMore = true;
      while (hasMore) {
        const result = await plaid.transactionsSync({ access_token: credentials.accessToken, cursor, count: 500 });
        changes.added.push(...result.data.added);
        changes.modified.push(...result.data.modified);
        changes.removed.push(...result.data.removed);
        cursor = result.data.next_cursor;
        hasMore = result.data.has_more;
      }
      await writeSecret({ ...credentials, cursor });
      return response(200, { accounts: accounts.data.accounts, transactions: changes });
    }

    return response(404, { error: 'Route not found' });
  } catch (error) {
    console.error(error);
    return response(500, { error: 'The financial data service could not complete the request' });
  }
};
