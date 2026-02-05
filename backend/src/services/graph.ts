import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

/**
 * Creates a Microsoft Graph client for a specific tenant using app-only authentication
 */
export function createGraphClient(
  azureTenantId: string,
  clientId: string,
  clientSecret: string
): Client {
  const credential = new ClientSecretCredential(azureTenantId, clientId, clientSecret);

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  return Client.initWithMiddleware({ authProvider });
}
