import type { FlightIntegrationProvider } from '../entities/flight-reservation.entity';

export type GtcFlightCredentials = {
  apiUrl?: string;
  username?: string;
  /** Sunucuda saklanır; API yanıtında maskelenir */
  password?: string;
  agencyCode?: string;
};

export type FlightSalesSettingsStored = {
  enabled: boolean;
  /** `none`: henüz API seçilmedi (panelden manuel kayıt mümkün) */
  provider: FlightIntegrationProvider | 'none';
  gtc?: GtcFlightCredentials;
};

export type FlightSalesSettingsPublic = Omit<FlightSalesSettingsStored, 'gtc'> & {
  gtc?: {
    apiUrl?: string;
    username?: string;
    password?: string;
    agencyCode?: string;
  };
};
