import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Store, Product, Order, OrderItem, OrderEvent, OrderStatus, Ticket, Review, TicketMessage, UserProfile, CompanySettings, Collaborator, QuoteRequest, DriveFolder, FileDocument, SystemNotification, DiscountCoupon, ShippingMethod, SystemKnowledge, CartFeedback, AbandonedEmailLog } from './types';
import { generateTrackingId, cleanUndefined, safeStorage, generateCarrierTrackingCode } from './lib/utils';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User, signInWithEmailLink, isSignInWithEmailLink, sendSignInLinkToEmail, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

let isGlobalQuotaExceeded = false;
const quotaExceededListeners = new Set<(status: boolean) => void>();

export function registerQuotaListener(listener: (status: boolean) => void) {
  quotaExceededListeners.add(listener);
  listener(isGlobalQuotaExceeded);
  return () => { quotaExceededListeners.delete(listener); };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isErrExceeded = errMsg.includes('resource-exhausted') || 
                        errMsg.includes('Quota limit exceeded') || 
                        errMsg.includes('quota exceeded') || 
                        errMsg.includes('quota-exceeded') ||
                        errMsg.includes('Quota exceeded');
  
  if (isErrExceeded && !isGlobalQuotaExceeded) {
    isGlobalQuotaExceeded = true;
    quotaExceededListeners.forEach(listener => listener(true));
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  console.warn('[Firestore Handled Warning]', JSON.stringify(errInfo));
  
  // Only throw if it is a write operation so promise flows correctly trigger UI error blocks.
  // We do NOT throw for GET operations (like onSnapshot lists) so the page remains interactive using offline cache!
  const isWrite = operationType === OperationType.CREATE || 
                  operationType === OperationType.UPDATE || 
                  operationType === OperationType.DELETE || 
                  operationType === OperationType.WRITE;
                  
  if (isWrite) {
    throw new Error(JSON.stringify(errInfo));
  }
}

interface CartItem extends OrderItem {}

interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
  dbQuotaExceeded: boolean;
  isAdmin: boolean;
  collaborator: Collaborator | null;
  stores: Store[];
  products: Product[];
  orders: Order[];
  tickets: Ticket[];
  reviews: Review[];
  cart: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  createOrder: (customerName: string, customerEmail: string, couponCode?: string, discountBRL?: number, extraOrderFields?: Partial<Order>) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string, photoUrl?: string, receipt?: any, extraFields?: Partial<Order>) => Promise<void>;
  saveProfile: (profileData: Omit<UserProfile, 'userId' | 'updatedAt'>) => Promise<void>;
  companySettings: CompanySettings | null;
  saveCompanySettings: (settingsData: CompanySettings) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addStore: (store: Store) => Promise<string>;
  updateStore: (id: string, store: Partial<Store>) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  createTicket: (protocol: string, messages: TicketMessage[]) => Promise<string | undefined>;
  updateTicket: (ticketId: string, messages: TicketMessage[], status?: 'OPEN' | 'CLOSED', needsHuman?: boolean) => Promise<void>;
  submitReview: (review: Review) => Promise<void>;
  sendLoginLink: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  quoteRequests: QuoteRequest[];
  createQuoteRequest: (productName: string, productDescription?: string, productImageUrl?: string, priceUSD?: number, priceBRL?: number, currency?: string, customerPhone?: string) => Promise<string>;
  updateQuoteRequest: (id: string, quoteData: Partial<QuoteRequest>) => Promise<void>;
  approveQuoteAndCreateOrder: (quote: QuoteRequest) => Promise<void>;
  folders: DriveFolder[];
  documents: FileDocument[];
  createFolder: (name: string, parentId: string | null, userId?: string) => Promise<void>;
  updateFolder: (id: string, folder: Partial<DriveFolder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  createDocument: (doc: Omit<FileDocument, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDocument: (id: string, documentData: Partial<FileDocument>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  calculateCartTotals: (coupon?: DiscountCoupon) => { subtotalBRL: number; serviceFeeBRL: number; storageFeeBRL: number; shippingFeeBRL: number; appFee: number; discountBRL: number; totalBRL: number; prepaymentFee: number; onDemandCount: number; stockCount: number };
  autoSaveUserDocument: (userId: string, userName: string, category: string, documentName: string, url: string) => Promise<void>;
  notifications: SystemNotification[];
  resolveNotification: (id: string, action: 'DELETE' | 'KEEP') => Promise<void>;
  coupons: DiscountCoupon[];
  addCoupon: (coupon: Omit<DiscountCoupon, 'id' | 'usageCount'>) => Promise<void>;
  updateCoupon: (id: string, coupon: Partial<DiscountCoupon>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  shippingMethods: ShippingMethod[];
  addShippingMethod: (method: Omit<ShippingMethod, 'id'>) => Promise<void>;
  updateShippingMethod: (id: string, method: Partial<ShippingMethod>) => Promise<void>;
  deleteShippingMethod: (id: string) => Promise<void>;
  systemKnowledge: SystemKnowledge[];
  addSystemKnowledge: (knowledge: Omit<SystemKnowledge, 'id' | 'createdAt' | 'updatedAt' | 'interactionCount'>) => Promise<void>;
  updateSystemKnowledge: (id: string, knowledge: Partial<SystemKnowledge>) => Promise<void>;
  deleteSystemKnowledge: (id: string) => Promise<void>;
  learnFromTicket: (ticketId: string) => Promise<void>;
  syncOrderWithERPs: (orderId: string) => Promise<void>;
  cartFeedbacks: CartFeedback[];
  abandonedEmailLogs: AbandonedEmailLog[];
  addCartFeedback: (feedback: Omit<CartFeedback, 'id' | 'createdAt'>) => Promise<void>;
  addAbandonedEmailLog: (log: Omit<AbandonedEmailLog, 'id' | 'sentAt'>) => Promise<void>;
  updateAbandonedEmailLog: (id: string, status: 'SENT' | 'RECOVERED') => Promise<void>;
  profiles: UserProfile[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rawCart, setRawCart] = useState<CartItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const products = useMemo(() => {
    const rate = companySettings?.dollarRate || 5.50;
    return rawProducts.map(p => {
      const loc = p.location || 'US';
      if (loc === 'BR') {
        const priceBRL = p.priceBRL || 0;
        const priceUSD = priceBRL / rate;
        return { ...p, priceUSD, priceBRL };
      } else {
        const priceUSD = p.priceUSD || 0;
        const priceBRL = priceUSD * rate;
        return { ...p, priceUSD, priceBRL };
      }
    });
  }, [rawProducts, companySettings?.dollarRate]);

  const cart = useMemo(() => {
    return rawCart.map(item => {
      const baseId = item.productId.split('-')[0];
      const latestProd = products.find(p => p.id === baseId);
      if (latestProd) {
        return {
          ...item,
          product: {
            ...latestProd,
            name: item.product.name,
            sku: item.product.sku,
            priceBRL: item.product.priceBRL,
            priceUSD: item.product.priceUSD,
            stockType: item.product.stockType
          }
        };
      }
      return item;
    });
  }, [rawCart, products]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [documents, setDocuments] = useState<FileDocument[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [systemKnowledge, setSystemKnowledge] = useState<SystemKnowledge[]>([]);
  const [cartFeedbacks, setCartFeedbacks] = useState<CartFeedback[]>([]);
  const [abandonedEmailLogs, setAbandonedEmailLogs] = useState<AbandonedEmailLog[]>([]);
  const [dbQuotaExceeded, setDbQuotaExceeded] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    return registerQuotaListener((exceeded) => {
      setDbQuotaExceeded(exceeded);
    });
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'company'), (docSnap) => {
      if (docSnap.exists()) {
        setCompanySettings(docSnap.data() as CompanySettings);
      } else {
        setCompanySettings(null);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/company'));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'profiles', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setProfile(null);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `profiles/${user.uid}`));
    return unsub;
  }, [user]);

  // Fetch all profiles if admin
  useEffect(() => {
    if (!isAdmin) {
      setProfiles([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'profiles'), (snap) => {
      setProfiles(snap.docs.map(doc => ({ ...doc.data(), userId: doc.id } as UserProfile)));
    });
    return unsub;
  }, [isAdmin]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    // Check for email link sign in
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = safeStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Por favor, confirme seu e-mail para validar o acesso');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => safeStorage.removeItem('emailForSignIn'))
          .catch(console.error);
      }
    }
    return unsub;
  }, []);

  // Listen to collaborator collection matching user's email
  useEffect(() => {
    if (!user) {
      setCollaborator(null);
      setIsAdmin(false);
      return;
    }

    // Quick initial check for the owner
    if (user.email === 'jallanluiz@gmail.com') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }

    // Listen to collaborator docs query
    const targetEmail = user.email || '';
    const emailsArray = [targetEmail, targetEmail.toLowerCase(), targetEmail.toUpperCase()].filter(Boolean);

    if (emailsArray.length === 0) {
      setCollaborator(null);
      setIsAdmin(false);
      return () => {};
    }

    const q = query(
      collection(db, 'collaborators'),
      where('email', 'in', emailsArray)
    );

    const unsubCollab = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Collaborator));
      
      // Auto-migrate if current user is the super-admin or has team permission
      const hasTeamPermission = docs.some(c => c.active && c.permissions.includes('team'));
      if (user.email === 'jallanluiz@gmail.com' || hasTeamPermission) {
        snap.docs.forEach(async (docSnap) => {
          const data = docSnap.data() as Collaborator;
          const correctId = data.email.trim().toLowerCase();
          if (docSnap.id !== correctId) {
            try {
              await setDoc(doc(db, 'collaborators', correctId), cleanUndefined({
                ...data,
                id: correctId
              }));
              await deleteDoc(docSnap.ref);
              console.log(`Auto-migrated collaborator ${data.email} to ID ${correctId}`);
            } catch (err) {
              console.error("Collaborator migration error:", err);
            }
          }
        });
      }

      const activeCollab = docs.find(c => c.active);
      if (activeCollab) {
        setCollaborator(activeCollab);
        setIsAdmin(true);
      } else if (user.email === 'jallanluiz@gmail.com') {
        setIsAdmin(true);
        // Expose a virtual full-permissions collaborator for super admin (jallanluiz)
        setCollaborator({
          id: 'admin',
          name: 'Allan Luiz',
          email: 'jallanluiz@gmail.com',
          role: 'ADMIN',
          permissions: ['products', 'orders', 'stores', 'tickets', 'reviews', 'settings', 'team', 'shipping'],
          active: true,
          createdAt: new Date().toISOString()
        });
      } else {
        setCollaborator(null);
        setIsAdmin(false);
      }
    }, (err) => {
      // Fallback
      if (user.email === 'jallanluiz@gmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      handleFirestoreError(err, OperationType.GET, 'collaborators');
    });

    return () => unsubCollab();
  }, [user]);

  useEffect(() => {
    const unsubs: any[] = [];
    
    unsubs.push(onSnapshot(collection(db, 'stores'), (snap) => {
      setStores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Store)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'stores')));

    unsubs.push(onSnapshot(collection(db, 'products'), (snap) => {
      setRawProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'products')));

    unsubs.push(onSnapshot(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')), (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'reviews')));

    if (isAdmin) {
      unsubs.push(onSnapshot(query(collection(db, 'notifications'), where('status', '==', 'UNREAD')), (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemNotification)));
      }, (err) => handleFirestoreError(err, OperationType.GET, 'notifications')));
    }

    unsubs.push(onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() } as DiscountCoupon)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'coupons')));

    unsubs.push(onSnapshot(collection(db, 'shippingMethods'), (snap) => {
      setShippingMethods(snap.docs.map(d => ({ id: d.id, ...d.data() } as ShippingMethod)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'shippingMethods')));

    unsubs.push(onSnapshot(collection(db, 'systemKnowledge'), (snap) => {
      setSystemKnowledge(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemKnowledge)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'systemKnowledge')));

    unsubs.push(onSnapshot(collection(db, 'cartFeedbacks'), (snap) => {
      setCartFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CartFeedback)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'cartFeedbacks')));

    unsubs.push(onSnapshot(collection(db, 'abandonedEmailLogs'), (snap) => {
      setAbandonedEmailLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AbandonedEmailLog)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'abandonedEmailLogs')));

    return () => unsubs.forEach(u => u());
  }, [isAdmin]);

  // Fetch orders & tickets based on auth
  useEffect(() => {
    if (!user) {
      setOrders([]);
      setTickets([]);
      return;
    }
    
    const ordersRef = collection(db, 'orders');
    const ticketsRef = collection(db, 'tickets');

    const ordersQ = isAdmin 
      ? query(ordersRef, orderBy('createdAt', 'desc'))
      : query(ordersRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const ticketsQ = isAdmin 
      ? query(ticketsRef, orderBy('createdAt', 'desc'))
      : query(ticketsRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const quoteRequestsRef = collection(db, 'quoteRequests');
    const quoteRequestsQ = isAdmin 
      ? query(quoteRequestsRef, orderBy('createdAt', 'desc'))
      : query(quoteRequestsRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const foldersRef = collection(db, 'folders');
    const documentsRef = collection(db, 'documents');

    const foldersQ = isAdmin
      ? query(foldersRef)
      : query(foldersRef, where('userId', '==', user.uid));

    const documentsQ = isAdmin
      ? query(documentsRef)
      : query(documentsRef, where('userId', '==', user.uid));

    const unsubOrders = onSnapshot(ordersQ, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      const filtered = isAdmin ? fetched : fetched.filter(o => o.userId === user.uid);
      setOrders(filtered);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'orders'));

    const unsubTickets = onSnapshot(ticketsQ, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
      const filtered = isAdmin ? fetched : fetched.filter(t => t.userId === user.uid);
      setTickets(filtered);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'tickets'));

    const unsubQuotes = onSnapshot(quoteRequestsQ, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as QuoteRequest));
      const filtered = isAdmin ? fetched : fetched.filter(q => q.userId === user.uid);
      setQuoteRequests(filtered);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'quoteRequests'));

    const unsubFolders = onSnapshot(foldersQ, (snap) => {
      const parsed = snap.docs.map(d => ({ id: d.id, ...d.data() } as DriveFolder));
      parsed.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const filtered = isAdmin ? parsed : parsed.filter(f => f.userId === user.uid);
      setFolders(filtered);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'folders'));

    const unsubDocuments = onSnapshot(documentsQ, (snap) => {
      const parsed = snap.docs.map(d => ({ id: d.id, ...d.data() } as FileDocument));
      parsed.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const filtered = isAdmin ? parsed : parsed.filter(doc => doc.userId === user.uid);
      setDocuments(filtered);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'documents'));

    return () => { unsubOrders(); unsubTickets(); unsubQuotes(); unsubFolders(); unsubDocuments(); };
  }, [user, isAdmin]);

  const sendLoginLink = async (email: string) => {
    const actionCodeSettings = {
      url: window.location.origin + '/login', // Adjust redirect
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    safeStorage.setItem('emailForSignIn', email);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const logout = async () => auth.signOut();

  const calculateCartTotals = (coupon?: DiscountCoupon) => {
    const serviceRate = companySettings?.serviceFeePercent ? (companySettings.serviceFeePercent / 100) : 0.3;
    
    let subtotalBRL = 0;
    let onDemandCount = 0;
    let stockCount = 0;
    
    cart.forEach(item => {
      const isPartnerStore = item.product.stockType === 'PARTNER_STORE' || (item.product.stockType === 'IN_STOCK' && (item.product.inventory || 0) <= 0);
      if (isPartnerStore) {
        onDemandCount += item.quantity;
      } else {
        subtotalBRL += (item.product.priceBRL * item.quantity);
        stockCount += item.quantity;
      }
    });

    const serviceFeeBRL = subtotalBRL * serviceRate; 
    const storageFeeBRL = 0; 
    const shippingFeeBRL = 0; 
    // Only charge standard app fee if there are stock items in the cart
    const appFee = stockCount > 0 ? (companySettings?.appFeeFixedBRL ?? 20) : 0;
    
    const prepaymentFee = onDemandCount > 0 ? (companySettings?.personalShopperPrepaymentBRL ?? 150) : 0;
    
    let discountBRL = 0;
    if (coupon && coupon.active) {
      if (coupon.type === 'PERCENT') {
        discountBRL = subtotalBRL * (coupon.value / 100);
      } else {
        discountBRL = coupon.value;
      }
    }

    const totalBRL = Math.max(0, subtotalBRL + serviceFeeBRL + storageFeeBRL + shippingFeeBRL + appFee + prepaymentFee - discountBRL);
    
    return { subtotalBRL, serviceFeeBRL, storageFeeBRL, shippingFeeBRL, appFee, discountBRL, totalBRL, prepaymentFee, onDemandCount, stockCount };
  };

  const addToCart = (product: Product, quantity: number) => {
    const compoundId = `${product.id}-${product.sku || 'default'}`;
    setRawCart((prev) => {
      const existing = prev.find(item => item.productId === compoundId);
      if (existing) {
        return prev.map(item => item.productId === compoundId ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { productId: compoundId, quantity, product }];
    });
  };

  const removeFromCart = (productId: string) => setRawCart(prev => prev.filter(item => item.productId !== productId));
  const clearCart = () => setRawCart([]);

  const createOrder = async (customerName: string, customerEmail: string, couponCode?: string, discountBRL?: number, extraOrderFields?: Partial<Order>) => {
    if (!user) throw new Error("Need to be logged in to order");
    
    // Validate Stock Before Order Creation
    for (const item of cart) {
      const baseId = item.productId.split('-')[0];
      const dbProduct = products.find(p => p.id === baseId);
      
      if (!dbProduct) {
        throw new Error(`Produto não encontrado: ${item.product.name}`);
      }

      if (dbProduct.stockType === 'IN_STOCK') {
        const itemSku = item.product.sku;
        
        if (dbProduct.variants && dbProduct.variants.length > 0) {
          const variant = dbProduct.variants.find(v => v.sku === itemSku);
          if (!variant) {
            // Se for um item de encomenda especial (sem estoque), podemos pular a validação ou tratar como PARTNER_STORE
            if (item.product.stockType === 'PARTNER_STORE') continue;
            throw new Error(`Variação não encontrada para: ${item.product.name}`);
          }
          if (variant.stock < item.quantity) {
             throw new Error(`Estoque insuficiente para: ${item.product.name} (Disponível: ${variant.stock})`);
          }
        } else {
          if ((dbProduct.inventory || 0) < item.quantity) {
             throw new Error(`Estoque insuficiente para: ${item.product.name} (Disponível: ${dbProduct.inventory || 0})`);
          }
        }
      }
    }

    // Find coupon if code provided
    let appliedCoupon: DiscountCoupon | undefined = undefined;
    if (couponCode) {
      appliedCoupon = coupons.find(c => c.code === couponCode && c.active);
    }

    const totals = calculateCartTotals(appliedCoupon);
    const trackingId = generateTrackingId();
    const orderId = doc(collection(db, 'orders')).id;
    
    const initialEvent: OrderEvent = {
        id: Math.random().toString(36).substr(2, 9),
        status: 'PENDING_PAYMENT',
        date: new Date().toISOString(),
        note: 'Pedido recebido, aguardando confirmação de pagamento.'
    };

    const referredBy = safeStorage.getItem('referred_by');
    const finalReferredBy = (referredBy && referredBy !== user.uid) ? referredBy : undefined;

    const newOrder: Order = {
      id: orderId,
      userId: user.uid,
      trackingId,
      customerName,
      customerEmail,
      customerDocument: profile?.document || undefined,
      items: [...cart],
      ...totals,
      totalBRL: totals.totalBRL, // Already calculated in calculateCartTotals
      status: 'PENDING_PAYMENT',
      history: [initialEvent],
      referredBy: finalReferredBy || undefined,
      couponCode: appliedCoupon?.code || undefined,
      coupon: appliedCoupon,
      discountBRL: totals.discountBRL,
      createdAt: new Date().toISOString(),
      ...extraOrderFields
    };

    const cleanedOrder = cleanUndefined(newOrder);
    await setDoc(doc(db, 'orders', orderId), cleanedOrder);
    
    // Decrease Stock in Database
    for (const item of cart) {
      const baseId = item.productId.split('-')[0];
      const dbProduct = products.find(p => p.id === baseId);
      if (dbProduct && dbProduct.stockType === 'IN_STOCK' && item.product.stockType !== 'PARTNER_STORE') {
        const itemSku = item.product.sku;
        if (dbProduct.variants && dbProduct.variants.length > 0) {
           const updatedVariants = dbProduct.variants.map(v => {
             if (v.sku === itemSku) {
               return { ...v, stock: Math.max(0, v.stock - item.quantity) };
             }
             return v;
           });
           // Use updateDoc directly to ensure immediate sync
           await updateDoc(doc(db, 'products', baseId), { variants: updatedVariants });
        } else {
           const newInventory = Math.max(0, (dbProduct.inventory || 0) - item.quantity);
           await updateDoc(doc(db, 'products', baseId), { inventory: newInventory });
        }
      }
    }

    
    // Trigger purchase email notification automatically
    fetch('/api/orders/notify-new-sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    }).catch(e => console.error("Error triggering new order purchase email:", e));
    
    // Dispara a sincronização com o Nexus ERP
    syncOrderWithERPs(orderId).catch(e => console.error("Error triggering ERP sync:", e));
    
    // Increment coupon usage
    if (appliedCoupon) {
      await updateDoc(doc(db, 'coupons', appliedCoupon.id), {
        usageCount: (appliedCoupon.usageCount || 0) + 1
      });
    }

    if (finalReferredBy) {
      safeStorage.removeItem('referred_by');
    }
    clearCart();
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, note?: string, photoUrl?: string, receipt?: any, extraFields?: Partial<Order>) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const isCustom = order.prepaymentFee && order.prepaymentFee > 0;
    let autoTrackingCode = order.carrierTrackingCode;
    if (!autoTrackingCode) {
      const carrier = order.carrierName || order.shippingMethod?.carrier || "Correios";
      if (status === 'IN_TRANSIT_TO_BR') {
        autoTrackingCode = generateCarrierTrackingCode(carrier);
      }
    }

    const newEvent: OrderEvent = {
      id: Math.random().toString(36).substr(2, 9),
      status,
      date: new Date().toISOString(),
      note: note || '',
      photoUrl: photoUrl || ''
    };
    const updateData: any = {
      status,
      history: [newEvent, ...order.history],
      ...extraFields
    };
    if (autoTrackingCode) {
      updateData.carrierTrackingCode = autoTrackingCode;
    }
    if (receipt) updateData.receipt = receipt;
    await updateDoc(doc(db, 'orders', orderId), updateData);

    // Notify status change via email (background)
    fetch('/api/orders/notify-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status, note })
    }).catch(err => console.error("Error sending status notification email:", err));

    // Trigger ERP sync if status is PAYMENT_RECEIVED
    if (status === 'PAYMENT_RECEIVED') {
      syncOrderWithERPs(orderId).catch(console.error);
    }

    // Auto-save attachment to client drive if provided
    if (photoUrl || receipt?.url) {
       const attachmentUrl = photoUrl || (receipt as any)?.url;
       const isFinance = status === 'PAYMENT_RECEIVED' || status === 'PREPAYMENT_RECEIVED' || status === 'PRODUCT_PAYMENT_RECEIVED' || status === 'SHIPPING_PAID';
       const docName = isFinance ? `Comprovante_${order.trackingId}_${status}` : `Foto_Pedido_${order.trackingId}_${status}`;
       const category = isFinance ? 'Financeiro' : 'Logística';
       
       await autoSaveUserDocument(
         order.userId, 
         order.customerName, 
         category, 
         docName, 
         attachmentUrl
       );
    }
  };

  const syncOrderWithERPs = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      // Initialize or update integration sync state
      await updateDoc(doc(db, 'orders', orderId), {
        'integrationSync.adminHub.status': 'PENDING',
        'integrationSync.nexus.status': 'PENDING'
      });

      const res = await fetch('/api/sync-order-erps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });

      const data = await res.json();

      const mergedSync: any = {
        ...(order.integrationSync || {})
      };
      if (data.adminHub) {
        mergedSync.adminHub = {
          status: data.adminHub.status || 'FAILED',
          error: data.adminHub.status === 'SUCCESS' ? null : (data.adminHub.error || 'Erro desconhecido'),
          syncedAt: data.adminHub.status === 'SUCCESS' ? new Date().toISOString() : null,
          attempts: (order.integrationSync?.adminHub?.attempts || 0) + 1
        };
      }
      if (data.nexus) {
        mergedSync.nexus = {
          status: data.nexus.status || 'FAILED',
          error: data.nexus.status === 'SUCCESS' ? null : (data.nexus.error || 'Erro desconhecido'),
          syncedAt: data.nexus.status === 'SUCCESS' ? new Date().toISOString() : null,
          attempts: (order.integrationSync?.nexus?.attempts || 0) + 1
        };
      }

      await setDoc(doc(db, 'orders', orderId), {
        integrationSync: mergedSync
      }, { merge: true });
    } catch (err) {
      console.error("[ERP Sync Client Error]:", err);
      const failedSync: any = {
        ...(order.integrationSync || {})
      };
      failedSync.adminHub = {
        ...(failedSync.adminHub || {}),
        status: 'FAILED',
        error: String(err),
        syncedAt: failedSync.adminHub?.syncedAt || null,
        attempts: (failedSync.adminHub?.attempts || 0) + 1
      };
      failedSync.nexus = {
        ...(failedSync.nexus || {}),
        status: 'FAILED',
        error: String(err),
        syncedAt: failedSync.nexus?.syncedAt || null,
        attempts: (failedSync.nexus?.attempts || 0) + 1
      };
      await setDoc(doc(db, 'orders', orderId), {
        integrationSync: failedSync
      }, { merge: true });
    }
  };

  const addProduct = async (product: Product) => {
    const ref = doc(collection(db, 'products'));
    await setDoc(ref, cleanUndefined({ ...product, id: ref.id }));
  };
  
  const updateProduct = async (id: string, product: Partial<Product>) => {
    await updateDoc(doc(db, 'products', id), cleanUndefined(product));
  };

  const deleteProduct = async (id: string) => {
    await deleteDoc(doc(db, 'products', id));
  };
  
  const addStore = async (store: Store): Promise<string> => {
    const ref = doc(collection(db, 'stores'));
    await setDoc(ref, cleanUndefined({ ...store, id: ref.id }));
    return ref.id;
  };

  const updateStore = async (id: string, store: Partial<Store>) => {
    await updateDoc(doc(db, 'stores', id), cleanUndefined(store));
  };

  const deleteStore = async (id: string) => {
    await deleteDoc(doc(db, 'stores', id));
  };

  const createTicket = async (protocol: string, messages: TicketMessage[]): Promise<string | undefined> => {
    if (!user) return;
    const ref = doc(collection(db, 'tickets'));
    await setDoc(ref, cleanUndefined({
      id: ref.id,
      userId: user.uid,
      customerName: user.displayName || user.email || 'Cliente',
      protocol,
      status: 'OPEN',
      messages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    return ref.id;
  };

  const updateTicket = async (ticketId: string, messages: TicketMessage[], status?: 'OPEN' | 'CLOSED', needsHuman?: boolean) => {
    const updateData: any = {
      messages,
      updatedAt: new Date().toISOString()
    };
    if (status) {
      updateData.status = status;
    }
    if (needsHuman !== undefined) {
      updateData.needsHuman = needsHuman;
    }
    await updateDoc(doc(db, 'tickets', ticketId), cleanUndefined(updateData));

    if (status === 'CLOSED') {
      setTimeout(() => {
        learnFromTicket(ticketId).catch(console.error);
      }, 1000);
    }
  };

  const learnFromTicket = async (ticketId: string) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);
      
      if (!ticketSnap.exists()) return;
      
      const targetTicket = { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;
      if (targetTicket.messages.length < 3) return; // Need at least some interaction

      const res = await fetch('/api/learn-from-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: targetTicket.id,
          protocol: targetTicket.protocol,
          customerName: targetTicket.customerName,
          messages: targetTicket.messages
        })
      });
      const data = await res.json();
      
      if (data.result && Array.isArray(data.result) && data.result.length > 0) {
        for (const fact of data.result) {
          const ref = doc(collection(db, 'systemKnowledge'));
          const item: SystemKnowledge = {
            id: ref.id,
            title: fact.title,
            description: fact.description,
            category: fact.category || 'OUTROS',
            sourceTicketId: targetTicket.id,
            interactionCount: 0,
            confidence: fact.confidence || 0.7,
            isApproved: false, // Default pending for human review
            type: fact.type || 'BOT_INTERACTION',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(ref, cleanUndefined(item));
        }

        // Create a notification for the administrators
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, cleanUndefined({
          id: notifRef.id,
          type: 'SYSTEM_KNOWLEDGE_PENDING',
          title: 'Novo Aprendizado Detectado',
          description: `A IA extraiu ${data.result.length} novo(s) conhecimento(s) da conversa #${targetTicket.protocol}. Verifique a aba IA Regenerativa para aprovar.`,
          targetId: targetTicket.id,
          isResolved: false,
          createdAt: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.error("[learnFromTicket Error]:", err);
    }
  };

  const addSystemKnowledge = async (knowledge: Omit<SystemKnowledge, 'id' | 'createdAt' | 'updatedAt' | 'interactionCount'>) => {
    const ref = doc(collection(db, 'systemKnowledge'));
    const newKnowledge: SystemKnowledge = {
      ...knowledge,
      id: ref.id,
      interactionCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(ref, cleanUndefined(newKnowledge));
  };

  const updateSystemKnowledge = async (id: string, knowledge: Partial<SystemKnowledge>) => {
    const updateData = {
      ...knowledge,
      updatedAt: new Date().toISOString()
    };
    await updateDoc(doc(db, 'systemKnowledge', id), cleanUndefined(updateData));
  };

  const deleteSystemKnowledge = async (id: string) => {
    await deleteDoc(doc(db, 'systemKnowledge', id));
  };

  const submitReview = async (review: Review) => {
    const ref = doc(collection(db, 'reviews'));
    await setDoc(ref, cleanUndefined({ ...review, id: ref.id }));
  };

  const saveProfile = async (profileData: Omit<UserProfile, 'userId' | 'updatedAt'>) => {
    if (!user) throw new Error("Need to be logged in to save profile");
    const updatedProfile: UserProfile = {
      ...profileData,
      userId: user.uid,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'profiles', user.uid), cleanUndefined(updatedProfile));
  };

  const saveCompanySettings = async (settingsData: CompanySettings) => {
    if (!isAdmin) throw new Error("Only administrator can update settings");
    const updatedSettings = {
      ...settingsData,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'settings', 'company'), cleanUndefined(updatedSettings));
  };

  const createQuoteRequest = async (
    productName: string,
    productDescription?: string,
    productImageUrl?: string,
    priceUSD?: number,
    priceBRL?: number,
    currency?: string,
    customerPhone?: string
  ): Promise<string> => {
    if (!user) throw new Error("Need to be logged in to request a quote");
    const quoteId = doc(collection(db, 'quoteRequests')).id;
    const newQuote: QuoteRequest = {
      id: quoteId,
      userId: user.uid,
      customerName: user.displayName || user.email || 'Cliente',
      customerEmail: user.email || '',
      customerPhone: customerPhone || profile?.phone || '',
      productName,
      productDescription: productDescription || '',
      productImageUrl: productImageUrl || '',
      priceUSD: priceUSD || 0,
      priceBRL: priceBRL || 0,
      currency: currency || 'USD',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'quoteRequests', quoteId), cleanUndefined(newQuote));

      // Fetch collaborators who are in the purchasing area or enabled notifications
      try {
        const collabSnap = await getDocs(collection(db, 'collaborators'));
        const allCollabs = collabSnap.docs.map(d => ({ id: d.id, ...d.data() } as Collaborator));
        const relevantCollabs = allCollabs.filter(c => 
          c.active && (c.role === 'PURCHASING' || c.role === 'ADMIN' || c.receiveQuoteNotifications)
        );

        // Notify via API
        fetch('/api/notify-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteId,
            customerName: newQuote.customerName,
            customerEmail: newQuote.customerEmail,
            customerPhone: newQuote.customerPhone,
            productName,
            productDescription: newQuote.productDescription,
            priceUSD: newQuote.priceUSD,
            collaborators: relevantCollabs.map(c => ({ name: c.name, email: c.email }))
          })
        }).catch(err => console.error("Error triggering quote notification:", err));

      } catch (collabErr) {
        console.error("Failed to query collaborators for quote notification:", collabErr);
      }

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `quoteRequests/${quoteId}`);
    }
    return quoteId;
  };

  const updateQuoteRequest = async (id: string, quoteData: Partial<QuoteRequest>) => {
    const updated = {
      ...quoteData,
      updatedAt: new Date().toISOString()
    };
    try {
      await updateDoc(doc(db, 'quoteRequests', id), cleanUndefined(updated));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `quoteRequests/${id}`);
    }
  };

  const approveQuoteAndCreateOrder = async (quote: QuoteRequest) => {
    if (!user) throw new Error("Need to be logged in to approve custom quote");
    const orderId = doc(collection(db, 'orders')).id;
    const trackingId = generateTrackingId();

    const customProduct: Product = {
      id: `custom-${quote.id}`,
      storeId: 'personal-shopper',
      name: quote.productName,
      description: quote.productDescription || 'Produto sob cotação / compra assistida',
      imageUrl: quote.productImageUrl || '',
      priceUSD: quote.quotedPriceUSD || quote.priceUSD || 0,
      priceBRL: quote.quotedPriceBRL || 0,
      category: 'Compra Assistida',
      stockType: 'IN_STOCK',
      inventory: 1
    };

    const subtotalBRL = customProduct.priceBRL;
    const serviceRate = companySettings?.serviceFeePercent ? (companySettings.serviceFeePercent / 100) : 0.3;
    const serviceFeeBRL = subtotalBRL * serviceRate;
    const storageFeeBRL = 0;
    const shippingFeeBRL = 0;
    const appFeeBRL = companySettings?.appFeeFixedBRL ?? 20;
    const totalBRL = subtotalBRL + serviceFeeBRL + storageFeeBRL + shippingFeeBRL + appFeeBRL;

    const initialEvent: OrderEvent = {
      id: Math.random().toString(36).substr(2, 9),
      status: 'PENDING_PAYMENT',
      date: new Date().toISOString(),
      note: `Pedido gerado a partir da aprovação do orçamento #${quote.id.substring(0, 6).toUpperCase()}.`
    };

    const newOrder: Order = {
      id: orderId,
      userId: user.uid,
      trackingId,
      customerName: quote.customerName || user.displayName || user.email || 'Cliente',
      customerEmail: quote.customerEmail || user.email || '',
      customerDocument: profile?.document || undefined,
      items: [{
        productId: customProduct.id,
        quantity: 1,
        product: customProduct
      }],
      subtotalBRL,
      serviceFeeBRL,
      storageFeeBRL,
      shippingFeeBRL,
      appFeeBRL,
      totalBRL,
      status: 'PENDING_PAYMENT',
      history: [initialEvent],
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'orders', orderId), cleanUndefined(newOrder));
    await updateQuoteRequest(quote.id, { status: 'APPROVED', orderId });

    // Trigger purchase email notification automatically
    fetch('/api/orders/notify-new-sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    }).catch(e => console.error("Error triggering quote approval order purchase email:", e));

    // Dispara a sincronização com o Nexus ERP
    syncOrderWithERPs(orderId).catch(e => console.error("Error triggering ERP sync via quote:", e));
  };

  const createFolder = async (name: string, parentId: string | null, targetUserId?: string) => {
    const assignedUserId = targetUserId || (user ? user.uid : undefined);
    const ref = doc(collection(db, 'folders'));
    await setDoc(ref, cleanUndefined({
      id: ref.id,
      name,
      parentId,
      userId: assignedUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  };

  const updateFolder = async (id: string, folder: Partial<DriveFolder>) => {
    await updateDoc(doc(db, 'folders', id), cleanUndefined({ ...folder, updatedAt: new Date().toISOString() }));
  };

  const deleteFolder = async (id: string) => {
    await deleteDoc(doc(db, 'folders', id));
  };

  const createDocument = async (documentData: Omit<FileDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
    const assignedUserId = documentData.userId || (user ? user.uid : undefined);
    
    // Check for duplicate file (same URL or same Name in same Folder)
    const isDuplicate = documents.some(d => 
      (d.url === documentData.url) || 
      (d.name === documentData.name && d.folderId === documentData.folderId && d.userId === assignedUserId)
    );

    if (isDuplicate) {
       // Create notification but still allow the save if necessary, or skip?
       const ref = doc(collection(db, 'notifications'));
       try {
         await setDoc(ref, cleanUndefined({
           id: ref.id,
           type: 'DUPLICATE_FILE',
           title: 'Documento Duplicado Detectado',
           message: `O arquivo "${documentData.name}" parece já existir para este usuário.`,
           status: 'UNREAD',
           data: { documentData },
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString()
         }));
       } catch (notificationErr) {
         console.error("Failed to create conflict notification:", notificationErr);
       }
       return; 
    }

    const ref = doc(collection(db, 'documents'));
    try {
      await setDoc(ref, cleanUndefined({
        ...documentData,
        id: ref.id,
        userId: assignedUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `documents/${ref.id}`);
    }
  };

  const updateDocument = async (id: string, documentData: Partial<FileDocument>) => {
    await updateDoc(doc(db, 'documents', id), cleanUndefined({ ...documentData, updatedAt: new Date().toISOString() }));
  };

  const deleteDocument = async (id: string) => {
    await deleteDoc(doc(db, 'documents', id));
  };

  const autoSaveUserDocument = async (targetUserId: string, userName: string, category: string, documentName: string, url: string) => {
    try {
      // Deterministic IDs based on userId and category to avoid querying (fixing permission errors)
      const cleanId = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const rootFolderId = `root_${cleanId(targetUserId)}`;
      const catFolderId = `cat_${cleanId(targetUserId)}_${cleanId(category)}`;
      
      const now = new Date().toISOString();

      // Create or update root folder (using setDoc with merge: true avoids existence check)
      try {
        await setDoc(doc(db, 'folders', rootFolderId), cleanUndefined({
          id: rootFolderId,
          name: userName,
          parentId: null,
          userId: targetUserId,
          updatedAt: now,
          createdAt: now 
        }), { merge: true });
      } catch (fErr) {
        handleFirestoreError(fErr, OperationType.WRITE, `folders/${rootFolderId}`);
      }

      // Create or update category folder
      try {
        await setDoc(doc(db, 'folders', catFolderId), cleanUndefined({
          id: catFolderId,
          name: category,
          parentId: rootFolderId,
          userId: targetUserId,
          updatedAt: now,
          createdAt: now
        }), { merge: true });
      } catch (cErr) {
        handleFirestoreError(cErr, OperationType.WRITE, `folders/${catFolderId}`);
      }

      await createDocument({
        name: documentName,
        type: url.includes('.pdf') ? 'pdf' : url.includes('.zip') ? 'zip' : 'image',
        url,
        folderId: catFolderId,
        userId: targetUserId
      });
    } catch (err) {
      console.error('Error auto-saving document:', err);
    }
  };

  const resolveNotification = async (id: string, action: 'DELETE' | 'KEEP') => {
    if (action === 'DELETE') {
       await deleteDoc(doc(db, 'notifications', id));
    } else {
       await updateDoc(doc(db, 'notifications', id), { status: 'RESOLVED', updatedAt: new Date().toISOString() });
    }
  };

  const addCoupon = async (coupon: Omit<DiscountCoupon, 'id' | 'usageCount'>) => {
    const ref = doc(collection(db, 'coupons'));
    await setDoc(ref, cleanUndefined({ ...coupon, id: ref.id, usageCount: 0 }));
  };

  const updateCoupon = async (id: string, coupon: Partial<DiscountCoupon>) => {
    await updateDoc(doc(db, 'coupons', id), cleanUndefined(coupon));
  };

  const deleteCoupon = async (id: string) => {
    await deleteDoc(doc(db, 'coupons', id));
  };

  const addShippingMethod = async (method: Omit<ShippingMethod, 'id'>) => {
    const ref = doc(collection(db, 'shippingMethods'));
    await setDoc(ref, cleanUndefined({ ...method, id: ref.id }));
  };

  const updateShippingMethod = async (id: string, method: Partial<ShippingMethod>) => {
    await updateDoc(doc(db, 'shippingMethods', id), cleanUndefined(method));
  };

  const deleteShippingMethod = async (id: string) => {
    await deleteDoc(doc(db, 'shippingMethods', id));
  };

  const addCartFeedback = async (feedback: Omit<CartFeedback, 'id' | 'createdAt'>) => {
    const ref = doc(collection(db, 'cartFeedbacks'));
    const createdAt = new Date().toISOString();
    await setDoc(ref, cleanUndefined({ ...feedback, id: ref.id, createdAt }));
  };

  const addAbandonedEmailLog = async (log: Omit<AbandonedEmailLog, 'id' | 'sentAt'>) => {
    const ref = doc(collection(db, 'abandonedEmailLogs'));
    const sentAt = new Date().toISOString();
    await setDoc(ref, cleanUndefined({ ...log, id: ref.id, sentAt }));
  };

  const updateAbandonedEmailLog = async (id: string, status: 'SENT' | 'RECOVERED') => {
    await updateDoc(doc(db, 'abandonedEmailLogs', id), { status });
  };

  return (
    <AppContext.Provider value={{ user, profile, dbQuotaExceeded, companySettings, isAdmin, collaborator, stores, products, orders, tickets, reviews, cart, addToCart, removeFromCart, clearCart, createOrder, updateOrderStatus, saveProfile, saveCompanySettings, addProduct, updateProduct, deleteProduct, addStore, updateStore, deleteStore, createTicket, updateTicket, submitReview, sendLoginLink, logout, loginWithGoogle, quoteRequests, createQuoteRequest, updateQuoteRequest, approveQuoteAndCreateOrder, folders, documents, createFolder, updateFolder, deleteFolder, createDocument, updateDocument, deleteDocument, calculateCartTotals, autoSaveUserDocument, notifications, resolveNotification, coupons, addCoupon, updateCoupon, deleteCoupon, shippingMethods, addShippingMethod, updateShippingMethod, deleteShippingMethod, systemKnowledge, addSystemKnowledge, updateSystemKnowledge, deleteSystemKnowledge, learnFromTicket, syncOrderWithERPs, cartFeedbacks, abandonedEmailLogs, addCartFeedback, addAbandonedEmailLog, updateAbandonedEmailLog, profiles }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
