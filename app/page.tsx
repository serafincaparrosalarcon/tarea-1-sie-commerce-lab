"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Eye,
  Gift,
  Hand,
  Heart,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Truck,
  User,
  Volume2,
  Waves,
  X,
  Bot,
  Boxes,
  FileText,
  MessageCircle,
  RotateCcw,
  Scale,
  Send,
  Cookie,
  TrendingUp,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import AdminHub from "./admin-hub";
import CustomerOrders from "./customer-orders";

type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  accent: string;
  imageUrl?: string | null;
  active?: boolean;
};
type Cart = Record<number, number>;
type OrderItem = {
  id: number;
  orderId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
};
type Order = {
  id: number;
  orderNumber: string;
  customerAlias: string;
  customerEmail?: string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  notifications?: OrderNotification[];
};
type OrderNotification = {
  id: number;
  template: string;
  deliveryStatus: string;
  createdAt: string;
};
type EventRow = {
  id: number;
  eventType: string;
  sessionId: string;
  payload: string;
  createdAt: string;
};
type Customer = { name: string; email: string };
type CheckoutData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal: string;
  shipping: string;
  payment: string;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  notes: string;
};
type PurchaseSuccess = {
  orderNumber: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  name: string;
  email: string;
  address: string;
  city: string;
  postal: string;
  date: string;
  emailStatus: "sent" | "simulated" | "failed";
  items: { name: string; quantity: number; unitPrice: number }[];
};

const fallbackProducts: Product[] = [
  [
    1,
    "PRD-001",
    "Aura Wave",
    "Visual",
    "Proyector de ondas suaves con intensidad y color regulables.",
    74.9,
    18,
    "violet",
  ],
  [
    2,
    "PRD-002",
    "Halo Sunset",
    "Visual",
    "Lámpara de atardecer para crear una luz cálida y envolvente.",
    46.5,
    25,
    "orange",
  ],
  [
    3,
    "PRD-003",
    "Nebula Mini",
    "Visual",
    "Proyector compacto de cielo estrellado para espacios pequeños.",
    39.9,
    32,
    "blue",
  ],
  [
    4,
    "PRD-004",
    "Pebble Calm",
    "Táctil",
    "Piedra sensorial de silicona con tres relieves antiestrés.",
    18.95,
    44,
    "rose",
  ],
  [
    5,
    "PRD-005",
    "Loom Roller",
    "Táctil",
    "Rodillo de mano con texturas intercambiables y presión suave.",
    24.5,
    29,
    "emerald",
  ],
  [
    6,
    "PRD-006",
    "Cloud Weight",
    "Táctil",
    "Cojín lastrado de sobremesa para favorecer una pausa consciente.",
    42.9,
    16,
    "cyan",
  ],
  [
    7,
    "PRD-007",
    "Hush One",
    "Sonoro",
    "Dispositivo de sonido ambiental con seis paisajes relajantes.",
    59.9,
    21,
    "indigo",
  ],
  [
    8,
    "PRD-008",
    "Tide Pocket",
    "Sonoro",
    "Generador portátil de ruido blanco, lluvia y oleaje.",
    34.95,
    37,
    "amber",
  ],
  [
    9,
    "PRD-009",
    "Prism Flow",
    "Visual",
    "Prisma luminoso que proyecta reflejos de color suaves y cambiantes.",
    68.9,
    14,
    "violet",
  ],
  [
    10,
    "PRD-010",
    "Terra Touch",
    "Táctil",
    "Trío de piedras cerámicas con relieves para pausas conscientes.",
    29.9,
    26,
    "emerald",
  ],
  [
    11,
    "PRD-011",
    "Rain Column",
    "Sonoro",
    "Columna de lluvia ambiental con sonido de agua regulable.",
    84.5,
    12,
    "blue",
  ],
  [
    12,
    "PRD-012",
    "Quiet Loop",
    "Táctil",
    "Aro sensorial lastrado y flexible con tejido de tacto suave.",
    32.9,
    20,
    "indigo",
  ],
  [
    13,
    "PRD-013",
    "Luma Breath",
    "Visual",
    "Lámpara de respiración con pulsos cálidos para marcar un ritmo pausado.",
    56.9,
    22,
    "amber",
  ],
  [
    14,
    "PRD-014",
    "Moss Press",
    "Táctil",
    "Cojín de presión para las manos con tejido bouclé de alta densidad.",
    36.5,
    19,
    "emerald",
  ],
  [
    15,
    "PRD-015",
    "Drift Radio",
    "Sonoro",
    "Paisajes de naturaleza con control analógico y sonido envolvente.",
    72,
    15,
    "blue",
  ],
  [
    16,
    "PRD-016",
    "Ember Arc",
    "Visual",
    "Arco luminoso de sobremesa con tres temperaturas de luz indirecta.",
    89.9,
    10,
    "orange",
  ],
  [
    17,
    "PRD-017",
    "Grain Set",
    "Táctil",
    "Cuatro discos de madera con relieves inspirados en formas naturales.",
    38.9,
    28,
    "rose",
  ],
  [
    18,
    "PRD-018",
    "Night Current",
    "Sonoro",
    "Altavoz nocturno con ruido marrón, ventilador y luz de orientación.",
    64.9,
    17,
    "cyan",
  ],
].map(([id, sku, name, category, description, price, stock, accent]) => ({
  id: +id,
  sku: String(sku),
  name: String(name),
  category: String(category),
  description: String(description),
  price: +price,
  stock: +stock,
  accent: String(accent),
}));

const productImages: Record<string, string> = Object.fromEntries(
  [
    "aura-wave",
    "halo-sunset",
    "nebula-mini",
    "pebble-calm",
    "loom-roller",
    "cloud-weight",
    "hush-one",
    "tide-pocket",
    "prism-flow",
    "terra-touch",
    "rain-column",
    "quiet-loop",
    "luma-breath",
    "moss-press",
    "drift-radio",
    "ember-arc",
    "grain-set",
    "night-current",
  ].map((name, index) => [
    `PRD-${String(index + 1).padStart(3, "0")}`,
    `/products/${name}.jpg`,
  ]),
);

const details: Record<
  string,
  {
    long: string;
    use: string;
    features: string[];
    rating: number;
    reviews: number;
    badge?: string;
  }
> = {
  "PRD-001": {
    long: "Convierte paredes y techos en un paisaje de luz en movimiento. Sus transiciones lentas ayudan a reducir estímulos bruscos al final del día.",
    use: "Colócala a dos metros de la pared y elige una intensidad baja durante 15–30 minutos.",
    features: [
      "5 escenas luminosas",
      "Temporizador de 30 minutos",
      "Brillo regulable",
    ],
    rating: 4.8,
    reviews: 126,
    badge: "Más vendido",
  },
  "PRD-002": {
    long: "Una luz circular cálida que imita los tonos del atardecer y crea un rincón acogedor sin iluminar toda la estancia.",
    use: "Oriéntala hacia una pared lateral para lograr una luz indirecta antes de dormir.",
    features: [
      "Ángulo ajustable",
      "Tres niveles de calidez",
      "Base antideslizante",
    ],
    rating: 4.7,
    reviews: 89,
  },
  "PRD-003": {
    long: "Proyección estelar compacta para dormitorios, despachos o rincones de lectura con un patrón sereno y discreto.",
    use: "Utilízalo con luz ambiente baja y selecciona el modo fijo o de rotación lenta.",
    features: ["Modo fijo y rotatorio", "Carga USB-C", "Apagado automático"],
    rating: 4.6,
    reviews: 64,
  },
  "PRD-004": {
    long: "Pieza de silicona silenciosa con zonas de relieve distintas para mantener las manos ocupadas y descargar tensión.",
    use: "Recorre cada textura con el pulgar mientras respiras de forma pausada.",
    features: ["Tres relieves", "Silicona lavable", "Formato de bolsillo"],
    rating: 4.9,
    reviews: 203,
    badge: "Favorito",
  },
  "PRD-005": {
    long: "Rodillo manual con bandas intercambiables que ofrece presión y textura de forma controlada.",
    use: "Pásalo lentamente entre las palmas o sobre el antebrazo durante uno o dos minutos.",
    features: ["Bandas intercambiables", "Presión suave", "Fácil limpieza"],
    rating: 4.5,
    reviews: 48,
  },
  "PRD-006": {
    long: "Cojín compacto con peso distribuido que aporta una sensación de apoyo estable durante el descanso o el trabajo.",
    use: "Apóyalo sobre el regazo o los antebrazos en pausas de 10–20 minutos.",
    features: ["Peso de 1,2 kg", "Funda extraíble", "Tejido transpirable"],
    rating: 4.8,
    reviews: 77,
  },
  "PRD-007": {
    long: "Reproductor ambiental con paisajes sonoros para acompañar la concentración, la lectura o el descanso.",
    use: "Elige un paisaje y ajusta el volumen justo por debajo del nivel de conversación.",
    features: ["6 paisajes sonoros", "Temporizador", "Volumen continuo"],
    rating: 4.8,
    reviews: 142,
    badge: "Top sonoro",
  },
  "PRD-008": {
    long: "Generador portátil de ruido blanco, lluvia y oleaje para mantener una atmósfera estable estés donde estés.",
    use: "Actívalo en viajes, pausas o rutinas nocturnas y programa su apagado.",
    features: ["3 sonidos", "12 horas de batería", "Clip de transporte"],
    rating: 4.6,
    reviews: 91,
  },
  "PRD-009": {
    long: "Prisma de vidrio que transforma una luz suave en reflejos cambiantes, añadiendo movimiento visual sin pantallas.",
    use: "Sitúalo cerca de una pared y selecciona una velocidad lenta para una pausa breve.",
    features: ["Reflejos multicolor", "Motor silencioso", "Base metálica"],
    rating: 4.7,
    reviews: 58,
    badge: "Nuevo",
  },
  "PRD-010": {
    long: "Tres piedras cerámicas con temperaturas, pesos y relieves distintos para una exploración táctil pausada.",
    use: "Sostén una piedra cada vez y recorre sus canales mientras centras la atención en el tacto.",
    features: ["Set de 3 piezas", "Cerámica mineral", "Estuche incluido"],
    rating: 4.8,
    reviews: 72,
  },
  "PRD-011": {
    long: "Una columna de lluvia de sobremesa que combina el movimiento visible del agua con un sonido continuo y suave.",
    use: "Llena el depósito, ajusta el caudal y úsala como fondo durante lectura o relajación.",
    features: ["Caudal regulable", "Luz ambiental", "Circuito cerrado"],
    rating: 4.9,
    reviews: 39,
    badge: "Premium",
  },
  "PRD-012": {
    long: "Aro flexible con peso ligero y tejido texturizado que puede apretarse, girarse o apoyarse sobre las manos.",
    use: "Manipúlalo con ambas manos siguiendo un ritmo lento y constante.",
    features: [
      "Flexible y silencioso",
      "Peso equilibrado",
      "Tejido resistente",
    ],
    rating: 4.6,
    reviews: 54,
  },
  "PRD-013": {
    long: "Esfera de vidrio mate que expande y contrae su luz para acompañar ejercicios de respiración de uno a cinco minutos.",
    use: "Sincroniza la inhalación y la exhalación con el pulso de luz elegido.",
    features: ["3 ritmos de respiración", "Luz sin parpadeo", "Control táctil"],
    rating: 4.9,
    reviews: 31,
    badge: "Nuevo",
  },
  "PRD-014": {
    long: "Pieza blanda y densa que recibe la presión de las manos y recupera lentamente su forma.",
    use: "Presiona con ambas palmas durante cinco segundos y libera siguiendo un ritmo constante.",
    features: ["Retorno lento", "Funda lavable", "Uso silencioso"],
    rating: 4.7,
    reviews: 26,
    badge: "Nuevo",
  },
  "PRD-015": {
    long: "Dispositivo sonoro de estética analógica con ambientes grabados en alta calidad: bosque, lluvia, costa, fuego y viento.",
    use: "Gira el selector hasta encontrar el paisaje adecuado y programa 30, 60 o 90 minutos.",
    features: [
      "8 paisajes naturales",
      "Altavoz estéreo",
      "Temporizador físico",
    ],
    rating: 4.8,
    reviews: 44,
  },
  "PRD-016": {
    long: "Pieza escultórica que proyecta un arco de luz cálida sobre la pared y evita la iluminación directa durante la noche.",
    use: "Colócala en una superficie estable y dirige el arco hacia una pared lisa.",
    features: ["3 temperaturas", "Intensidad regulable", "Memoria de ajuste"],
    rating: 4.9,
    reviews: 19,
    badge: "Edición diseño",
  },
  "PRD-017": {
    long: "Cuatro piezas de nogal con patrones diferentes para explorar líneas, ondas y círculos con las yemas de los dedos.",
    use: "Elige un disco y sigue el relieve lentamente durante una pausa de atención.",
    features: ["Madera certificada", "4 patrones", "Bandeja de lino"],
    rating: 4.8,
    reviews: 35,
  },
  "PRD-018": {
    long: "Combina sonidos graves constantes con una luz de orientación tenue para una atmósfera estable durante la noche.",
    use: "Selecciona ruido marrón o ventilador, regula el volumen y activa el apagado gradual.",
    features: ["10 sonidos", "Luz nocturna", "Batería de 14 horas"],
    rating: 4.7,
    reviews: 61,
  },
};
const euro = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});
const statusLabel: Record<string, string> = {
  CREADO: "Creado",
  PAGO_SIMULADO: "Pago simulado",
  PREPARACIÓN: "Preparación",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};
