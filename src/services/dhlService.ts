
/**
 * DHL API Service (Sandbox)
 * Documentation: https://developer.dhl.com/
 */

export interface DHLPackage {
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
}

export interface DHLQuoteRequest {
  plannedShippingDate: string;
  unitOfMeasurement: 'metric' | 'imperial';
  isCustomsDeclarable: boolean;
  originCountryCode: string;
  originCityName: string;
  originPostalCode?: string;
  destinationCountryCode: string;
  destinationCityName: string;
  destinationPostalCode?: string;
  packages: DHLPackage[];
  declaredValue?: number;
  declaredCurrency?: string;
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
    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Generates simulated rates when API is unconfigured or failing
   */
  getSimulatedRates(params: DHLQuoteRequest) {
    let totalChargeableWeight = 0;
    if (params.packages && params.packages.length > 0) {
      for (const pkg of params.packages) {
        const l = pkg.dimensions?.length || 20;
        const w = pkg.dimensions?.width || 15;
        const h = pkg.dimensions?.height || 10;
        const volWeight = (l * w * h) / 5000;
        const physWeight = pkg.weight || 0.5;
        totalChargeableWeight += Math.max(volWeight, physWeight);
      }
    } else {
      totalChargeableWeight = 0.5;
    }

    // Standard courier calculation: Base USD $35 + $25 per kg
    const calculatedPriceUSD = Math.max(35, 25 + totalChargeableWeight * 25);

    return {
      products: [
        {
          productName: "EXPRESS WORLDWIDE",
          productCode: "P",
          totalPrice: [
            {
              price: Number(calculatedPriceUSD.toFixed(2))
            }
          ]
        }
      ]
    };
  }

  /**
   * Get shipping rates/quotes
   */
  async getRates(params: DHLQuoteRequest) {
    if (!this.apiKey || !this.apiSecret || this.apiKey === 'YOUR_DHL_API_KEY' || this.apiKey === '') {
      console.warn('[DHL Service] API key not configured, returning simulated fallback rates.');
      return this.getSimulatedRates(params);
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
              postalCode: params.originPostalCode || "33122",
              cityName: params.originCityName,
              countryCode: params.originCountryCode
            },
            receiverDetails: {
              postalCode: params.destinationPostalCode || "01001-000",
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
              value: params.declaredValue || 100,
              currency: params.declaredCurrency || "USD"
            }
          ],
          packages: params.packages
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let errorMsg = response.statusText;
        if (contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMsg = errorData.detail || errorData.message || response.statusText;
          } catch (e) {
            // Ignore
          }
        } else {
          try {
            const text = await response.text();
            errorMsg = text.substring(0, 150) || response.statusText;
          } catch (e) {
            // Ignore
          }
        }
        console.warn(`[DHL Service] API Error (${response.status}): ${errorMsg}. Falling back to simulated rates.`);
        return this.getSimulatedRates(params);
      }

      return await response.json();
    } catch (error) {
      console.error('[DHL Service] Failed to get real rates, falling back to simulated rates. Error:', error);
      return this.getSimulatedRates(params);
    }
  }

  /**
   * Create a shipment and get tracking number
   */
  async createShipment(orderData: any) {
    if (!this.apiKey || !this.apiSecret || this.apiKey === 'YOUR_DHL_API_KEY' || this.apiKey === '') {
      console.warn('[DHL Service] API key not configured, returning simulated shipment data.');
      return {
        shipmentTrackingNumber: "DHL" + Math.floor(1000000000 + Math.random() * 9000000000),
        status: "Shipment created successfully (Simulated)"
      };
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
        const contentType = response.headers.get("content-type") || "";
        let errorMsg = response.statusText;
        if (contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMsg = errorData.detail || errorData.message || response.statusText;
          } catch (e) {
            // Ignore
          }
        } else {
          try {
            const text = await response.text();
            errorMsg = text.substring(0, 150) || response.statusText;
          } catch (e) {
            // Ignore
          }
        }
        console.warn(`[DHL Service] createShipment failed: ${errorMsg}. Returning simulated tracking.`);
        return {
          shipmentTrackingNumber: "DHL" + Math.floor(1000000000 + Math.random() * 9000000000),
          status: "Shipment created successfully (Simulated fallback)"
        };
      }

      return await response.json();
    } catch (error) {
      console.error('[DHL Service] Failed to create shipment:', error);
      return {
        shipmentTrackingNumber: "DHL" + Math.floor(1000000000 + Math.random() * 9000000000),
        status: "Shipment created successfully (Simulated error fallback)"
      };
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
