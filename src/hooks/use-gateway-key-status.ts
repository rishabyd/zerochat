'use client';

import useSWR from 'swr';

export const GATEWAY_KEY_STATUS_ENDPOINT = '/api/user/gateway-key';

export type GatewayKeyStatus = {
  hasKey: boolean;
  masked: string | null;
};

const gatewayKeyStatusFetcher = async (url: string): Promise<GatewayKeyStatus> => {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Failed to fetch gateway key status');
  }

  return response.json() as Promise<GatewayKeyStatus>;
};

export function useGatewayKeyStatus() {
  return useSWR<GatewayKeyStatus>(GATEWAY_KEY_STATUS_ENDPOINT, gatewayKeyStatusFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
  });
}

export function isGatewayKeyUnavailable(
  status: GatewayKeyStatus | undefined,
  isLoading: boolean,
  error: unknown
) {
  return isLoading || Boolean(error) || status?.hasKey !== true;
}
