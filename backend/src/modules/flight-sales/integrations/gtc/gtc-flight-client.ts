/**
 * GTC uçak bileti API entegrasyonu — ilk adım: iskelet.
 * Sonraki iterasyonda: gerçek endpoint/contract (REST veya SOAP) ile doldurulacak.
 */
export type GtcFlightSearchParams = {
  originAirportCode: string;
  destinationAirportCode: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  tripType: 'one_way' | 'round_trip';
  adultCount: number;
  childCount?: number;
  infantCount?: number;
};

export type GtcFlightSearchResult = {
  provider: 'gtc';
  /** Ham veya normalize edilmiş uçuş teklifleri */
  offers: unknown[];
  /** Entegrasyon henüz tamamlanmadıysa bilgi */
  _message?: string;
};

export type GtcClientConfig = {
  apiUrl: string;
  username: string;
  password: string;
  agencyCode?: string;
};

export class GtcFlightClient {
  constructor(private readonly config: GtcClientConfig) {}

  /**
   * Uçuş arama — GTC API bağlandığında burada HTTP çağrısı yapılacak.
   */
  async search(_params: GtcFlightSearchParams): Promise<GtcFlightSearchResult> {
    void this.config;
    return {
      provider: 'gtc',
      offers: [],
      _message: 'GTC API entegrasyonu henüz bağlanmadı; modül iskeleti hazır.',
    };
  }

  /**
   * Rezervasyon oluşturma — GTC API bağlandığında uygulanacak.
   */
  async createBooking(_payload: Record<string, unknown>): Promise<{ externalId: string }> {
    void _payload;
    throw new Error('GTC createBooking not implemented yet');
  }
}
