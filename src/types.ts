export type TicketMessage = {
  role: 'bot' | 'user';
  text: string;
  timestamp: string;
  isAgent?: boolean;
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
};

export type Ticket = {
  id: string;
  userId: string;
  customerName: string;
  protocol: string;
  status: 'OPEN' | 'CLOSED';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  needsHuman?: boolean;
};

export type Review = {
  id: string;
  userId: string;
  customerName: string;
  orderId: string;
  rating: number; // 1-5
  comment: string;
  photos: string[];
  createdAt: string;
};

export type Store = {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  isFeatured?: boolean;
};

export type ProductVariant = {
  id: string;
  name: string; // e.g. "Color: Blue", "Size: XL", "Storage: 256GB"
  sku?: string;
  priceAdjustBRL?: number;
  priceAdjustUSD?: number;
  stock: number;
};

export type Product = {
  id: string;
  storeId: string;
  name: string;
  description: string;
  imageUrl: string;
  priceUSD: number;
  priceBRL: number;
  sku?: string;
  category: string;
  brand?: string;
  specifications?: Record<string, string>; // General specs like "Screen: 6.7 inch"
  variants?: ProductVariant[];
  stockType: 'IN_STOCK' | 'PARTNER_STORE';
  inventory: number;
  tags?: string[];
  isFeatured?: boolean;
};

export type ShippingMethod = {
  id: string;
  name: string;
  carrier: string;
  estimatedDays: string;
  basePriceBRL: number;
};

export type DiscountCoupon = {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minPurchaseBRL?: number;
  expiresAt?: string;
  usageLimit?: number;
  usageCount: number;
  active: boolean;
};

export type OrderStatus = 
  | 'PENDING_PAYMENT' 
  | 'PAYMENT_RECEIVED' 
  | 'PURCHASED_IN_STORE' 
  | 'STORED_IN_US' 
  | 'AWAITING_SHIPPING_PAYMENT'
  | 'SHIPPING_PAID'
  | 'IN_TRANSIT_TO_BR' 
  | 'ARRIVED_IN_BR' 
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderEvent = {
  id: string;
  status: OrderStatus;
  date: string;
  note?: string;
  photoUrl?: string;
};

export type OrderItem = {
  productId: string;
  quantity: number;
  product: Product; // Snapshot for simplicity
};

export type Order = {
  id: string;
  userId: string;
  trackingId: string;
  customerName: string;
  customerEmail: string;
  customerDocument?: string;
  items: OrderItem[];
  subtotalBRL: number;
  serviceFeeBRL: number; // 30%
  storageFeeBRL: number;
  shippingFeeBRL: number;
  finalShippingFeeBRL?: number;
  shippingPaid?: boolean;
  packageDimensions?: {
    length: number;
    width: number;
    height: number;
  };
  packageWeight?: number;
  appFeeBRL?: number; // R$20
  totalBRL: number;
  status: OrderStatus;
  history: OrderEvent[];
  shippingMethod?: ShippingMethod;
  shippingEstimateBRL?: number;
  shippingEstimateWithMarginBRL?: number;
  customsResponsibilityAccepted?: boolean;
  coupon?: DiscountCoupon;
  receipt?: {
    id: string;
    signatureUrl: string;
    generatedAt: string;
  };
  referredBy?: string;
  couponCode?: string;
  discountBRL?: number;
  integrationSync?: {
    adminHub?: { status: 'PENDING' | 'SUCCESS' | 'FAILED'; error?: string; syncedAt?: string; attempts: number };
    nexus?: { status: 'PENDING' | 'SUCCESS' | 'FAILED'; error?: string; syncedAt?: string; attempts: number };
  };
  createdAt: string;
};

export type UserProfile = {
  userId: string;
  fullName: string;
  dateOfBirth: string;
  document: string; // CPF or CNPJ
  phone: string;
  zipCode: string; // CEP
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  updatedAt: string;
};

export type CompanySettings = {
  pixKey: string;
  pixName: string;
  pixCity?: string;
  companyName: string; // Razão Social
  companyTradeName?: string; // Nome Fantasia
  companyCnpj: string;
  companyEmail?: string;
  supportEmail?: string;
  appDomain?: string;
  companyPhone?: string;
  companyAddress?: string;
  termsOfUse?: string;
  privacyPolicy?: string;
  // New Operational Costs fields
  serviceFeePercent?: number;
  storageRatePerM2?: number; 
  appFeeFixedBRL?: number;
  fixedCosts?: { id: string; label: string; value: number }[];
  adminHubBaseUrl?: string;
  adminHubApiKey?: string;
  nexusBaseUrl?: string;
  nexusApiKey?: string;
  updatedAt?: string;
};

export type Collaborator = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPPORT' | 'LOGISTICS' | 'PACKAGING' | 'SALES' | 'PURCHASING' | 'OTHER';
  phone?: string;
  permissions: string[]; // e.g. ['products', 'orders', 'stores', 'tickets', 'reviews', 'settings', 'team']
  receiveQuoteNotifications?: boolean;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type QuoteRequest = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  productName: string;
  productDescription?: string;
  productImageUrl?: string;
  priceUSD: number;
  priceBRL?: number;
  currency?: string;
  quotedPriceUSD?: number;
  quotedPriceBRL?: number;
  storeLocationUS?: string;
  status: 'PENDING' | 'QUOTED' | 'APPROVED' | 'REJECTED' | 'ORDERED';
  createdAt: string;
  updatedAt?: string;
  orderId?: string;
};

export type DriveFolder = {
  id: string;
  name: string;
  parentId: string | null;
  userId?: string; 
  createdAt: string;
  updatedAt: string;
};

export type FileDocument = {
  id: string;
  name: string;
  type: string;
  url: string;
  userId?: string;
  folderId?: string;
  size?: number;
  createdAt: string;
  updatedAt: string;
};

export type SystemNotification = {
  id: string;
  type: 'DUPLICATE_FILE' | 'OTHER';
  title: string;
  message: string;
  status: 'UNREAD' | 'READ' | 'RESOLVED';
  relatedId?: string; // id of the document or folder
  data?: any;
  createdAt: string;
  updatedAt: string;
};

export type SystemKnowledge = {
  id: string;
  title: string;
  description: string;
  category: 'ESTOQUE' | 'FRETE' | 'IMPOSTOS' | 'CANCELAMENTO' | 'POLÍTICAS' | 'OUTROS';
  sourceTicketId?: string;
  interactionCount: number;
  confidence: number;
  isApproved: boolean;
  type: 'HUMAN_REPLY' | 'BOT_INTERACTION';
  createdAt: string;
  updatedAt: string;
};

