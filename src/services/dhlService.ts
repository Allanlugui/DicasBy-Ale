
/**
 * DHL API Service (Sandbox)
 * Documentation: https://developer.dhl.com/
 */

export interface DHLQuoteRequest {
  plannedShippingDate: string;
  unitOfMeasurement: 'metric' | 'imperial';
  isCustomsDeclarable: boolean;
  originCountryCode: string;
  originCityName: string;
  destinationCountryCode: string;
  destinationCityName: string;
  weight: number;
  length: number;
  width: number;
  height: number;
}

export class DHLService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.DHL_API_KEY || '';
    this.apiSecret = process.env.DHL_API_SECRET || '';
    this.baseUrl = process.env.DHL_BASE_URL || 'https://api-sandbox.dhl.com';
  }

  private async getAuthHeader(): Promise<string> {
    // DHL often uses Basic Auth or API Key in headers depending on the specific product (Express, eCommerce, etc.)
    // For Express API (Sandbox), it's typically Basic Auth with Key:Secret
    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Get shipping rates/quotes
   */
  async getRates(params: DHLQuoteRequest) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('DHL credentials not configured. Please check environment variables.');
    }

    try {
      const auth = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/express/v1/rates`, {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
          'Message-Reference': `REQ-${Date.now()}`
        },
        body: JSON.stringify({
          customerDetails: {
            shipperDetails: {
              postalCode: "33122",
              cityName: params.originCityName,
              countryCode: params.originCountryCode
            },
            receiverDetails: {
              postalCode: "01001-000",
              cityName: params.destinationCityName,
              countryCode: params.destinationCountryCode
            }
          },
          plannedShippingDateAndTime: `${params.plannedShippingDate}T12:00:00GMT-05:00`,
          unitOfMeasurement: params.unitOfMeasurement,
          isCustomsDeclarable: params.isCustomsDeclarable,
          monetaryAmount: [
            {
              type: "declaredValue",
              value: 100,
              currency: "USD"
            }
          ],
          packages: [
            {
              weight: params.weight,
              dimensions: {
                length: params.length,
                width: params.width,
                height: params.height
              }
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`DHL API Error: ${errorData.detail || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[DHL Service] Failed to get rates:', error);
      throw error;
    }
  }

  /**
   * Create a shipment and get tracking number
   */
  async createShipment(orderData: any) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('DHL credentials not configured.');
    }

    try {
      const auth = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/express/v1/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plannedShippingDateAndTime: new Date().toISOString(),
          pickupDetails: {
             isRequested: false
          },
          productCode: "P", // Express Worldwide
          accounts: [],
          customerDetails: {
            shipperDetails: {
              postalCode: "33122",
              cityName: "Miami",
              countryCode: "US",
              provinceCode: "FL",
              addressLine1: "123 DHL Way",
              contactInformation: {
                email: "ops@dicasbyale.com",
                phone: "+13050000000",
                companyName: "Dicas by Ale",
                fullName: "Operations Team"
              }
            },
            receiverDetails: {
              postalCode: orderData.customerPostalCode || "01001-000",
              cityName: orderData.customerCity || "São Paulo",
              countryCode: orderData.customerCountry || "BR",
              addressLine1: orderData.customerAddress || "Rua Exemplo, 123",
              contactInformation: {
                email: orderData.customerEmail,
                phone: orderData.customerPhone,
                companyName: orderData.customerName,
                fullName: orderData.customerName
              }
            }
          },
          content: {
            packages: [
              {
                weight: orderData.totalWeight || 0.5,
                dimensions: {
                  length: 10,
                  width: 10,
                  height: 10
                },
                description: "Personal Shopping Items"
              }
            ],
            isCustomsDeclarable: true,
            description: "Dicas by Ale - Personal Shopping Order",
            incoterm: "DAP",
            unitOfMeasurement: "metric"
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`DHL API Error: ${errorData.detail || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[DHL Service] Failed to create shipment:', error);
      throw error;
    }
  }

  /**
   * Track a shipment
   */
  async trackShipment(trackingNumber: string) {
    try {
      const auth = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/express/v1/tracking?shipmentTrackingNumber=${trackingNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': auth,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('[DHL Service] Tracking failed:', error);
      return null;
    }
  }
}