const initialCheckout: CheckoutData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postal: "",
  shipping: "standard",
  payment: "card",
  cardName: "",
  cardNumber: "4242 4242 4242 4242",
  expiry: "12/30",
  cvv: "123",
  notes: "",
};

export default function Home() {
  const [view, setView] = useState<"shop" | "dashboard" | "orders" | "events" | "management" | "accountOrders">(
      "shop",
    ),
    [products, setProducts] = useState<Product[]>(fallbackProducts),
    [cart, setCart] = useState<Cart>({}),
    [category, setCategory] = useState("Todas"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("featured"),
    [priceFilter, setPriceFilter] = useState("all"),
    [selectedProduct, setSelectedProduct] = useState<Product | null>(null),
    [cartOpen, setCartOpen] = useState(false),
    [checkout, setCheckout] = useState(false),
    [checkoutStep, setCheckoutStep] = useState(1),
    [checkoutData, setCheckoutData] = useState<CheckoutData>(initialCheckout),
    [coupon, setCoupon] = useState(""),
    [couponPercent, setCouponPercent] = useState(0),
    [loading, setLoading] = useState(false),
    [success, setSuccess] = useState<PurchaseSuccess | null>(null),
    [orders, setOrders] = useState<Order[]>([]),
    [events, setEvents] = useState<EventRow[]>([]),
    [backendReady, setBackendReady] = useState(true),
    [accountOpen, setAccountOpen] = useState(false),
    [accountMode, setAccountMode] = useState<"login" | "register">("login"),
    [customer, setCustomer] = useState<Customer | null>(null),
    [authForm, setAuthForm] = useState({ name: "", email: "", password: "" }),
    [favorites, setFavorites] = useState<number[]>([]),
    [showFavorites, setShowFavorites] = useState(false);
  const [activeTool, setActiveTool] = useState<
      null | "quiz" | "bundle" | "compare" | "tracking" | "support" | "legal"
    >(null),
    [compareIds, setCompareIds] = useState<number[]>([]),
    [quizNeed, setQuizNeed] = useState("dormir"),
    [quizSpace, setQuizSpace] = useState("dormitorio"),
    [bundle, setBundle] = useState<Record<string, number>>({}),
    [cookieVisible, setCookieVisible] = useState(false),
    [chatOpen, setChatOpen] = useState(false),
    [chatInput, setChatInput] = useState(""),
    [chatMessages, setChatMessages] = useState<
      { from: "bot" | "user"; text: string }[]
    >([
      {
        from: "bot",
        text: "Hola, soy Aura. ¿Buscas ayuda para dormir, concentrarte o relajarte?",
      },
    ]),
    [legalPage, setLegalPage] = useState("Privacidad"),
    [trackingCode, setTrackingCode] = useState("");
  const sessionId = "SES-DEMO";
  useEffect(() => {
    try {
      const c = localStorage.getItem("sensoria-customer"),
        f = localStorage.getItem("sensoria-favorites"),
        savedCart = localStorage.getItem("sensoria-cart");
      if (c) setCustomer(JSON.parse(c));
      if (f) setFavorites(JSON.parse(f));
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        setCart(parsed);
        if (Object.keys(parsed).length)
          toast.info("Hemos recuperado tu carrito anterior");
      }
      setCookieVisible(!localStorage.getItem("sensoria-cookies"));
    } catch {}
    fetch("/api/products")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data = (await r.json()) as { products?: Product[] };
        if (data.products?.length) setProducts(data.products);
      })
      .catch(() => setBackendReady(false));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("sensoria-cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);
  const logEvent = useCallback(
    (eventType: string, extra: Record<string, unknown> = {}) => {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, sessionId, ...extra }),
      }).catch(() => undefined);
    },
    [sessionId],
  );
  const categories = [
    "Todas",
    ...Array.from(new Set(products.map((p) => p.category))),
  ];
  const filtered = useMemo(() => {
    const rows = products.filter(
      (p) =>
        (category === "Todas" || p.category === category) &&
        (!showFavorites || favorites.includes(p.id)) &&
        `${p.name} ${p.category} ${p.sku} ${p.description}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (priceFilter === "all" ||
          (priceFilter === "low" && p.price < 30) ||
          (priceFilter === "mid" && p.price >= 30 && p.price <= 60) ||
          (priceFilter === "high" && p.price > 60)),
    );
    return [...rows].sort((a, b) =>
      sort === "price-asc"
        ? a.price - b.price
        : sort === "price-desc"
          ? b.price - a.price
          : sort === "rating"
            ? (details[b.sku]?.rating ?? 0) - (details[a.sku]?.rating ?? 0)
            : a.id - b.id,
    );
  }, [products, category, query, priceFilter, sort, showFavorites, favorites]);
  const cartLines = Object.entries(cart)
      .map(([id, quantity]) => ({
        product: products.find((p) => p.id === +id)!,
        quantity,
      }))
      .filter((x) => x.product),
    cartCount = cartLines.reduce((s, l) => s + l.quantity, 0),
    subtotal = cartLines.reduce((s, l) => s + l.product.price * l.quantity, 0),
    discount = subtotal * couponPercent / 100,
    shipping =
      checkoutData.shipping === "express"
        ? 8.95
        : subtotal >= 80
          ? 0
          : subtotal
            ? 4.95
            : 0,
    tax = (subtotal - discount + shipping) * 0.21,
    total = subtotal - discount + shipping + tax;
  function add(p: Product) {
    setCart((c) => ({ ...c, [p.id]: Math.min((c[p.id] ?? 0) + 1, 10) }));
    logEvent("cart.item_added", {
      productId: p.id,
      payload: { sku: p.sku, quantity: 1 },
    });
    toast.success(`${p.name} añadido al carrito`);
  }
  function changeQty(p: Product, d: number) {
    setCart((c) => {
      const n = (c[p.id] ?? 0) + d,
        copy = { ...c };
      if (n <= 0) delete copy[p.id];
      else copy[p.id] = Math.min(n, 10);
      return copy;
    });
    if (d < 0)
      logEvent("cart.item_removed", {
        productId: p.id,
        payload: { sku: p.sku },
      });
  }
  function toggleFavorite(id: number) {
    setFavorites((c) => {
      const n = c.includes(id) ? c.filter((x) => x !== id) : [...c, id];
      localStorage.setItem("sensoria-favorites", JSON.stringify(n));
      return n;
    });
  }
  function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!authForm.email.includes("@") || authForm.password.length < 4) {
      toast.error(
        "Introduce un email válido y una contraseña de al menos 4 caracteres",
      );
      return;
    }
    const p = {
      name: authForm.name.trim() || authForm.email.split("@")[0],
      email: authForm.email.trim(),
    };
    setCustomer(p);
    localStorage.setItem("sensoria-customer", JSON.stringify(p));
    setCheckoutData((d) => ({ ...d, name: p.name, email: p.email }));
    toast.success(
      accountMode === "register"
        ? "Cuenta de demostración creada"
        : "Sesión de demostración iniciada",
    );
    setAuthForm({ name: "", email: "", password: "" });
  }
  function signOut() {
    setCustomer(null);
    localStorage.removeItem("sensoria-customer");
    toast.success("Sesión cerrada");
  }
  function startCheckout() {
    if (!cartLines.length) return;
    setCheckout(true);
    setCheckoutStep(1);
    setSuccess(null);
    if (customer)
      setCheckoutData((d) => ({
        ...d,
        name: customer.name,
        email: customer.email,
      }));
    logEvent("checkout.started", { payload: { itemCount: cartCount } });
  }
  async function validateCoupon() {
    if (!coupon.trim()) { setCouponPercent(0); toast.info("Introduce un código"); return; }
    try {
      const r = await fetch(`/api/coupons?code=${encodeURIComponent(coupon)}&subtotal=${subtotal}`);
      const d = await r.json() as { valid?: boolean; discountPercent?: number; minimumAmount?: number };
      if (!d.valid) { setCouponPercent(0); toast.error(d.minimumAmount ? `Cupón no válido o compra mínima de ${euro.format(d.minimumAmount)}` : "Cupón no válido"); return; }
      setCouponPercent(d.discountPercent ?? 0); toast.success(`${d.discountPercent}% de descuento aplicado`);
    } catch { toast.error("No se pudo validar el cupón"); }
  }
  function validateStep() {
    if (
      checkoutStep === 1 &&
      (!checkoutData.name ||
        !checkoutData.email.includes("@") ||
        checkoutData.phone.length < 9)
    ) {
      toast.error("Completa correctamente tus datos de contacto");
      return false;
    }
    if (
      checkoutStep === 2 &&
      (!checkoutData.address ||
        !checkoutData.city ||
        checkoutData.postal.length < 5)
    ) {
      toast.error("Completa la dirección de entrega");
      return false;
    }
    if (
      checkoutStep === 3 &&
      checkoutData.payment === "card" &&
      (!checkoutData.cardName ||
        checkoutData.cardNumber.replaceAll(" ", "").length < 16 ||
        checkoutData.cvv.length < 3)
    ) {
      toast.error("Completa los datos de la tarjeta de prueba");
      return false;
    }
    return true;
  }
  async function placeOrder() {
    if (!cartLines.length || !validateStep()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerAlias:
              checkoutData.name || customer?.name || "CLIENTE-PRUEBA",
            customerEmail: checkoutData.email,
            sessionId,
            coupon,
            shippingMethod: checkoutData.shipping,
            paymentMethod:
              checkoutData.payment === "card"
                ? "Tarjeta de prueba"
                : "PayPal de prueba",
            items: cartLines.map((l) => ({
              productId: l.product.id,
              quantity: l.quantity,
            })),
          }),
        }),
        data = (await r.json()) as {
          error?: string;
          order?: { orderNumber: string; total: number; subtotal: number; discount: number; shipping: number; tax: number };
          emailStatus?: "sent" | "simulated" | "failed";
        };
      if (!r.ok || !data.order)
        throw new Error(data.error || "No se pudo crear el pedido");
      setSuccess({
        orderNumber: data.order.orderNumber,
        total: data.order.total,
        subtotal: data.order.subtotal,
        discount: data.order.discount,
        shipping: data.order.shipping,
        tax: data.order.tax,
        name: checkoutData.name,
        email: checkoutData.email,
        address: checkoutData.address,
        city: checkoutData.city,
        postal: checkoutData.postal,
        date: new Date().toISOString(),
        emailStatus: data.emailStatus ?? "simulated",
        items: cartLines.map((l) => ({
          name: l.product.name,
          quantity: l.quantity,
          unitPrice: l.product.price,
        })),
      });
      localStorage.setItem(
        "sensoria-last-order",
        JSON.stringify({
          ...data.order,
          date: new Date().toISOString(),
          items: cartLines.map((l) => ({
            name: l.product.name,
            quantity: l.quantity,
            unitPrice: l.product.price,
          })),
        }),
      );
      toast.success(
        data.emailStatus === "sent"
          ? `Confirmación enviada a ${checkoutData.email}`
          : "Confirmación registrada en modo académico",
      );
      setCart({});
      setCheckout(false);
      setCheckoutStep(1);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error al generar el pedido",
      );
    } finally {
      setLoading(false);
    }
  }
  async function loadBackoffice(n: "dashboard" | "orders" | "events") {
    setView(n);
    try {
      if (n === "dashboard") {
        const [ro, re] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/events"),
        ]);
        const od = (await ro.json()) as { orders?: Order[] },
          ed = (await re.json()) as { events?: EventRow[] };
        setOrders(od.orders ?? []);
        setEvents(ed.events ?? []);
      } else {
        const r = await fetch(n === "orders" ? "/api/orders" : "/api/events"),
          d = (await r.json()) as {
            error?: string;
            orders?: Order[];
            events?: EventRow[];
          };
        if (!r.ok) throw new Error(d.error);
        n === "orders" ? setOrders(d.orders ?? []) : setEvents(d.events ?? []);
      }
    } catch {
      toast.error("No se pudieron cargar los datos internos");
    }
  }
  async function loadManagement() {
    setView("management");
    try {
      const [ro, re] = await Promise.all([fetch("/api/orders"), fetch("/api/events")]);
      const od = await ro.json() as { orders?: Order[] };
      const ed = await re.json() as { events?: EventRow[] };
      setOrders(od.orders ?? []);
      setEvents(ed.events ?? []);
    } catch { toast.error("No se pudieron cargar los datos de gestión"); }
  }
  async function updateStatus(id: number, status: string) {
    const r = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, status }),
    });
    if (r.ok) {
      const data = (await r.json()) as {
        emailStatus?: "sent" | "simulated" | "failed";
      };
      setOrders((rows) =>
        rows.map((row) => (row.id === id ? { ...row, status } : row)),
      );
      toast.success(
        data.emailStatus === "sent"
          ? "Estado actualizado y correo enviado al comprador"
          : "Estado actualizado y aviso registrado en modo académico",
      );
    } else toast.error("No se pudo actualizar");
  }
  function addBundle() {
    const ids = Object.values(bundle);
    if (ids.length < 3) {
      toast.error("Elige un producto visual, uno táctil y uno sonoro");
      return;
    }
    setCart((c) => {
      const next = { ...c };
      ids.forEach((id) => (next[id] = (next[id] ?? 0) + 1));
      return next;
    });
    setActiveTool(null);
    setCartOpen(true);
    toast.success("Pack sensorial añadido con un 12 % de descuento simulado");
  }
  function sendChat() {
    const text = chatInput.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    const reply = lower.includes("dorm")
      ? "Para dormir te recomiendo Night Current, Luma Breath y una rutina de 20 minutos."
      : lower.includes("foco") || lower.includes("concentr")
        ? "Para concentrarte, combina Grain Set con Drift Radio a volumen bajo."
        : lower.includes("env")
          ? "El envío estándar tarda 48–72 horas simuladas y es gratis desde 80 €."
          : "Puedo ayudarte con productos, pedidos, envíos, devoluciones y rituales sensoriales.";
    setChatMessages((m) => [
      ...m,
      { from: "user", text },
      { from: "bot", text: reply },
    ]);
    setChatInput("");
  }
  return (
    <div className="sensoria-app">
      <Toaster position="top-center" richColors />
      <div className="academic-banner">
        <ShieldCheck size={15} />
        <span>
          PROTOTIPO ACADÉMICO · Cuenta, pedidos y pagos completamente simulados
        </span>
      </div>
      <header className="site-header">
        <button className="brand" onClick={() => setView("shop")}>
          <span className="brand-mark">
            <Waves />
          </span>
          <span>Sensoria</span>
        </button>
        <nav className="desktop-nav">
          <button
            className={view === "shop" ? "active" : ""}
            onClick={() => setView("shop")}
          >
            Tienda
          </button>
          <button
            className={view === "dashboard" ? "active" : ""}
            onClick={() => loadBackoffice("dashboard")}
          >
            Panel
          </button>
          <button
            className={view === "orders" ? "active" : ""}
            onClick={() => loadBackoffice("orders")}
          >
            Pedidos
          </button>
          <button
            className={view === "events" ? "active" : ""}
            onClick={() => loadBackoffice("events")}
          >
            Eventos
          </button>
          <button
            className={view === "management" ? "active" : ""}
            onClick={loadManagement}
          >
            Gestión
          </button>
        </nav>
        <div className="header-actions">
          <button className="icon-action" onClick={() => setAccountOpen(true)}>
            <User />
            <span>{customer ? customer.name.split(" ")[0] : "Mi cuenta"}</span>
          </button>
          <button className="cart-button" onClick={() => setCartOpen(true)}>
            <ShoppingCart />
            <span>Carrito</span>
            {cartCount > 0 && <b>{cartCount}</b>}
          </button>
        </div>
      </header>
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          favorite={favorites.includes(selectedProduct.id)}
          onFavorite={() => toggleFavorite(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onAdd={() => {
            add(selectedProduct);
            setSelectedProduct(null);
          }}
        />
      )}
      {accountOpen && (
        <AccountPanel
          customer={customer}
          mode={accountMode}
          setMode={setAccountMode}
          form={authForm}
          setForm={setAuthForm}
          favorites={favorites.length}
          onSubmit={submitAccount}
          onSignOut={signOut}
          onClose={() => setAccountOpen(false)}
          onShopFavorites={() => {
            setShowFavorites(true);
            setAccountOpen(false);
            setView("shop");
          }}
          onOrders={() => {
            setAccountOpen(false);
            setView("accountOrders");
          }}
        />
      )}
      {activeTool && (
        <ToolModal
          type={activeTool}
          onClose={() => setActiveTool(null)}
          products={products}
          compareIds={compareIds}
          quizNeed={quizNeed}
          setQuizNeed={setQuizNeed}
          quizSpace={quizSpace}
          setQuizSpace={setQuizSpace}
          bundle={bundle}
          setBundle={setBundle}
          onAddBundle={addBundle}
          trackingCode={trackingCode}
          setTrackingCode={setTrackingCode}
          legalPage={legalPage}
          onSupport={() => {
            toast.success("Solicitud registrada. Referencia SOP-2048");
            setActiveTool(null);
          }}
        />
      )}
      {view === "shop" && (
        <main>
          <section className="shop-intro">
            <div className="hero-copy">
              <p className="eyebrow">
                <Sparkles /> BIENESTAR SENSORIAL PARA ADULTOS
              </p>
              <h1>
                Tu ritual de calma,
                <br />
                <em>diseñado a medida.</em>
              </h1>
              <p>
                Luz, tacto y sonido para crear pausas reales en casa, en el
                trabajo o antes de dormir.
              </p>
              <div className="hero-actions">
                <button
                  onClick={() =>
                    document
                      .querySelector(".catalog")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Explorar 18 productos <ArrowRight />
                </button>
                <button
                  className="secondary-hero"
                  onClick={() => setActiveTool("quiz")}
                >
                  Hacer el test sensorial
                </button>
              </div>
              <div className="trust-row">
                <span>
                  <Truck /> Envío gratis +80 €
                </span>
                <span>
                  <ShieldCheck /> Compra de prueba segura
                </span>
                <span>
                  <PackageCheck /> 30 días simulados
                </span>
              </div>
            </div>
            <div className="hero-image">
              <img
                src="/sensoria-hero.jpg"
                alt="Objetos de bienestar sensorial"
              />
              <div>
                <small>Ritual recomendado</small>
                <strong>Luz baja · textura · sonido</strong>
              </div>
            </div>
          </section>
          <section className="sensory-strip">
            {[
              ["Visual", "Luz y proyección", <Eye key="e" />],
              ["Táctil", "Texturas antiestrés", <Hand key="h" />],
              ["Sonoro", "Ambientes de calma", <Volume2 key="v" />],
            ].map(([name, sub, icon]) => (
              <button
                key={String(name)}
                onClick={() => setCategory(String(name))}
              >
                {icon}
                <span>
                  <b>{name}</b>
                  <small>{sub}</small>
                </span>
                <ArrowRight />
              </button>
            ))}
          </section>
          {!backendReady && (
            <div className="notice">
              <Activity />
              <span>
                Vista de demostración activa. La persistencia se habilitará al
                publicar.
              </span>
            </div>
          )}
          <section className="collection-highlight">
            <div>
              <span>NUEVA COLECCIÓN</span>
              <h2>
                Pequeñas pausas,
                <br />
                mejor diseñadas.
              </h2>
              <p>
                Seis nuevos instrumentos para respirar, concentrarte y cerrar el
                día con menos ruido.
              </p>
              <button
                onClick={() =>
                  document
                    .querySelector(".catalog")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Descubrir novedades <ArrowRight />
              </button>
            </div>
            <div className="highlight-products">
              {products.slice(-3).map((p) => (
                <button key={p.id} onClick={() => setSelectedProduct(p)}>
                  <img src={p.imageUrl || productImages[p.sku]} alt={p.name} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="catalog-toolbar">
            <div className="search-field">
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar productos, usos o categorías"
              />
            </div>
            <div className="toolbar-controls">
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
              >
                <option value="all">Todos los precios</option>
                <option value="low">Menos de 30 €</option>
                <option value="mid">30 € – 60 €</option>
                <option value="high">Más de 60 €</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Destacados</option>
                <option value="rating">Mejor valorados</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
              <button
                className={
                  showFavorites ? "favorite-filter active" : "favorite-filter"
                }
                onClick={() => setShowFavorites((v) => !v)}
              >
                <Heart fill={showFavorites ? "currentColor" : "none"} />{" "}
                Favoritos ({favorites.length})
              </button>
            </div>
          </section>
          <section className="category-tabs wrap">
            {categories.map((c) => (
              <button
                key={c}
                className={category === c ? "selected" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </section>
          <section className="catalog">
            <div className="section-heading">
              <div>
                <p className="eyebrow">COLECCIÓN PERMANENTE</p>
                <h2>
                  {showFavorites
                    ? "Tus favoritos"
                    : category === "Todas"
                      ? "Todos los sentidos"
                      : category}
                </h2>
              </div>
              <span>{filtered.length} productos</span>
            </div>
            {filtered.length === 0 ? (
              <Empty
                icon={<Heart />}
                title="No hay resultados"
                text="Prueba a cambiar los filtros o añade productos a favoritos."
                action={() => {
                  setQuery("");
                  setPriceFilter("all");
                  setShowFavorites(false);
                }}
              />
            ) : (
              <div className="product-grid">
                {filtered.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    favorite={favorites.includes(p.id)}
                    compared={compareIds.includes(p.id)}
                    onFavorite={() => toggleFavorite(p.id)}
                    onCompare={() =>
                      setCompareIds((c) =>
                        c.includes(p.id)
                          ? c.filter((id) => id !== p.id)
                          : c.length < 3
                            ? [...c, p.id]
                            : (toast.error("Puedes comparar hasta 3 productos"),
                              c),
                      )
                    }
                    onOpen={() => {
                      setSelectedProduct(p);
                      logEvent("product.viewed", {
                        productId: p.id,
                        payload: { sku: p.sku },
                      });
                    }}
                    onAdd={() => add(p)}
                  />
                ))}
              </div>
            )}
          </section>
          {compareIds.length > 0 && (
            <div className="compare-dock">
              <Scale />
              <span>
                {compareIds.length} producto{compareIds.length > 1 ? "s" : ""}{" "}
                seleccionado{compareIds.length > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setActiveTool("compare")}
                disabled={compareIds.length < 2}
              >
                Comparar ahora
              </button>
              <button onClick={() => setCompareIds([])}>
                <X />
              </button>
            </div>
          )}
          <section className="recommend-strip">
            <div>
              <p className="eyebrow">RECOMENDADO PARA TI</p>
              <h2>Completa tu ritual</h2>
            </div>
            <div>
              {products
                .filter((p) =>
                  ["PRD-013", "PRD-014", "PRD-018"].includes(p.sku),
                )
                .map((p) => (
                  <button key={p.id} onClick={() => setSelectedProduct(p)}>
                    <img src={p.imageUrl || productImages[p.sku]} alt={p.name} />
                    <span>
                      <b>{p.name}</b>
                      <small>
                        {p.category} · {euro.format(p.price)}
                      </small>
                    </span>
                    <ArrowRight />
                  </button>
                ))}
            </div>
          </section>
          <section className="ritual-finder">
            <div>
              <p className="eyebrow">ENCUENTRA TU RITUAL</p>
              <h2>¿Qué necesitas ahora?</h2>
              <p>
                Elige un momento y descubre una selección pensada para
                acompañarlo.
              </p>
            </div>
            <div className="ritual-options">
              {[
                [
                  "Táctil",
                  "Recuperar el foco",
                  "Objetos silenciosos para manos inquietas y pausas breves.",
                ],
                [
                  "Visual",
                  "Bajar el ritmo",
                  "Luz indirecta y movimiento lento para cerrar el día.",
                ],
                [
                  "Sonoro",
                  "Dormir mejor",
                  "Sonidos continuos que suavizan el ambiente nocturno.",
                ],
              ].map((r, i) => (
                <button
                  key={r[0]}
                  onClick={() => {
                    setCategory(r[0]);
                    setSort("rating");
                    setPriceFilter("all");
                    setShowFavorites(false);
                    setQuery("");
                    toast.success(`Selección «${r[1]}» preparada`);
                    window.setTimeout(
                      () =>
                        document
                          .querySelector(".catalog")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                      50,
                    );
                  }}
                  aria-label={`${r[1]}: ver productos recomendados`}
                >
                  <span>0{i + 1}</span>
                  <h3>{r[1]}</h3>
                  <p>{r[2]}</p>
                  <ArrowRight />
                </button>
              ))}
            </div>
          </section>
          <section className="professional-tools">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SERVICIOS SENSORIA</p>
                <h2>Todo para decidir mejor</h2>
              </div>
            </div>
            <div className="tool-cards">
              <button onClick={() => setActiveTool("quiz")}>
                <Sparkles />
                <span>
                  <b>Test sensorial</b>
                  <small>Recibe una recomendación personalizada</small>
                </span>
                <ArrowRight />
              </button>
              <button onClick={() => setActiveTool("bundle")}>
                <Boxes />
                <span>
                  <b>Crea tu pack</b>
                  <small>Combina los tres sentidos y ahorra</small>
                </span>
                <ArrowRight />
              </button>
              <button onClick={() => setActiveTool("tracking")}>
                <Truck />
                <span>
                  <b>Sigue tu pedido</b>
                  <small>Consulta el estado de una compra</small>
                </span>
                <ArrowRight />
              </button>
              <button onClick={() => setActiveTool("support")}>
                <RotateCcw />
                <span>
                  <b>Soporte y devoluciones</b>
                  <small>Registra una incidencia simulada</small>
                </span>
                <ArrowRight />
              </button>
            </div>
          </section>
          <section className="bundle-banner">
            <div>
              <span>PACK RITUAL COMPLETO</span>
              <h2>Un producto para cada sentido.</h2>
              <p>
                Crea tu combinación visual, táctil y sonora con un 12 % de
                descuento simulado.
              </p>
              <button onClick={() => setActiveTool("bundle")}>
                Crear mi pack <ArrowRight />
              </button>
            </div>
            <div className="bundle-stack">
              {[
                fallbackProducts[12],
                fallbackProducts[13],
                fallbackProducts[14],
              ].map((p) => (
                <img key={p.id} src={p.imageUrl || productImages[p.sku]} alt={p.name} />
              ))}
            </div>
          </section>
          <section className="service-grid">
            <article>
              <Truck />
              <h3>Envío flexible</h3>
              <p>Entrega estándar o exprés, con seguimiento simulado.</p>
            </article>
            <article>
              <Gift />
              <h3>Listo para regalar</h3>
              <p>Presentación cuidada y opción de nota personal.</p>
            </article>
            <article>
              <ShieldCheck />
              <h3>Selección responsable</h3>
              <p>Materiales duraderos, instrucciones claras y uso adulto.</p>
            </article>
            <article>
              <Mail />
              <h3>Acompañamiento</h3>
              <p>Guías de uso para crear tu ritual.</p>
            </article>
          </section>
          <ReviewsHub />
          <section className="faq-section">
            <div>
              <p className="eyebrow">AYUDA</p>
              <h2>Preguntas frecuentes</h2>
            </div>
            <div>
              {[
                [
                  "¿Los productos son terapéuticos?",
                  "No sustituyen atención médica. Son objetos cotidianos de relajación y regulación ambiental.",
                ],
                [
                  "¿Puedo comprar sin crear una cuenta?",
                  "Sí. Puedes completar el pedido como invitado o crear una cuenta de demostración.",
                ],
                [
                  "¿Cómo funciona el pago?",
                  "Todo el proceso es simulado. Nunca se realiza un cargo ni debes introducir datos bancarios reales.",
                ],
                [
                  "¿Cómo funciona el envío?",
                  "El envío estándar es gratuito desde 80 €. También puedes elegir una entrega exprés simulada.",
                ],
              ].map((f) => (
                <details key={f[0]}>
                  <summary>
                    {f[0]}
                    <ChevronDown />
                  </summary>
                  <p>{f[1]}</p>
                </details>
              ))}
            </div>
          </section>
          <section className="newsletter">
            <div>
              <p className="eyebrow">CÍRCULO SENSORIA</p>
              <h2>Una pausa útil en tu bandeja de entrada.</h2>
              <p>
                Rituales breves, novedades y guías para ambientes más amables.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("Suscripción de demostración completada");
              }}
            >
              <input type="email" required placeholder="tu@email.com" />
              <button>
                Quiero recibirlo <ArrowRight />
              </button>
            </form>
          </section>
        </main>
      )}
      {view === "dashboard" && (
        <Dashboard
          products={products}
          orders={orders}
          events={events}
          onRestock={(id) =>
            setProducts((rows) =>
              rows.map((p) =>
                p.id === id ? { ...p, stock: p.stock + 10 } : p,
              ),
            )
          }
        />
      )}
      {view === "orders" && (
        <BackofficeOrders
          orders={orders}
          onUpdate={updateStatus}
          onShop={() => setView("shop")}
        />
      )}
      {view === "events" && (
        <BackofficeEvents events={events} onShop={() => setView("shop")} />
      )}
      {view === "management" && (
        <AdminHub orders={orders} events={events} onProductsChanged={setProducts} />
      )}
      {view === "accountOrders" && customer && (
        <CustomerOrders email={customer.email} onShop={() => setView("shop")} />
      )}
      {cartOpen && (
        <div
          className="overlay"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setCartOpen(false)
          }
        >
          <aside className="cart-panel">
            <div className="panel-head">
              <div>
                <span>
                  {checkout ? `Paso ${checkoutStep} de 4` : "Tu selección"}
                </span>
                <h2>
                  {checkout ? (
                    "Finalizar pedido"
                  ) : (
                    <>
                      Carrito <b>{cartCount}</b>
                    </>
                  )}
                </h2>
              </div>
              <button onClick={() => setCartOpen(false)}>
                <X />
              </button>
            </div>
            {success ? (
              <SuccessState
                success={success}
                onContinue={() => {
                  setSuccess(null);
                  setCartOpen(false);
                }}
              />
            ) : checkout ? (
              <CheckoutFlow
                step={checkoutStep}
                setStep={setCheckoutStep}
                data={checkoutData}
                setData={setCheckoutData}
                subtotal={subtotal}
                discount={discount}
                shipping={shipping}
                tax={tax}
                total={total}
                loading={loading}
                onBack={() => setCheckout(false)}
                onPay={placeOrder}
                validate={validateStep}
              />
            ) : (
              <>
                <div className="cart-content">
                  {cartLines.length === 0 ? (
                    <Empty
                      icon={<ShoppingBag />}
                      title="Tu carrito está vacío"
                      text="Añade productos para construir tu ritual sensorial."
                      action={() => setCartOpen(false)}
                    />
                  ) : (
                    cartLines.map(({ product, quantity }) => (
                      <div className="cart-line" key={product.id}>
                        <img
                          src={product.imageUrl || productImages[product.sku]}
                          alt={product.name}
                        />
                        <div>
                          <h3>{product.name}</h3>
                          <p>{euro.format(product.price)}</p>
                          <div className="quantity">
                            <button onClick={() => changeQty(product, -1)}>
                              <Minus />
                            </button>
                            <span>{quantity}</span>
                            <button onClick={() => changeQty(product, 1)}>
                              <Plus />
                            </button>
                          </div>
                        </div>
                        <button
                          className="trash"
                          onClick={() => changeQty(product, -quantity)}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {cartLines.length > 0 && (
                  <div className="cart-summary">
                    <label className="coupon">
                      <input
                        value={coupon}
                        onChange={(e) => { setCoupon(e.target.value); setCouponPercent(0); }}
                        placeholder="Código promocional"
                      />
                      <button
                        onClick={validateCoupon}
                      >
                        Aplicar
                      </button>
                    </label>
                    <Summary
                      subtotal={subtotal}
                      discount={discount}
                      shipping={shipping}
                      tax={tax}
                      total={total}
                    />
                    <button className="primary" onClick={startCheckout}>
                      Continuar al pago <ArrowRight />
                    </button>
                    <small>
                      <LockKeyhole /> Pago 100 % simulado y seguro
                    </small>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      )}
      <button
        className="chat-launcher"
        onClick={() => setChatOpen((v) => !v)}
        aria-label="Abrir asistente"
      >
        <MessageCircle />
      </button>
      {chatOpen && (
        <aside className="chat-widget">
          <div className="chat-head">
            <span>
              <Bot /> Aura · Asistente
            </span>
            <button onClick={() => setChatOpen(false)}>
              <X />
            </button>
          </div>
          <div className="chat-messages">
            {chatMessages.map((m, i) => (
              <p key={i} className={m.from}>
                {m.text}
              </p>
            ))}
          </div>
          <div className="chat-input">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Escribe tu pregunta"
            />
            <button onClick={sendChat}>
              <Send />
            </button>
          </div>
        </aside>
      )}
      {cookieVisible && (
        <div className="cookie-banner">
          <Cookie />
          <div>
            <b>Preferencias de cookies</b>
            <p>
              Usamos almacenamiento local para recordar el carrito, favoritos y
              preferencias de esta demostración.
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("sensoria-cookies", "accepted");
              setCookieVisible(false);
            }}
          >
            Aceptar
          </button>
          <button
            className="cookie-secondary"
            onClick={() => setCookieVisible(false)}
          >
            Solo necesarias
          </button>
        </div>
      )}
      <footer>
        <div>
          <div className="brand">
            <span className="brand-mark">
              <Waves />
            </span>
            <span>Sensoria</span>
          </div>
          <p>Instrumentos de bienestar sensorial para adultos.</p>
        </div>
        <div className="footer-links">
          <button onClick={() => setView("shop")}>Tienda</button>
          <button onClick={() => setAccountOpen(true)}>Mi cuenta</button>
          <button onClick={() => loadBackoffice("orders")}>Pedidos</button>
          {[
            "Privacidad",
            "Cookies",
            "Condiciones",
            "Envíos y devoluciones",
          ].map((page) => (
            <button
              key={page}
              onClick={() => {
                setLegalPage(page);
                setActiveTool("legal");
              }}
            >
              {page}
            </button>
          ))}
          <span>Proyecto académico · SIE</span>
        </div>
        <div className="footer-note">
          <ShieldCheck /> No se realizan compras ni pagos reales
        </div>
      </footer>
    </div>
  );
}

function ProductCard({
  product,
  favorite,
  compared,
  onFavorite,
  onCompare,
  onOpen,
  onAdd,
}: {
  product: Product;
  favorite: boolean;
  compared: boolean;
  onFavorite: () => void;
  onCompare: () => void;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const d = details[product.sku];
  return (
    <article className="product-card">
      <div className="product-photo-wrap">
        <button className="product-photo" onClick={onOpen}>
          <img src={product.imageUrl || productImages[product.sku]} alt={product.name} />
          {d?.badge && <span>{d.badge}</span>}
        </button>
        <button
          className={favorite ? "favorite-button active" : "favorite-button"}
          onClick={onFavorite}
        >
          <Heart fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="product-info">
        <div className="product-meta">
          <span>{product.category}</span>
          <span>Stock {product.stock}</span>
        </div>
        <h3>{product.name}</h3>
        <div className="rating">
          <Star fill="currentColor" />
          <b>{d?.rating}</b>
          <span>({d?.reviews})</span>
        </div>
        <p>{product.description}</p>
        <div className="card-links">
          <button className="details-link" onClick={onOpen}>
            Ver ficha <ArrowRight />
          </button>
          <button
            className={compared ? "compare-link active" : "compare-link"}
            onClick={onCompare}
          >
            <Scale /> {compared ? "Seleccionado" : "Comparar"}
          </button>
        </div>
        <div className="product-buy">
          <strong>{euro.format(product.price)}</strong>
          <button onClick={onAdd}>
            <Plus /> Añadir
          </button>
        </div>
      </div>
    </article>
  );
}
function ProductDetailModal({
  product,
  favorite,
  onFavorite,
  onClose,
  onAdd,
}: {
  product: Product;
  favorite: boolean;
  onFavorite: () => void;
  onClose: () => void;
  onAdd: () => void;
}) {
  const d = details[product.sku];
  return (
    <div
      className="overlay product-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <article className="product-detail">
        <button className="detail-close" onClick={onClose}>
          <X />
        </button>
        <div className="detail-image">
          <img src={product.imageUrl || productImages[product.sku]} alt={product.name} />
          {d.badge && <span>{d.badge}</span>}
        </div>
        <div className="detail-copy">
          <small>
            {product.sku} · {product.stock} unidades disponibles
          </small>
          <h2>{product.name}</h2>
          <div className="rating large">
            <Star fill="currentColor" />
            <b>{d.rating}</b>
            <span>{d.reviews} valoraciones</span>
          </div>
          <p className="detail-lead">{d.long}</p>
          <h3>Cómo utilizarlo</h3>
          <p>{d.use}</p>
          <h3>Características</h3>
          <ul>
            {d.features.map((x) => (
              <li key={x}>
                <Check />
                {x}
              </li>
            ))}
          </ul>
          <div className="detail-assurances">
            <span>
              <Truck /> Envío 48–72 h
            </span>
            <span>
              <ShieldCheck /> 30 días simulados
            </span>
          </div>
          <div className="detail-buy">
            <strong>{euro.format(product.price)}</strong>
            <div>
              <button
                className={favorite ? "detail-heart active" : "detail-heart"}
                onClick={onFavorite}
              >
                <Heart fill={favorite ? "currentColor" : "none"} />
              </button>
              <button onClick={onAdd}>
                <ShoppingBag /> Añadir al carrito
              </button>
            </div>
          </div>
          <p className="detail-note">
            <ShieldCheck /> Pago simulado en este prototipo académico.
          </p>
        </div>
      </article>
    </div>
  );
}
function AccountPanel({
  customer,
  mode,
  setMode,
  form,
  setForm,
  favorites,
  onSubmit,
  onSignOut,
  onClose,
  onShopFavorites,
  onOrders,
}: {
  customer: Customer | null;
  mode: "login" | "register";
  setMode: (m: "login" | "register") => void;
  form: { name: string; email: string; password: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ name: string; email: string; password: string }>
  >;
  favorites: number;
  onSubmit: (e: React.FormEvent) => void;
  onSignOut: () => void;
  onClose: () => void;
  onShopFavorites: () => void;
  onOrders: () => void;
}) {
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside className="account-panel">
        <div className="panel-head">
          <div>
            <span>Espacio personal</span>
            <h2>Mi cuenta</h2>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        {customer ? (
          <div className="account-home">
            <div className="account-avatar">
              {customer.name.slice(0, 1).toUpperCase()}
            </div>
            <p>Hola,</p>
            <h3>{customer.name}</h3>
            <span>{customer.email}</span>
            <div className="account-stats">
              <button onClick={onShopFavorites}>
                <Heart />
                <b>{favorites}</b>
                <span>Favoritos</span>
              </button>
              <button onClick={onOrders}>
                <PackageCheck />
                <b>Ver</b>
                <span>Pedidos demo</span>
              </button>
            </div>
            <div className="account-list">
              <button onClick={onShopFavorites}>
                <Heart /> Ver favoritos <ArrowRight />
              </button>
              <button onClick={onOrders}>
                <PackageCheck /> Mis pedidos <ArrowRight />
              </button>
              <button
                onClick={() => toast.info("No hay direcciones guardadas")}
              >
                <MapPin /> Mis direcciones <ArrowRight />
              </button>
              <button
                onClick={() => toast.info("Preferencias de demostración")}
              >
                <SlidersHorizontal /> Preferencias sensoriales <ArrowRight />
              </button>
            </div>
            <button className="logout" onClick={onSignOut}>
              <LogOut /> Cerrar sesión
            </button>
            <p className="demo-note">
              <ShieldCheck /> Cuenta local de demostración. No guardamos la
              contraseña.
            </p>
          </div>
        ) : (
          <div className="auth-content">
            <div className="auth-tabs">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
              >
                Iniciar sesión
              </button>
              <button
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
              >
                Crear cuenta
              </button>
            </div>
            <h3>
              {mode === "register"
                ? "Crea tu espacio Sensoria"
                : "Qué bien volver a verte"}
            </h3>
            <p>
              {mode === "register"
                ? "Guarda favoritos y completa el pedido más rápido."
                : "Accede a tu cuenta de demostración."}
            </p>
            <form onSubmit={onSubmit}>
              {mode === "register" && (
                <label>
                  Nombre completo
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </label>
              )}
              <label>
                Correo electrónico
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </label>
              <label>
                Contraseña de prueba
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Mínimo 4 caracteres"
                />
              </label>
              <button className="primary">
                {mode === "register" ? "Crear cuenta" : "Entrar"} <ArrowRight />
              </button>
            </form>
            <p className="demo-note">
              <ShieldCheck /> No uses una contraseña real. Este acceso solo
              funciona como demostración académica.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
function CheckoutFlow({
  step,
  setStep,
  data,
  setData,
  subtotal,
  discount,
  shipping,
  tax,
  total,
  loading,
  onBack,
  onPay,
  validate,
}: {
  step: number;
  setStep: (n: number) => void;
  data: CheckoutData;
  setData: React.Dispatch<React.SetStateAction<CheckoutData>>;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  loading: boolean;
  onBack: () => void;
  onPay: () => void;
  validate: () => boolean;
}) {
  const u = (k: keyof CheckoutData, v: string) =>
      setData((d) => ({ ...d, [k]: v })),
    next = () => {
      if (validate()) setStep(Math.min(step + 1, 4));
    };
  return (
    <div className="checkout">
      <button
        className="back-link"
        onClick={step === 1 ? onBack : () => setStep(step - 1)}
      >
        <ArrowLeft /> {step === 1 ? "Volver al carrito" : "Paso anterior"}
      </button>
      <div className="checkout-progress">
        {[1, 2, 3, 4].map((n, i) => (
          <div key={n} className={step >= n ? "active" : ""}>
            <span>{step > n ? <Check /> : n}</span>
            <b>{["Datos", "Entrega", "Pago", "Revisar"][i]}</b>
          </div>
        ))}
      </div>
      {step === 1 && (
        <section className="checkout-step">
          <h3>Datos de contacto</h3>
          <p>Recibirás aquí la confirmación simulada.</p>
          <div className="form-grid">
            <label className="wide">
              Nombre y apellidos
              <input
                value={data.name}
                onChange={(e) => u("name", e.target.value)}
                placeholder="María García"
              />
            </label>
            <label className="wide">
              Correo electrónico
              <input
                type="email"
                value={data.email}
                onChange={(e) => u("email", e.target.value)}
                placeholder="maria@email.com"
              />
            </label>
            <label className="wide">
              Teléfono
              <input
                value={data.phone}
                onChange={(e) => u("phone", e.target.value)}
                placeholder="600 000 000"
              />
            </label>
          </div>
        </section>
      )}
      {step === 2 && (
        <section className="checkout-step">
          <h3>Dirección de entrega</h3>
          <p>Introduce una dirección ficticia para la demostración.</p>
          <div className="form-grid">
            <label className="wide">
              Dirección
              <input
                value={data.address}
                onChange={(e) => u("address", e.target.value)}
                placeholder="Calle Ejemplo, 24, 2º B"
              />
            </label>
            <label>
              Ciudad
              <input
                value={data.city}
                onChange={(e) => u("city", e.target.value)}
                placeholder="Madrid"
              />
            </label>
            <label>
              Código postal
              <input
                value={data.postal}
                onChange={(e) => u("postal", e.target.value)}
                maxLength={5}
              />
            </label>
            <label className="wide">
              Notas
              <textarea
                value={data.notes}
                onChange={(e) => u("notes", e.target.value)}
              />
            </label>
          </div>
          <div className="shipping-options">
            <button
              className={data.shipping === "standard" ? "selected" : ""}
              onClick={() => u("shipping", "standard")}
            >
              <span>
                <Truck />
                <b>Estándar</b>
                <small>48–72 h simuladas</small>
              </span>
              <strong>{subtotal >= 80 ? "Gratis" : "4,95 €"}</strong>
            </button>
            <button
              className={data.shipping === "express" ? "selected" : ""}
              onClick={() => u("shipping", "express")}
            >
              <span>
                <PackageCheck />
                <b>Exprés</b>
                <small>24 h simuladas</small>
              </span>
              <strong>8,95 €</strong>
            </button>
          </div>
        </section>
      )}
      {step === 3 && (
        <section className="checkout-step">
          <h3>Método de pago</h3>
          <div className="payment-tabs">
            <button
              className={data.payment === "card" ? "selected" : ""}
              onClick={() => u("payment", "card")}
            >
              <CreditCard /> Tarjeta de prueba
            </button>
            <button
              className={data.payment === "paypal" ? "selected" : ""}
              onClick={() => u("payment", "paypal")}
            >
              <b>Pay</b> PayPal simulado
            </button>
          </div>
          {data.payment === "card" ? (
            <div className="form-grid">
              <label className="wide">
                Titular
                <input
                  value={data.cardName}
                  onChange={(e) => u("cardName", e.target.value)}
                />
              </label>
              <label className="wide">
                Número
                <input
                  value={data.cardNumber}
                  onChange={(e) => u("cardNumber", e.target.value)}
                />
              </label>
              <label>
                Caducidad
                <input
                  value={data.expiry}
                  onChange={(e) => u("expiry", e.target.value)}
                />
              </label>
              <label>
                CVV
                <input
                  value={data.cvv}
                  onChange={(e) => u("cvv", e.target.value)}
                  maxLength={3}
                />
              </label>
            </div>
          ) : (
            <div className="paypal-demo">
              <b>PayPal simulado</b>
              <p>No se abrirá ninguna pasarela ni se realizará un cargo.</p>
            </div>
          )}
          <div className="security-box">
            <LockKeyhole />
            <div>
              <b>Entorno de demostración</b>
              <p>
                No introduzcas datos bancarios reales. Estos valores no se
                almacenan.
              </p>
            </div>
          </div>
        </section>
      )}
      {step === 4 && (
        <section className="checkout-step">
          <h3>Revisa tu pedido</h3>
          {[
            ["Contacto", data.name, `${data.email} · ${data.phone}`, 1],
            [
              "Entrega",
              data.address,
              `${data.postal} ${data.city} · ${data.shipping === "express" ? "Exprés" : "Estándar"}`,
              2,
            ],
            [
              "Pago",
              data.payment === "card"
                ? "Tarjeta de prueba terminada en 4242"
                : "PayPal simulado",
              "No se realizará ningún cargo real.",
              3,
            ],
          ].map((x) => (
            <div className="review-block" key={String(x[0])}>
              <span>{x[0]}</span>
              <b>{x[1]}</b>
              <p>{x[2]}</p>
              <button onClick={() => setStep(Number(x[3]))}>Editar</button>
            </div>
          ))}
          <Summary
            subtotal={subtotal}
            discount={discount}
            shipping={shipping}
            tax={tax}
            total={total}
          />
          <button
            className="primary pay-button"
            disabled={loading}
            onClick={onPay}
          >
            {loading
              ? "Generando pedido…"
              : `Confirmar pago simulado · ${euro.format(total)}`}{" "}
            <ArrowRight />
          </button>
          <p className="privacy-note">
            <ShieldCheck /> Se creará un pedido académico y un evento de pago
            simulado.
          </p>
        </section>
      )}
      {step < 4 && (
        <button className="primary next-step" onClick={next}>
          Continuar <ArrowRight />
        </button>
      )}
    </div>
  );
}
function ToolModal({
  type,
  onClose,
  products,
  compareIds,
  quizNeed,
  setQuizNeed,
  quizSpace,
  setQuizSpace,
  bundle,
  setBundle,
  onAddBundle,
  trackingCode,
  setTrackingCode,
  legalPage,
  onSupport,
}: {
  type: "quiz" | "bundle" | "compare" | "tracking" | "support" | "legal";
  onClose: () => void;
  products: Product[];
  compareIds: number[];
  quizNeed: string;
  setQuizNeed: (v: string) => void;
  quizSpace: string;
  setQuizSpace: (v: string) => void;
  bundle: Record<string, number>;
  setBundle: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onAddBundle: () => void;
  trackingCode: string;
  setTrackingCode: (v: string) => void;
  legalPage: string;
  onSupport: () => void;
}) {
  const rec =
    quizNeed === "dormir"
      ? products.filter((p) =>
          ["PRD-013", "PRD-018", "PRD-012"].includes(p.sku),
        )
      : quizNeed === "foco"
        ? products.filter((p) =>
            ["PRD-017", "PRD-015", "PRD-004"].includes(p.sku),
          )
        : products.filter((p) =>
            ["PRD-001", "PRD-014", "PRD-007"].includes(p.sku),
          );
  const compared = products.filter((p) => compareIds.includes(p.id));
  const bundleProducts = Object.values(bundle)
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as Product[];
  const bundleTotal = bundleProducts.reduce((s, p) => s + p.price, 0) * 0.88;
  const legal: Record<string, string> = {
    Privacidad:
      "Solo se emplean datos ficticios para demostrar el flujo de compra. La cuenta, favoritos y carrito se guardan localmente en el dispositivo.",
    Cookies:
      "La demostración utiliza almacenamiento local para conservar el carrito, los favoritos y las preferencias del usuario. No utiliza cookies publicitarias.",
    Condiciones:
      "Todos los precios, pedidos, pagos, valoraciones y entregas son simulados. Esta web no formaliza contratos de compraventa.",
    "Envíos y devoluciones":
      "El envío estándar simulado tarda 48–72 horas. Las devoluciones académicas pueden solicitarse durante 30 días desde la entrega ficticia.",
  };
  return (
    <div
      className="overlay tool-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="tool-modal">
        <button className="tool-close" aria-label="Cerrar" onClick={onClose}>
          <X />
        </button>
        {type === "quiz" && (
          <>
            <p className="eyebrow">
              <Sparkles /> TEST SENSORIAL
            </p>
            <h2>Diseña tu ritual ideal</h2>
            <p className="tool-lead">
              Dos preguntas para recomendarte una combinación adaptada a tu
              momento.
            </p>
            <label className="tool-label">¿Qué necesitas principalmente?</label>
            <div className="choice-grid">
              {[
                ["dormir", "Dormir mejor"],
                ["foco", "Concentrarme"],
                ["relajar", "Bajar el ritmo"],
              ].map((x) => (
                <button
                  key={x[0]}
                  className={quizNeed === x[0] ? "selected" : ""}
                  onClick={() => setQuizNeed(x[0])}
                >
                  {x[1]}
                </button>
              ))}
            </div>
            <label className="tool-label">¿Dónde lo utilizarás?</label>
            <div className="choice-grid">
              {[
                ["dormitorio", "Dormitorio"],
                ["trabajo", "Trabajo"],
                ["salon", "Salón"],
              ].map((x) => (
                <button
                  key={x[0]}
                  className={quizSpace === x[0] ? "selected" : ""}
                  onClick={() => setQuizSpace(x[0])}
                >
                  {x[1]}
                </button>
              ))}
            </div>
            <div className="quiz-result">
              <b>Tu selección para {quizSpace}</b>
              <div>
                {rec.map((p) => (
                  <article key={p.id}>
                    <img src={p.imageUrl || productImages[p.sku]} alt={p.name} />
                    <span>
                      <b>{p.name}</b>
                      <small>{euro.format(p.price)}</small>
                    </span>
                  </article>
                ))}
              </div>
              <button
                onClick={() =>
                  toast.success("Ritual guardado en tus preferencias")
                }
              >
                Guardar recomendación
              </button>
            </div>
          </>
        )}
        {type === "bundle" && (
          <>
            <p className="eyebrow">
              <Boxes /> CREADOR DE PACKS
            </p>
            <h2>Tu ritual, sentido a sentido</h2>
            <p className="tool-lead">
              Elige una pieza de cada categoría. Aplicamos un 12 % de descuento
              simulado.
            </p>
            {["Visual", "Táctil", "Sonoro"].map((cat) => (
              <label className="bundle-select" key={cat}>
                <span>{cat}</span>
                <select
                  value={bundle[cat] ?? ""}
                  onChange={(e) =>
                    setBundle((b) => ({ ...b, [cat]: +e.target.value }))
                  }
                >
                  <option value="">Selecciona un producto</option>
                  {products
                    .filter((p) => p.category === cat)
                    .map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name} · {euro.format(p.price)}
                      </option>
                    ))}
                </select>
              </label>
            ))}
            <div className="bundle-total">
              <span>
                <small>Precio del pack</small>
                <b>{euro.format(bundleTotal)}</b>
              </span>
              <span>
                Ahorras{" "}
                {euro.format(
                  bundleProducts.reduce((s, p) => s + p.price, 0) - bundleTotal,
                )}
              </span>
            </div>
            <button className="primary" onClick={onAddBundle}>
              Añadir pack al carrito <ShoppingCart />
            </button>
          </>
        )}
        {type === "compare" && (
          <>
            <p className="eyebrow">
              <Scale /> COMPARADOR
            </p>
            <h2>Compara tus opciones</h2>
            <div className="compare-table">
              <div className="compare-row header">
                <span>Producto</span>
                {compared.map((p) => (
                  <b key={p.id}>{p.name}</b>
                ))}
              </div>
              {[
                ["Imagen", "image"],
                ["Categoría", "category"],
                ["Precio", "price"],
                ["Valoración", "rating"],
                ["Stock", "stock"],
                ["Uso recomendado", "use"],
              ].map((row) => (
                <div className="compare-row" key={row[0]}>
                  <span>{row[0]}</span>
                  {compared.map((p) => (
                    <div key={p.id}>
                      {row[1] === "image" ? (
                        <img src={p.imageUrl || productImages[p.sku]} alt={p.name} />
                      ) : row[1] === "price" ? (
                        euro.format(p.price)
                      ) : row[1] === "rating" ? (
                        `${details[p.sku].rating} / 5`
                      ) : row[1] === "use" ? (
                        details[p.sku].use
                      ) : (
                        p[row[1] as keyof Product]
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
        {type === "tracking" && (
          <>
            <p className="eyebrow">
              <Truck /> SEGUIMIENTO
            </p>
            <h2>¿Dónde está mi pedido?</h2>
            <label className="tracking-input">
              Número de pedido
              <input
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="SEN-20260921-ABC123"
              />
            </label>
            {trackingCode && (
              <div className="tracking-card">
                <b>{trackingCode.toUpperCase()}</b>
                <p>Entrega estimada simulada: 24 de septiembre</p>
                <div className="tracking-line">
                  {["Confirmado", "Preparando", "Enviado", "Entregado"].map(
                    (s, i) => (
                      <span className={i < 2 ? "done" : ""} key={s}>
                        <i>{i < 2 ? <Check /> : i + 1}</i>
                        <b>{s}</b>
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {type === "support" && (
          <>
            <p className="eyebrow">
              <RotateCcw /> SOPORTE
            </p>
            <h2>¿Cómo podemos ayudarte?</h2>
            <form
              className="support-form"
              onSubmit={(e) => {
                e.preventDefault();
                onSupport();
              }}
            >
              <label>
                Motivo
                <select required>
                  <option>Consulta sobre un producto</option>
                  <option>Solicitar devolución simulada</option>
                  <option>Incidencia con un pedido</option>
                  <option>Modificar dirección</option>
                </select>
              </label>
              <label>
                Número de pedido
                <input placeholder="Opcional" />
              </label>
              <label>
                Cuéntanos qué ocurre
                <textarea required placeholder="Describe tu consulta" />
              </label>
              <button className="primary">
                Enviar solicitud <Send />
              </button>
            </form>
            <p className="demo-note">
              <ShieldCheck /> El formulario genera una referencia académica; no
              envía datos a terceros.
            </p>
          </>
        )}
        {type === "legal" && (
          <>
            <p className="eyebrow">
              <FileText /> INFORMACIÓN LEGAL
            </p>
            <h2>{legalPage}</h2>
            <div className="legal-copy">
              <p>{legal[legalPage]}</p>
              <h3>Responsable del prototipo</h3>
              <p>
                Sensoria · Proyecto académico de Sistemas de Información
                Empresarial.
              </p>
              <h3>Uso de la información</h3>
              <p>
                No introduzcas información sensible o real. Ningún pago, envío,
                devolución o registro tiene efectos comerciales.
              </p>
              <h3>Contacto</h3>
              <p>Canal de soporte integrado en la propia demostración.</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ReviewsHub() {
  const [rating, setRating] = useState(5),
    [text, setText] = useState(""),
    [reviews, setReviews] = useState<
      { rating: number; text: string; name: string }[]
    >([
      {
        rating: 5,
        text: "Aura Wave ha cambiado por completo mi rincón de lectura. La luz es suave y no resulta infantil.",
        name: "Clara M.",
      },
      {
        rating: 5,
        text: "El proceso de compra es claro y la ficha explica exactamente cómo usar cada objeto.",
        name: "Daniel R.",
      },
    ]);
  return (
    <section className="reviews-section reviews-hub">
      <div>
        <p className="eyebrow">COMUNIDAD SENSORIA</p>
        <h2>La calma también se comparte.</h2>
        <div className="review-score">
          <strong>4,8</strong>
          <span>
            <span>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} fill="currentColor" />
              ))}
            </span>
            1.247 valoraciones de demostración
          </span>
        </div>
        <form
          className="review-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            setReviews((r) => [{ rating, text, name: "Usuario demo" }, ...r]);
            setText("");
            toast.success("Valoración publicada en la demostración");
          }}
        >
          <b>Escribe una valoración</b>
          <div>
            {[1, 2, 3, 4, 5].map((i) => (
              <button type="button" key={i} onClick={() => setRating(i)}>
                <Star fill={i <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Comparte tu experiencia de prueba"
          />
          <button>Publicar opinión</button>
        </form>
      </div>
      <div className="review-cards">
        {reviews.slice(0, 4).map((r, i) => (
          <article key={i}>
            <div>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} fill={s <= r.rating ? "currentColor" : "none"} />
              ))}
            </div>
            <p>“{r.text}”</p>
            <b>{r.name} · Compra simulada verificada</b>
          </article>
        ))}
      </div>
    </section>
  );
}

function Dashboard({
  products,
  orders,
  events,
  onRestock,
}: {
  products: Product[];
  orders: Order[];
  events: EventRow[];
  onRestock: (id: number) => void;
}) {
  const revenue = orders.reduce((s, o) => s + o.total, 0),
    ticket = orders.length ? revenue / orders.length : 0,
    low = products.filter((p) => p.stock < 18),
    views = Math.max(
      events.filter((e) => e.eventType === "product.viewed").length,
      36,
    ),
    adds = Math.max(
      events.filter((e) => e.eventType === "cart.item_added").length,
      14,
    ),
    conversion = Math.round((orders.length / Math.max(views, 1)) * 100);
  return (
    <main className="backoffice dashboard">
      <div className="backoffice-head">
        <div>
          <p className="eyebrow">CONTROL COMERCIAL</p>
          <h1>Panel de negocio</h1>
          <p>Ventas, conversión, inventario, CRM y automatizaciones.</p>
        </div>
        <div className="metric">
          <TrendingUp />
          <span>
            <b>{conversion}%</b> conversión simulada
          </span>
        </div>
      </div>
      <section className="kpi-grid">
        <article>
          <span>Ventas</span>
          <b>{euro.format(revenue)}</b>
          <small>Importe total registrado</small>
        </article>
        <article>
          <span>Ticket medio</span>
          <b>{euro.format(ticket)}</b>
          <small>Por pedido</small>
        </article>
        <article>
          <span>Pedidos</span>
          <b>{orders.length}</b>
          <small>
            {orders.filter((o) => o.status === "ENVIADO").length} enviados
          </small>
        </article>
        <article>
          <span>Carritos abandonados</span>
          <b>7</b>
          <small>Recuperables por campaña</small>
        </article>
      </section>
      <section className="dashboard-grid">
        <article className="dash-card funnel">
          <div className="dash-title">
            <h2>Embudo de conversión</h2>
            <span>Últimos 30 días</span>
          </div>
          {[
            ["Visitas al producto", views, 100],
            ["Añadidos al carrito", adds, 65],
            ["Checkout iniciado", Math.max(8, orders.length + 3), 42],
            ["Pedidos", orders.length, 26],
          ].map((x) => (
            <div className="funnel-row" key={String(x[0])}>
              <span>
                {x[0]} <b>{x[1]}</b>
              </span>
              <i>
                <em style={{ width: `${x[2]}%` }} />
              </i>
            </div>
          ))}
        </article>
        <article className="dash-card category-chart">
          <div className="dash-title">
            <h2>Ventas por categoría</h2>
            <span>Distribución estimada</span>
          </div>
          {[
            ["Visual", 46],
            ["Táctil", 31],
            ["Sonoro", 23],
          ].map((x) => (
            <div key={String(x[0])}>
              <span>{x[0]}</span>
              <i>
                <em style={{ width: `${x[1]}%` }} />
              </i>
              <b>{x[1]}%</b>
            </div>
          ))}
        </article>
      </section>
      <section className="dashboard-grid">
        <article className="dash-card inventory">
          <div className="dash-title">
            <h2>Control de inventario</h2>
            <span>{low.length} alertas de stock</span>
          </div>
          <div className="inventory-list">
            {products
              .slice()
              .sort((a, b) => a.stock - b.stock)
              .slice(0, 7)
              .map((p) => (
                <div key={p.id}>
                  <img src={p.imageUrl || productImages[p.sku]} alt="" />
                  <span>
                    <b>{p.name}</b>
                    <small>
                      {p.sku} · {p.category}
                    </small>
                  </span>
                  <strong className={p.stock < 18 ? "low" : ""}>
                    {p.stock} uds.
                  </strong>
                  <button
                    onClick={() => {
                      onRestock(p.id);
                      toast.success(`${p.name}: reposición simulada +10`);
                    }}
                  >
                    Reponer
                  </button>
                </div>
              ))}
          </div>
        </article>
        <article className="dash-card automations">
          <div className="dash-title">
            <h2>CRM y automatizaciones</h2>
            <span>4 flujos activos</span>
          </div>
          {[
            ["Carrito abandonado", "Email a las 2 horas", "Activo"],
            ["Bienvenida", "Al crear una cuenta", "Activo"],
            ["Postcompra", "Guía de uso +24 h", "Activo"],
            ["Stock bajo", "Aviso al responsable", "Activo"],
          ].map((x) => (
            <div key={x[0]}>
              <span>
                <b>{x[0]}</b>
                <small>{x[1]}</small>
              </span>
              <em>{x[2]}</em>
            </div>
          ))}
        </article>
      </section>
    </main>
  );
}

function BackofficeOrders({
  orders,
  onUpdate,
  onShop,
}: {
  orders: Order[];
  onUpdate: (id: number, s: string) => void;
  onShop: () => void;
}) {
  return (
    <main className="backoffice">
      <div className="backoffice-head">
        <div>
          <p className="eyebrow">ZONA INTERNA</p>
          <h1>Gestión de pedidos</h1>
          <p>Consulta el detalle y actualiza el estado operativo.</p>
        </div>
        <div className="metric">
          <ClipboardList />
          <span>
            <b>{orders.length}</b> pedidos
          </span>
        </div>
      </div>
      {orders.length === 0 ? (
        <Empty
          icon={<ClipboardList />}
          title="Aún no hay pedidos"
          text="Completa una compra de prueba para verla aquí."
          action={onShop}
        />
      ) : (
        <div className="order-list">
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <div className="order-main">
                <div>
                  <span className="order-number">{o.orderNumber}</span>
                  <h3>{o.customerAlias}</h3>
                  <p>{new Date(o.createdAt).toLocaleString("es-ES")}</p>
                  {o.customerEmail && (
                    <p className="order-email">
                      <Mail /> {o.customerEmail}
                    </p>
                  )}
                </div>
                <strong>{euro.format(o.total)}</strong>
              </div>
              <div className="order-items">
                {o.items.map((i) => (
                  <span key={i.id}>
                    {i.quantity}× {i.productName}
                  </span>
                ))}
              </div>
              <div className="order-actions">
                <span className={`status status-${o.status.toLowerCase()}`}>
                  {statusLabel[o.status] ?? o.status}
                </span>
                <select
                  value={o.status}
                  onChange={(e) => onUpdate(o.id, e.target.value)}
                >
                  {[
                    "CREADO",
                    "PAGO_SIMULADO",
                    "PREPARACIÓN",
                    "ENVIADO",
                    "ENTREGADO",
                    "CANCELADO",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              {!!o.notifications?.length && (
                <div className="notification-history">
                  <Mail />
                  <span>
                    Último aviso: {statusLabel[o.notifications.at(-1)!.template] ?? o.notifications.at(-1)!.template}
                    <small>
                      {o.notifications.at(-1)!.deliveryStatus === "SENT"
                        ? "Correo enviado"
                        : "Simulación registrada"}
                    </small>
                  </span>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
function BackofficeEvents({
  events,
  onShop,
}: {
  events: EventRow[];
  onShop: () => void;
}) {
  return (
    <main className="backoffice">
      <div className="backoffice-head">
        <div>
          <p className="eyebrow">TRAZABILIDAD</p>
          <h1>Eventos del canal</h1>
          <p>Actividad generada por las interacciones de la tienda.</p>
        </div>
        <div className="metric">
          <BarChart3 />
          <span>
            <b>{events.length}</b> eventos
          </span>
        </div>
      </div>
      {events.length === 0 ? (
        <Empty
          icon={<BarChart3 />}
          title="Sin eventos todavía"
          text="Explora productos o completa un pedido."
          action={onShop}
        />
      ) : (
        <div className="event-table">
          <div className="event-row event-header">
            <span>Evento</span>
            <span>Sesión</span>
            <span>Datos</span>
            <span>Fecha</span>
          </div>
          {events.map((e) => (
            <div className="event-row" key={e.id}>
              <span>
                <i />
                {e.eventType}
              </span>
              <code>{e.sessionId}</code>
              <code>{e.payload}</code>
              <time>{new Date(e.createdAt).toLocaleString("es-ES")}</time>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
function Summary({
  subtotal,
  discount,
  shipping,
  tax,
  total,
}: {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}) {
  return (
    <div className="summary-lines">
      <p>
        <span>Subtotal</span>
        <b>{euro.format(subtotal)}</b>
      </p>
      {discount > 0 && (
        <p className="discount">
          <span>Descuento promocional</span>
          <b>−{euro.format(discount)}</b>
        </p>
      )}
      <p>
        <span>Envío</span>
        <b>{shipping ? euro.format(shipping) : "Gratis"}</b>
      </p>
      <p>
        <span>IVA (21 %)</span>
        <b>{euro.format(tax)}</b>
      </p>
      <p className="total">
        <span>Total</span>
        <b>{euro.format(total)}</b>
      </p>
    </div>
  );
}
function SuccessState({
  success,
  onContinue,
}: {
  success: PurchaseSuccess;
  onContinue: () => void;
}) {
  const createPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const navy = [16, 42, 60] as const;
    const blue = [49, 95, 120] as const;
    const amber = [255, 195, 107] as const;
    const soft = [238, 243, 245] as const;
    const money = (value: number) => `${value.toFixed(2).replace(".", ",")} EUR`;

    doc.setFillColor(...navy);
    doc.rect(0, 0, 210, 52, "F");
    doc.setFillColor(...amber);
    doc.roundedRect(16, 14, 13, 13, 3, 3, "F");
    doc.setTextColor(16, 42, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("S", 22.5, 23, { align: "center" });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("SENSORIA", 35, 23);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(190, 208, 219);
    doc.text("INSTRUMENTOS DE BIENESTAR SENSORIAL", 35, 30);
    doc.setTextColor(...amber);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("FACTURA ACADEMICA", 194, 20, { align: "right" });
    doc.setTextColor(220, 231, 237);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(success.orderNumber, 194, 27, { align: "right" });
    doc.text(new Date(success.date).toLocaleDateString("es-ES"), 194, 33, {
      align: "right",
    });

    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DATOS DEL CLIENTE", 16, 67);
    doc.text("RESUMEN DEL PEDIDO", 112, 67);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(75, 96, 110);
    doc.text(success.name, 16, 75);
    doc.text(success.email, 16, 81);
    doc.text(success.address, 16, 87);
    doc.text(`${success.postal} ${success.city}`, 16, 93);
    doc.text("Estado", 112, 75);
    doc.text("Pago simulado aceptado", 194, 75, { align: "right" });
    doc.text("Entrega", 112, 82);
    doc.text(success.shipping ? "Envio seleccionado" : "Envio gratuito", 194, 82, {
      align: "right",
    });

    let y = 108;
    doc.setFillColor(...blue);
    doc.roundedRect(16, y - 7, 178, 11, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("PRODUCTO", 20, y);
    doc.text("UDS.", 139, y, { align: "center" });
    doc.text("PRECIO", 163, y, { align: "right" });
    doc.text("IMPORTE", 190, y, { align: "right" });
    y += 11;
    success.items.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(...soft);
        doc.rect(16, y - 6, 178, 10, "F");
      }
      doc.setTextColor(35, 55, 70);
      doc.setFont("helvetica", "normal");
      doc.text(item.name, 20, y);
      doc.text(String(item.quantity), 139, y, { align: "center" });
      doc.text(money(item.unitPrice), 163, y, { align: "right" });
      doc.text(money(item.unitPrice * item.quantity), 190, y, {
        align: "right",
      });
      y += 10;
    });

    y += 8;
    const totals = [
      ["Subtotal", success.subtotal],
      ["Descuento", -success.discount],
      ["Envio", success.shipping],
      ["IVA (21 %)", success.tax],
    ] as const;
    totals.forEach(([label, value]) => {
      doc.setTextColor(87, 106, 118);
      doc.text(label, 145, y, { align: "right" });
      doc.setTextColor(...navy);
      doc.text(money(value), 190, y, { align: "right" });
      y += 7;
    });
    doc.setFillColor(...amber);
    doc.roundedRect(112, y, 82, 17, 3, 3, "F");
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL", 120, y + 10.5);
    doc.setFontSize(14);
    doc.text(money(success.total), 190, y + 10.5, { align: "right" });

    doc.setFillColor(...soft);
    doc.roundedRect(16, 250, 178, 23, 3, 3, "F");
    doc.setTextColor(...blue);
    doc.setFontSize(9);
    doc.text("Gracias por crear tu ritual con Sensoria.", 22, 260);
    doc.setTextColor(95, 113, 124);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      "Documento academico de demostracion. No constituye una factura fiscal ni acredita una compra real.",
      22,
      267,
    );
    doc.save(`Factura-${success.orderNumber}.pdf`);
    toast.success("Factura PDF descargada");
  };
  return (
    <div className="success-state">
      <span>
        <Check />
      </span>
      <h3>Pedido confirmado</h3>
      <p>El pago se ha simulado correctamente.</p>
      <div>
        <small>Número de pedido</small>
        <strong>{success.orderNumber}</strong>
      </div>
      <b>{euro.format(success.total)}</b>
      <div className="success-timeline">
        <span>
          <Check /> Pedido creado
        </span>
        <span>
          <CreditCard /> Pago de prueba aceptado
        </span>
        <span>
          <Mail />
          {success.emailStatus === "sent"
            ? ` Confirmación enviada a ${success.email}`
            : " Confirmación preparada en modo académico"}
        </span>
      </div>
      {success.emailStatus !== "sent" && (
        <p className="email-mode-note">
          Este aviso se guarda dentro del prototipo, pero no se envía a un
          correo externo hasta conectar un proveedor de email.
        </p>
      )}
      <button
        className="invoice-download"
        onClick={createPdf}
      >
        <FileText /> Descargar factura PDF
      </button>
      <button className="primary" onClick={onContinue}>
        Seguir comprando
      </button>
    </div>
  );
}
function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: () => void;
}) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <button onClick={action}>Continuar</button>
    </div>
  );
}
