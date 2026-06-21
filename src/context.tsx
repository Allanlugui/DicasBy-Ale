import React, { createContext, useContext, useState, useEffect } from 'react';
import { Store, Product, Order, OrderItem, OrderEvent, OrderStatus, Ticket, Review, TicketMessage, UserProfile, CompanySettings, Collaborator, QuoteRequest, DriveFolder, FileDocument, SystemNotification, DiscountCoupon, ShippingMethod, SystemKnowledge } from './types';
import { generateTrackingId, cleanUndefined } from './lib/utils';
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface CartItem extends OrderItem {}

interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
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
  addStore: (store: Store) => Promise<void>;
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
  calculateCartTotals: (coupon?: DiscountCoupon) => { subtotalBRL: number; serviceFeeBRL: number; storageFeeBRL: number; shippingFeeBRL: number; appFee: number; discountBRL: number; totalBRL: number };
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [documents, setDocuments] = useState<FileDocument[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [systemKnowledge, setSystemKnowledge] = useState<SystemKnowledge[]>([]);

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    // Check for email link sign in
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Por favor, confirme seu e-mail para validar o acesso');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => window.localStorage.removeItem('emailForSignIn'))
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
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
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
    window.localStorage.setItem('emailForSignIn', email);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const logout = async () => auth.signOut();

  const calculateCartTotals = (coupon?: DiscountCoupon) => {
    const serviceRate = companySettings?.serviceFeePercent ? (companySettings.serviceFeePercent / 100) : 0.3;
    const subtotalBRL = cart.reduce((acc, item) => acc + (item.product.priceBRL * item.quantity), 0);
    const serviceFeeBRL = subtotalBRL * serviceRate; 
    const storageFeeBRL = 0; 
    const shippingFeeBRL = 0; 
    const appFee = companySettings?.appFeeFixedBRL ?? (cart.length > 0 ? 20 : 0);
    
    let discountBRL = 0;
    if (coupon && coupon.active) {
      if (coupon.type === 'PERCENT') {
        discountBRL = subtotalBRL * (coupon.value / 100);
      } else {
        discountBRL = coupon.value;
      }
    }

    const totalBRL = Math.max(0, subtotalBRL + serviceFeeBRL + storageFeeBRL + shippingFeeBRL + appFee - discountBRL);
    
    return { subtotalBRL, serviceFeeBRL, storageFeeBRL, shippingFeeBRL, appFee, discountBRL, totalBRL };
  };

  const addToCart = (product: Product, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { productId: product.id, quantity, product }];
    });
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.productId !== productId));
  const clearCart = () => setCart([]);

  const createOrder = async (customerName: string, customerEmail: string, couponCode?: string, discountBRL?: number, extraOrderFields?: Partial<Order>) => {
    if (!user) throw new Error("Need to be logged in to order");
    
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

    const referredBy = localStorage.getItem('referred_by');
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
    
    // Increment coupon usage
    if (appliedCoupon) {
      await updateDoc(doc(db, 'coupons', appliedCoupon.id), {
        usageCount: (appliedCoupon.usageCount || 0) + 1
      });
    }

    if (finalReferredBy) {
      localStorage.removeItem('referred_by');
    }
    clearCart();
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, note?: string, photoUrl?: string, receipt?: any, extraFields?: Partial<Order>) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
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
    if (receipt) updateData.receipt = receipt;
    await updateDoc(doc(db, 'orders', orderId), updateData);

    // Trigger ERP sync if status is PAYMENT_RECEIVED
    if (status === 'PAYMENT_RECEIVED') {
      syncOrderWithERPs(orderId).catch(console.error);
    }

    // Auto-save attachment to client drive if provided
    if (photoUrl || receipt?.url) {
       const attachmentUrl = photoUrl || (receipt as any)?.url;
       const docName = status === 'PAYMENT_RECEIVED' ? `Comprovante_${order.trackingId}` : `Foto_Pedido_${order.trackingId}_${status}`;
       const category = status === 'PAYMENT_RECEIVED' ? 'Financeiro' : 'Logística';
       
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

      const updateData: any = {};
      if (data.adminHub) {
        updateData['integrationSync.adminHub'] = {
          status: data.adminHub.status || 'FAILED',
          error: data.adminHub.status === 'SUCCESS' ? null : (data.adminHub.error || 'Erro desconhecido'),
          syncedAt: data.adminHub.status === 'SUCCESS' ? new Date().toISOString() : null,
          attempts: (order.integrationSync?.adminHub?.attempts || 0) + 1
        };
      }
      if (data.nexus) {
        updateData['integrationSync.nexus'] = {
          status: data.nexus.status || 'FAILED',
          error: data.nexus.status === 'SUCCESS' ? null : (data.nexus.error || 'Erro desconhecido'),
          syncedAt: data.nexus.status === 'SUCCESS' ? new Date().toISOString() : null,
          attempts: (order.integrationSync?.nexus?.attempts || 0) + 1
        };
      }

      await updateDoc(doc(db, 'orders', orderId), updateData);
    } catch (err) {
      console.error("[ERP Sync Client Error]:", err);
      await updateDoc(doc(db, 'orders', orderId), {
        'integrationSync.adminHub.status': 'FAILED',
        'integrationSync.adminHub.error': String(err),
        'integrationSync.nexus.status': 'FAILED',
        'integrationSync.nexus.error': String(err)
      });
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
  
  const addStore = async (store: Store) => {
    const ref = doc(collection(db, 'stores'));
    await setDoc(ref, cleanUndefined({ ...store, id: ref.id }));
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

  return (
    <AppContext.Provider value={{ user, profile, companySettings, isAdmin, collaborator, stores, products, orders, tickets, reviews, cart, addToCart, removeFromCart, clearCart, createOrder, updateOrderStatus, saveProfile, saveCompanySettings, addProduct, updateProduct, deleteProduct, addStore, updateStore, deleteStore, createTicket, updateTicket, submitReview, sendLoginLink, logout, loginWithGoogle, quoteRequests, createQuoteRequest, updateQuoteRequest, approveQuoteAndCreateOrder, folders, documents, createFolder, updateFolder, deleteFolder, createDocument, updateDocument, deleteDocument, calculateCartTotals, autoSaveUserDocument, notifications, resolveNotification, coupons, addCoupon, updateCoupon, deleteCoupon, shippingMethods, addShippingMethod, updateShippingMethod, deleteShippingMethod, systemKnowledge, addSystemKnowledge, updateSystemKnowledge, deleteSystemKnowledge, learnFromTicket, syncOrderWithERPs }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
