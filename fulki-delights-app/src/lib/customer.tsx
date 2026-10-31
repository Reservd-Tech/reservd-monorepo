import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

export type CustomerProfile = { name: string; phone: string; email: string };

const CART_KEY = "qssf.cart.v1";
const PROFILE_KEY = "qssf.profile.v1";
const ORDERS_KEY = "qssf.orders.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

type CustomerContextValue = {
  hydrated: boolean;
  cart: CartLine[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (line: Omit<CartLine, "quantity">, quantity: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  profile: CustomerProfile;
  saveProfile: (profile: Partial<CustomerProfile>) => void;
  onboarded: boolean;
  orderIds: string[];
  rememberOrder: (orderId: string) => void;
  signOut: () => void;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

const EMPTY_PROFILE: CustomerProfile = { name: "", phone: "", email: "" };

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [profile, setProfile] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [orderIds, setOrderIds] = useState<string[]>([]);

  useEffect(() => {
    setCart(read<CartLine[]>(CART_KEY, []));
    setProfile({ ...EMPTY_PROFILE, ...read<Partial<CustomerProfile>>(PROFILE_KEY, EMPTY_PROFILE) });
    setOrderIds(read<string[]>(ORDERS_KEY, []));
    setHydrated(true);
  }, []);

  const persistCart = useCallback((next: CartLine[]) => {
    setCart(next);
    write(CART_KEY, next);
  }, []);

  const addToCart = useCallback<CustomerContextValue["addToCart"]>(
    (line, quantity) => {
      setCart((prev) => {
        const existing = prev.find((l) => l.productId === line.productId);
        const next = existing
          ? prev.map((l) =>
              l.productId === line.productId ? { ...l, quantity: l.quantity + quantity } : l,
            )
          : [...prev, { ...line, quantity }];
        write(CART_KEY, next);
        return next;
      });
    },
    [],
  );

  const setQuantity = useCallback<CustomerContextValue["setQuantity"]>((productId, quantity) => {
    setCart((prev) => {
      const next =
        quantity <= 0
          ? prev.filter((l) => l.productId !== productId)
          : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l));
      write(CART_KEY, next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => persistCart([]), [persistCart]);

  const saveProfile = useCallback((next: Partial<CustomerProfile>) => {
    setProfile((prev) => {
      const merged = { ...prev, ...next };
      write(PROFILE_KEY, merged);
      return merged;
    });
  }, []);

  const rememberOrder = useCallback((orderId: string) => {
    setOrderIds((prev) => {
      if (prev.includes(orderId)) return prev;
      const next = [orderId, ...prev].slice(0, 60);
      write(ORDERS_KEY, next);
      return next;
    });
  }, []);

  const signOut = useCallback(() => {
    setProfile(EMPTY_PROFILE);
    setOrderIds([]);
    persistCart([]);
    write(PROFILE_KEY, EMPTY_PROFILE);
    write(ORDERS_KEY, []);
  }, [persistCart]);

  const value = useMemo<CustomerContextValue>(
    () => ({
      hydrated,
      cart,
      cartCount: cart.reduce((s, l) => s + l.quantity, 0),
      cartSubtotal: cart.reduce((s, l) => s + l.quantity * l.price, 0),
      addToCart,
      setQuantity,
      clearCart,
      profile,
      onboarded: Boolean(profile.name && profile.phone),
      saveProfile,
      orderIds,
      rememberOrder,
      signOut,
    }),
    [hydrated, cart, addToCart, setQuantity, clearCart, profile, saveProfile, orderIds, rememberOrder, signOut],
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error("useCustomer must be used inside CustomerProvider");
  return ctx;
}