import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

// Lazy getter for the GoogleGenAI SDK to prevent module-load crashes if API key is not configured/empty
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Gemini SDK] GEMINI_API_KEY environment variable is not defined.");
    return null;
  }
  if (!aiInstance) {
    try {
      aiInstance = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (e) {
      console.error("[Gemini SDK] Failed to initialize GoogleGenAI client:", e);
      return null;
    }
  }
  return aiInstance;
}

// Tracks if a given model is currently reported as overloaded.
// If a model is overloaded, we will prefer other stable models temporarily for 3 minutes.
const modelOverloadRegistry: Record<string, number> = {};

function markModelOverloaded(modelName: string) {
  // Mark as overloaded for 3 minutes (180,000 ms)
  modelOverloadRegistry[modelName] = Date.now() + 180000;
  console.log(`[Gemini SDK] Model '${modelName}' marked as overloaded. Will skip/deprioritize for 3 minutes.`);
}

function isModelOverloaded(modelName: string): boolean {
  const expiry = modelOverloadRegistry[modelName];
  if (!expiry) return false;
  if (Date.now() > expiry) {
    delete modelOverloadRegistry[modelName];
    return false;
  }
  return true;
}

// Resilient wrapper with automatic retry and model fallback for transient high-demand API issues (like 503 UNAVAILABLE)
async function generateContentWithRetry(ai: GoogleGenAI, params: any, retries = 3, delayMs = 500): Promise<any> {
  const requestedModel = params.model || "gemini-3.5-flash";
  const defaultList = [
    requestedModel,
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];
  
  // Filter out duplicates
  const uniqueModels = Array.from(new Set(defaultList));
  
  // Sort models dynamically so non-overloaded models have higher precedence
  const modelsToTry = uniqueModels.sort((a, b) => {
    const aOverloaded = isModelOverloaded(a) ? 1 : 0;
    const bOverloaded = isModelOverloaded(b) ? 1 : 0;
    return aOverloaded - bOverloaded;
  });

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    // If the model is marked overloaded and we have other options left, skip it to save latency
    if (isModelOverloaded(modelName) && modelName !== modelsToTry[modelsToTry.length - 1]) {
      console.log(`[Gemini SDK] Skipping overloaded/exhausted model '${modelName}'...`);
      continue;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[Gemini SDK] Attempting to call ${modelName} (attempt ${attempt}/${retries})...`);
        const result = await ai.models.generateContent({
          ...params,
          model: modelName
        });
        return result;
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const status = err?.status;
        console.warn(`[Gemini SDK] Failed calling ${modelName} on attempt ${attempt}:`, msg);

        // Treat 503, 429 and any message mentioning demand, quota, unavailable or status 503/429 as transient
        const isTemporary = 
          status === 503 || 
          status === 429 || 
          msg.includes("503") || 
          msg.includes("429") || 
          msg.includes("UNAVAILABLE") || 
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.includes("high demand") ||
          msg.includes("quota") ||
          msg.includes("rate limit") ||
          msg.includes("temporary") ||
          msg.includes("experiencing high demand");

        if (isTemporary) {
          // If a model is experiencing high demand / 503 / 429, also mark it as overloaded to protect future queries
          markModelOverloaded(modelName);
        }

        if (!isTemporary) {
          // Non-transient error, break the retry for this model and let it proceed to fallback model or throw
          break;
        }

        if (attempt < retries) {
          console.log(`[Gemini SDK] Transient error detected. Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
  }

  throw lastError;
}

const app = express();
export const viteNodeApp = app; // For Vercel/Vite plugins if needed

app.use(express.json());

// Robust RegExp scraper helpers (prevents massive memory usage or binary require failures of JSDOM on Vercel Node runtime)
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match && match[1] ? match[1].trim() : '';
}

function extractMetaTag(html: string, nameOrProperty: string): string {
  const patterns = [
    new RegExp(`<meta[^>]*?(?:property|name)=["']${nameOrProperty}["'][^>]*?content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${nameOrProperty}["']`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .trim();
    }
  }
  return '';
}

function stripHtmlTags(html: string): string {
  let text = html.replace(/<(script|style|noscript|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

// Helper to gracefully extract/guess a product name from URL structure
function guessNameFromUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    const segments = url.pathname.split('/').filter(Boolean);
    
    // Find segments containing hyphens/underscores which typically represent the product slug
    const productSegment = segments.find(s => (s.includes('-') || s.includes('_')) && s.length > 8);
    if (productSegment) {
      // Decode URL parts, split by separator, clean and capitalize
      return decodeURIComponent(productSegment)
        .split(/[-_]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .substring(0, 80) // reasonable name length
        .trim();
    }
    
    // Fallback to last segment if any
    if (segments.length > 0) {
      const lastSeg = decodedSegment(segments[segments.length - 1]);
      if (lastSeg && lastSeg.length > 3) return lastSeg;
    }
  } catch (e) {
    console.error("Error guessing name from URL:", e);
  }
  return "Novo Produto Importado";
}

function decodedSegment(seg: string): string {
  try {
    return decodeURIComponent(seg).replace(/[^\w\s-]/gi, '').trim();
  } catch(e) {
    return seg;
  }
}

// API route to extract product info from URL
app.post("/api/extract-product", async (req, res) => {
  let { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: "Missing or invalid URL" });
  }

  // Auto-prepend protocol if missing for absolute link resilience
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    let html = "";
    let metaTitle = "";
    let metaDesc = "";
    let metaImage = "";
    let metaPrice = "";

    // 1. Fetch remote HTML content with resilient browser headers and timeouts
    try {
      const response = await fetch(url, {
        headers: { 
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        redirect: "follow",
        signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined // safe fallback if timeout method on AbortSignal isn't supported
      });
      
      if (response.ok) {
        html = await response.text();
      } else {
        console.warn(`[Scraper] Fetch returned status: ${response.status} for URL: ${url}`);
      }
    } catch (fetchErr) {
      console.error("[Scraper] Fetch failed or timed out:", fetchErr);
    }

    // 2. Parse HTML using robust RegExp helpers if content was successfully fetched
    if (html) {
      try {
        metaTitle = extractTitle(html);
        metaImage = extractMetaTag(html, "og:image");
        metaDesc = extractMetaTag(html, "description") || extractMetaTag(html, "og:description") || "";
        metaPrice = extractMetaTag(html, "product:price:amount") || extractMetaTag(html, "og:price:amount") || "";
      } catch (parseError) {
        console.error("[Scraper] HTML parsing failed:", parseError);
      }
    }

    // 3. Ask Gemini with robust search grounding to extract structured info
    const isGeminiMissing = !process.env.GEMINI_API_KEY;
    const ai = getGeminiClient();
    if (ai) {
      try {
        // Convert body to text, but truncate if too large
        const bodyText = html ? stripHtmlTags(html) : "";
        const textToAnalyze = bodyText.substring(0, 12000); // safe limit for token processing

        const prompt = `
          Below are details for a product from the following URL: ${url}

          Scraped Meta Tags:
          Title: ${metaTitle || "None"}
          Description: ${metaDesc || "None"}
          Image URL: ${metaImage || "None"}
          Price Metadata: ${metaPrice || "None"}

          Page Scraped Content:
          ${textToAnalyze || "None (The direct scrape request was blocked, returned nothing, or is rendered dynamically by Javascript)"}

          CRITICAL TASK:
          You must extract details for this product and return them as a valid, parsable JSON object.
          Since many websites block simple scrapers with anti-bot challenges (returning blank, 403, or dynamic JS), please DO the following:
          if the "Page Scraped Content" is blank, incomplete, or looks like a blocker/anti-bot message, use your built-in Google Search tool to search for this product URL: '${url}' to fetch the actual product name, description, typical price in USD, and high-quality image URL.

          Return EXACTLY a JSON object with this shape:
          {
            "name": "Exact Name of the Product",
            "description": "Short clean description of the product (approx. 2-3 sentences)",
            "priceUSD": 29.99, // Numeric value in USD. Parse correctly (e.g. $29.99 -> 29.99). If not found or if only BRL is known, convert approximately (e.g. BRL/5.2). If unknown, return 0.
            "imageUrl": "https://example.com/image.jpg" // High resolution product image URL
          }

          IMPORTANT constraints:
          - Return ONLY the raw JSON object.
          - DO NOT wrap the output in any Markdown markdown formatting blocks (like \`\`\`json).
          - Do not add conversational text. Return just the raw JSON.
        `;

        const aiResponse = await generateContentWithRetry(ai, {
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }] // Dynamic Google Search grounding enabled!
          }
        });

        let textResult = aiResponse.text || "{}";
        textResult = textResult.replace(/^```json/g, "").replace(/```$/g, "").trim();
        const extractedInfo = JSON.parse(textResult);

        if (extractedInfo && typeof extractedInfo === 'object') {
          return res.json({
            name: extractedInfo.name || metaTitle || guessNameFromUrl(url),
            description: extractedInfo.description || metaDesc || "Detalhes importados via URL do produto.",
            priceUSD: Number(extractedInfo.priceUSD) || parseFloat(metaPrice) || 0,
            imageUrl: extractedInfo.imageUrl || metaImage || "",
            isGeminiMissing: false
          });
        }
      } catch (geminiError) {
        console.error("[Scraper] Gemini search-grounded extraction failed, falling back to scraped metadata:", geminiError);
      }
    }

    // 4. Resilient fallback: Return parsed metadata or URL segment guesses on any failure
    const guessedName = metaTitle || guessNameFromUrl(url);
    return res.json({
      name: guessedName.length > 100 ? guessedName.substring(0, 100) + "..." : guessedName,
      description: metaDesc || "Inserido via link de importação de produtos.",
      priceUSD: parseFloat(metaPrice) || 0,
      imageUrl: metaImage || "",
      isGeminiMissing
    });
  } catch (globalErr: any) {
    console.error("[Scraper] Unhandled server error in extraction route:", globalErr);
    // Guarantees zero 500 error codes to frontend, falls back to guessed info happily
    const fallbackName = guessNameFromUrl(url);
    return res.json({
      name: fallbackName,
      description: "Inserido via link de importação de produtos.",
      priceUSD: 0,
      imageUrl: "",
      isGeminiMissing: !process.env.GEMINI_API_KEY
    });
  }
});

// Route to perform real internet product search using Gemini & Search Grounding
app.post("/api/search-internet", async (req, res) => {
  const { query: searchQuery } = req.body;
  if (!searchQuery || typeof searchQuery !== 'string') {
    return res.status(400).json({ error: "Query is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ 
      results: [], 
      isFallback: false, 
      errorReason: "KEY_MISSING" 
    });
  }

  try {
    const prompt = `Perform a real active internet search using Google Search to find the product: "${searchQuery}" on popular, official US e-commerce stores (such as Amazon, Walmart, Target, Best Buy, Sephora, Macy's, Nike, Nordstrom, etc.).
    Identify up to 4 real, currently available matching items listed online in US stores.
    
    You MUST return a valid, parsable JSON array of objects representing these matching items. 
    Each object in the array MUST have this exact shape:
    {
      "name": "Full real product name as found on the store",
      "description": "Short clean description of this product (about 1-2 sentences) in Portuguese.",
      "priceUSD": 29.99, // approximate price in USD as a number (must be a number, do not include symbols)
      "imageUrl": "https://images.unsplash.com/... or a real direct image found", // standard product image or Unsplash placeholder
      "storeName": "Store Name", // e.g. Amazon, Best Buy, Sephora, Nordstrom, Target, Walmart...
      "url": "https://www.store.com/item" // the actual web link/URL to this product page found in the search results
    }
    
    CRITICAL requirements:
    1. For the "url" field, you MUST extract the actual e-commerce product links from the Google search grounding results. Do NOT use fake domain links or "https://example.com" or "https://amazon.com/product" — the link must be real and correct.
    2. For "imageUrl", use a real image if available or a high-quality category specific Unsplash URL (e.g. for sneakers/shoes select elegant Unsplash shoe photos, for cosmetics/makeup select elegant cosmetic brush/lipstick Unsplash photos).
    
    Constraint: Your entire response must be a valid raw JSON array of up to 4 objects. Do not wrap in conversational text.`;

    const aiResponse = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Google Search Grounding!
        responseMimeType: "application/json" // Force JSON output compliance
      }
    });

    let textResult = aiResponse.text || "[]";
    
    // Log for server-side monitoring
    console.log("[Search Internet] Gemini returned text of length:", textResult.length);
    
    // Clean codeblock formatting if any
    textResult = textResult.replace(/^```json/gi, "")
                           .replace(/^```/g, "")
                           .replace(/```$/g, "")
                           .trim();
    
    // Extract everything inside [ ... ]
    const arrayMatch = textResult.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      textResult = arrayMatch[0];
    }

    const results = JSON.parse(textResult);

    if (Array.isArray(results) && results.length > 0) {
      // Validate and clean up each returned item to prevent any user-facing example.com links or bad images
      const validatedResults = results.map(item => {
        let name = (item.name || `${searchQuery} - Importação`).trim();
        let description = (item.description || "Disponível sob consulta para importação segura EUA-Brasil.").trim();
        let storeName = (item.storeName || "Importados EUA").trim();
        let priceUSD = Number(item.priceUSD) || 0.0;
        
        // Image validation & placeholder replacement based on product category
        let img = (item.imageUrl || "").trim();
        const nameLower = name.toLowerCase();
        if (!img || img.includes("example.com") || img.includes("placeholder") || img === "") {
          // Defaults to modern, elegant Unsplash item photos
          img = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"; // elegant standard backup
          if (nameLower.includes("creme") || nameLower.includes("skin") || nameLower.includes("cream") || nameLower.includes("beauty") || nameLower.includes("shampoo") || nameLower.includes("makeup") || nameLower.includes("perfume") || nameLower.includes("lipstick") || nameLower.includes("gloss") || nameLower.includes("base")) {
            img = "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500";
          } else if (nameLower.includes("iphone") || nameLower.includes("phone") || nameLower.includes("headphone") || nameLower.includes("pro") || nameLower.includes("watch") || nameLower.includes("ipad") || nameLower.includes("tablet") || nameLower.includes("earbuds") || nameLower.includes("fones") || nameLower.includes("charger") || nameLower.includes("computador") || nameLower.includes("notebook")) {
            img = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500";
          } else if (nameLower.includes("tênis") || nameLower.includes("sapato") || nameLower.includes("shoe") || nameLower.includes("bag") || nameLower.includes("mala") || nameLower.includes("roupa") || nameLower.includes("shirt") || nameLower.includes("camisa") || nameLower.includes("casaco") || nameLower.includes("hoodie") || nameLower.includes("moletom")) {
            img = "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500";
          }
        }

        // URL validation to prevent nonexistent domain urls like example.com
        let url = (item.url || "").trim();
        if (!url || url.includes("example.com") || url === "" || url.startsWith("/")) {
          const lowerStore = storeName.toLowerCase();
          const storeHost = lowerStore.includes("walmart") ? "walmart.com" :
                            lowerStore.includes("best buy") ? "bestbuy.com" :
                            lowerStore.includes("target") ? "target.com" :
                            lowerStore.includes("sephora") ? "sephora.com" : "amazon.com";
          url = `https://www.google.com/search?q=site:${storeHost}+${encodeURIComponent(name)}`;
        }

        return {
          name, 
          description,
          priceUSD,
          imageUrl: img,
          storeName,
          url
        };
      });

      return res.json({ results: validatedResults, isFallback: false });
    } else {
      throw new Error("Parsed results was not an array or has length of 0");
    }

  } catch (error: any) {
    console.error("[Search Internet] Error searching internet with Gemini:", error);
    // Determine the error message/status
    const isQuotaError = error?.message?.includes("quota") || error?.message?.includes("429") || (error?.status === 429);
    res.status(isQuotaError ? 429 : 500).json({ 
      results: [], 
      isFallback: false, 
      errorReason: isQuotaError ? "QUOTA_LIMIT" : "GENERAL_ERROR" 
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, orders, products, protocol, customerName } = req.body;
    
    const ordersInfo = orders && orders.length > 0 
      ? `\n\nPedidos do cliente:\n${JSON.stringify(orders.map((o: any) => ({
          id: o.id,
          status: o.status,
          trackingId: o.trackingId || "Sem código de rastreio cadastrado no momento",
          items: o.items.map((i: any) => ({
            name: i.product?.name,
            quantity: i.quantity,
            variant: i.variantName || "Nenhuma especificada",
            priceBRL: i.priceBRL,
            priceUSD: i.priceUSD
          })),
          shippingMethod: o.shippingMethod ? {
            name: o.shippingMethod.name,
            carrier: o.shippingMethod.carrier,
            estimatedDays: o.shippingMethod.estimatedDays
          } : "Não especificado",
          shippingEstimateBRL: o.shippingEstimateBRL,
          shippingEstimateWithMarginBRL: o.shippingEstimateWithMarginBRL,
          subtotalBRL: o.subtotalBRL,
          totalBRL: o.totalBRL,
          createdAt: o.createdAt
        })), null, 2)}` 
      : `\n\nO cliente não possui pedidos.`;

    const productsInfo = products && products.length > 0
      ? `\n\nPRODUTOS ATUALMENTE EM ESTOQUE (PRODUTOS DE VITRINE DISPONÍVEIS):\n${JSON.stringify(products, null, 2)}`
      : `\n\nNenhum produto em estoque de vitrine no momento.`;
    
    const clientHeader = `DADOS DO CLIENTE CONECTADO:
- Nome do Cliente: ${customerName || "Não identificado"}
- Protocolo do Chamado de Suporte: ${protocol || "Não especificado"}`;

    const systemInstruction = `Você é um assistente virtual de suporte inteligente e autônomo da loja Dicas by Alê.
Sua missão é ajudar o cliente de forma empática, profissional e direta sobre dúvidas de prazos, cancelamentos, estoque, valores e status de seus pedidos.

${clientHeader}

REGRAS DE ESTOQUE, QUANTIDADES E VALORES:
- DATA ATUAL: Considere que o dia de hoje é 05 de Junho de 2026. Lembre-se, o ano atual é 2026!
- Se o usuário perguntar se temos um determinado produto em estoque (ex: iPhone, relógio, etc.) e as configurações (cores, capacidades, tamanhos, etc.), você DEVE olhar minuciosamente na lista de "PRODUTOS ATUALMENTE EM ESTOQUE" fornecida abaixo.
- Você tem autonomia para consultar esse catálogo e informar com clareza o estoque, o preço (em BRL ou USD), os atributos e a marca do produto.
- Se o produto ou a variante específica tiver estoque zerado (ou não estiver na lista), diga amigavelmente que não temos em estoque físico de pronta entrega no Brasil no momento, mas explique que podemos comprá-lo diretamente nas lojas recomendadas dos Estados Unidos sob encomenda para ele! Diga que ele pode solicitar uma cotação e orçamento personalizado clicando no botão "Pedir um Orçamento" ou usando nossa barra de busca automatizada na página inicial para iniciar uma cotação.
- IMPORTANTE SOBRE PRODUTOS FUTUROS E LANÇAMENTOS (EX: iPhone 17): Como estamos em Junho de 2026, lembre-se que o iPhone 16 Pro Max já foi lançado em 2024, sendo atualmente o modelo topo de linha disponível. O iPhone 17 Pro Max ainda não foi lançado oficialmente pela Apple (o lançamento costuma ocorrer em setembro de cada ano, ou seja, o iPhone 17 será lançado apenas em Setembro de 2026). Explique essa distinção temporal com precisão se perguntado sobre o iPhone 17 Pro Max, indicando que ainda não foi lançado pela fabricante, mas que poderá encomendá-lo conosco assim que for lançado, ou cotar o excelente iPhone 16 Pro Max hoje mesmo!

REGRAS DE PEDIDOS, CONSULTA E INCONSISTÊNCIAS:
- Ao sanar dúvidas de pedidos, analise com atenção os dados na seção "Pedidos do cliente" fornecida abaixo.
- Informe de forma clara o status atual do pedido (${ordersInfo}) e detalhe seus itens.
- Verifique inconsistências e repasse as regras aos clientes de forma prestativa:
  - Se o status for "PENDING_PAYMENT" (Aguardando Pagamento): Explique que o pedido está reservado e aguardando a confirmação de pagamento para que os trâmites de envio iniciem.
  - Falta de Código de Rastreabilidade: Se o pedido estiver como "IN_TRANSIT_TO_BR" ou estágio posterior, mas sem código de rastreamento cadastrado (ou se o rastreamento estiver ausente), diga que nossa equipe operacional está finalizando os detalhes junto à transportadora internacional e que em breve o código será atualizado no sistema, mas que você pode solicitar auxílio à equipe humana.
  - Se o usuário perguntar sobre a compra de um item que NÃO consta nos seus pedidos listados, mostre de forma transparente que esse produto não está em seu registro de compras da plataforma.

REGRAS DE PRAZOS DE ENTREGA E FRETE:
- Para qualquer questionamento ou consulta de prazos de entrega e frete, você deve explicar de forma muito clara que **os prazos variam de acordo com o método de envio escolhido pelo cliente** (aéreo expresso, postal, courier privado, entrega em mãos, etc.).
- Enfatize de forma transparente que **não há uma única métrica ou duração fixa** porque tratam-se de produtos importados/exportados diretamente dos EUA.
- Explique de forma realista que o transporte e desembaraço podem levar de **poucos dias a até mais de um mês (pouco mais de um mês)** para a entrega definitiva.
- Oriente educadamente o cliente a examinar nossos **Termos e Condições de Envio e Prazos de Entrega** na página de políticas do sistema para as especificações completas de cada modalidade de frete.

AUTONOMIA DE RESPOSTA E AGENTE HUMANO (TRANSFERÊNCIA):
- Você possui total autonomia para solucionar dúvidas simples, fornecer valores/quantidades, e cancelar pedidos pendentes de pagamento (PENDING_PAYMENT) agregando ao final o trigger de cancelamento.
- Entretanto, para problemas complexos ou quando você não conseguir solucionar a dúvida técnica, você DEVE acionar e transferir imediatamente o atendimento para um atendente humano!
- Transfira imediatamente para um atendente humano nos seguintes cenários:
  1. O cliente solicitar falar com uma pessoa, suporte, humano, atendente, ou manifestar nervosismo/insatisfação.
  2. Solicitações de cancelamento de pedidos que já foram pagos e estão com status diferente de "PENDING_PAYMENT" (ex: PAYMENT_RECEIVED, IN_TRANSIT_TO_BR). Explique que o cancelamento automático só é permitido para pedidos pendentes e envie-o para o suporte humano.
  3. Divergências financeiras complexas, dúvidas de taxas extras de importação, ou reclamações severas de atrasos maiores que 35 dias.
- Se for transferir para atendimento humano, escreva uma mensagem muito simpática e reconfortante: "Estou transferindo o seu atendimento diretamente para um especialista do nosso suporte humano agora para que possamos analisar seu caso detalhadamente. Você pode aguardar aqui no chat ou se preferir, entrar em contato conosco diretamente pelo WhatsApp (+55 11 93323-2319)."
- E logo em seguida, você DEVE IMPRIMIR EXATAMENTE no final da mensagem a tag: [TRANSFER_TO_HUMAN] (isso sinalizará o sistema para notificar urgentemente nossos gerentes de suporte).

REGRAS DE CANCELAMENTO AUTOMÁTICO:
- Se você optar por cancelar um pedido pendente a pedido do cliente (apenas status PENDING_PAYMENT), explique a ação e imprima exatamente no final da sua resposta a tag [CANCEL_ORDER_ID: <id do pedido>].

${ordersInfo}
${productsInfo}`;
    
    const contents = messages.map((m: any) => ({
      role: m.role === 'bot' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));
    
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ text: "Desculpe-me, minha inteligência artificial temporariamente não pôde ser carregada (chave de API ausente ou inválida). Por favor, contacte nosso suporte no WhatsApp: +5511933232319 ou email: jallanluiz@gmail.com." });
    }

    const aiResponse = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: systemInstruction
      }
    });
    res.json({ text: aiResponse.text });
  } catch (e: any) {
    console.error("[Chat API Error]:", e);
    const isQuotaError = e?.message?.includes("quota") || e?.message?.includes("429") || (e?.status === 429);
    const fallbackText = isQuotaError 
      ? "Olá! No momento estou sob alta demanda de requisições. Para que eu possa te ajudar imediatamente ou tirar qualquer dúvida urgente sobre pedidos, fale conosco no WhatsApp (+5511933232319) ou nos envie um e-mail em jallanluiz@gmail.com. Obrigado pela compreensão!"
      : "Desculpe-me, ocorreu uma falha temporária na comunicação. Caso precise de ajuda imediata, por favor fale conosco no WhatsApp (+5511933232319) ou por e-mail em jallanluiz@gmail.com.";
    res.json({ text: fallbackText });
  }
});

import nodemailer from "nodemailer";

// Transporter configuration helper
function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  if (!host || !user || !pass) {
    return null;
  }
  
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user,
      pass
    }
  });
}

// Global email dispatcher helper
async function dispatchEmail({ to, subject, html, text }: { to: string, subject: string, html?: string, text?: string }) {
  const transporter = getMailTransporter();
  const trackingLog = `\n[EMAIL DISPATCH] To: ${to}\nSubject: ${subject}\n`;
  
  if (!transporter) {
    console.log(`\n=== E-MAIL SIMULADO (Sem SMTP configurado) ===${trackingLog}Conteúdo:\n${text || html}\n==============================================\n`);
    return { sent: false, simulated: true };
  }
  
  try {
    const fromAddress = process.env.COMPANY_EMAIL_SENDER || process.env.SMTP_USER || "suporte@dicasbyale.com";
    const info = await transporter.sendMail({
      from: `"Suporte Dicas by Alê" <${fromAddress}>`,
      to,
      subject,
      text,
      html
    });
    console.log(`[EMAIL DISPATCH SUCCESS] Message ID: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error("[EMAIL DISPATCH ERROR] Failed to send actual email:", err);
    console.log(`\n=== [FALLBACK] E-MAIL SIMULADO APÓS ERRO DE DISPATCH ===${trackingLog}Conteúdo:\n${text || html}\n=======================================================\n`);
    return { sent: false, error: err };
  }
}

app.post("/api/notify-ticket", async (req, res) => {
  try {
    const { protocol, messages, customerName, isUrgent, collaborators } = req.body;
    let prompt = `Resuma o problema do cliente no chamado ${protocol} \n\nNome: ${customerName}\nMensagens:\n${JSON.stringify(messages)}`;
    if (isUrgent) {
      prompt = `Atenção: O CLIENTE SOLICITOU SUPORTE HUMANO OU O BOT DETECTOU A NECESSIDADE DE UM ATENDENTE. Resuma com urgência o histórico para facilitar o atendimento do atendente humano.\n\nChamado: ${protocol}\nNome do cliente: ${customerName}\nMensagens:\n${JSON.stringify(messages)}`;
    }
    
    const ai = getGeminiClient();
    if (!ai) {
      console.warn("[Ticket Notifier] Can't use Gemini because client is not initialized.");
      return res.json({ success: true, warning: "Gemini not initialized" });
    }

    const aiResponse = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt
    });
    const summaryText = aiResponse.text;
    const subject = isUrgent ? `⚠️ [URGENTE - TRANSFERÊNCIA HUMANA] Chamado #${protocol}` : `Novo Ticket #${protocol}`;

    // Recipients: All provided active ticket collaborators, defaulting to jallanluiz@gmail.com
    const recipientEmails = new Set<string>();
    recipientEmails.add(process.env.ADMIN_EMAIL || "jallanluiz@gmail.com");

    if (collaborators && Array.isArray(collaborators)) {
      collaborators.forEach((c: any) => {
        if (c.email) recipientEmails.add(c.email.trim().toLowerCase());
      });
    }
    const recipientsToSend = Array.from(recipientEmails).join(', ');

    const appUrl = process.env.APP_URL || "https://dicasbyale.com";
    const adminUrl = `${appUrl}/admin`;

    const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f4; color: #292524; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background-color: #e11d48; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
          .badge { display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 8px; letter-spacing: 0.05em; }
          .content { padding: 24px; line-height: 1.6; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
          .meta-table td { padding: 8px 12px; border-bottom: 1px dashed #e7e5e4; }
          .meta-table td.label { font-weight: 600; color: #78716c; width: 30%; }
          .meta-table td.value { font-weight: 500; color: #1c1917; }
          .summary-card { background-color: #fafaf9; border-left: 4px solid #e11d48; padding: 16px; border-radius: 0 8px 8px 0; font-size: 14px; margin-bottom: 24px; }
          .summary-title { font-weight: bold; margin-bottom: 8px; color: #44403c; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { background-color: #e11d48; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .footer { background-color: #fafaf9; padding: 16px; text-align: center; font-size: 11px; color: #78716c; border-top: 1px solid #e7e5e4; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Dicas by Alê - Nova Notificação</h1>
            <div class="badge">${isUrgent ? 'Suporte Humano Solicitado' : 'Acompanhamento de Atendimento'}</div>
          </div>
          <div class="content">
            <p style="margin-top: 0; font-size: 15px;">Olá Administrador/Colaborador,</p>
            <p style="font-size: 14px; color: #57534e;">Um cliente foi encaminhado para atendimento por um especialista humano. Abaixo estão os detalhes do caso:</p>
            
            <table class="meta-table">
              <tr>
                <td class="label">Protocolo</td>
                <td class="value" style="font-family: monospace; font-weight: bold; color: #e11d48;">#${protocol}</td>
              </tr>
              <tr>
                <td class="label">Cliente</td>
                <td class="value">${customerName || 'Não identificado'}</td>
              </tr>
              <tr>
                <td class="label">Tipo</td>
                <td class="value">${isUrgent ? '🔴 Urgente - Transferência para Humano' : 'ℹ️ Informativo / Primeiro Contato'}</td>
              </tr>
            </table>

            <div class="summary-card">
              <div class="summary-title">Resumo do Caso (Gerado por Inteligência Artificial):</div>
              <div style="white-space: pre-line; color: #44403c;">${summaryText}</div>
            </div>

            <p style="font-size: 13px; color: #78716c; margin-bottom: 0;">Para iniciar o atendimento e interagir com o cliente diretamente no chat, clique no botão abaixo para abrir o painel administrativo.</p>
            
            <div class="btn-container">
              <a href="${adminUrl}" class="btn" style="color: #ffffff;">Abrir Painel do Especialista</a>
            </div>
          </div>
          <div class="footer">
            Este é um e-mail automático gerado pelo sistema de suporte Dicas by Alê.<br>
            Ano Atual: 2026. Todos os direitos reservados.
          </div>
        </div>
      </body>
      </html>
    `;

    await dispatchEmail({
      to: recipientsToSend,
      subject,
      text: `Dicas by Alê - Chamado #${protocol}\n\nCliente: ${customerName}\n\nResumo:\n${summaryText}\n\nAcesse o Painel do Especialista em: ${adminUrl}`,
      html: htmlEmail
    });

    res.json({ success: true });
  } catch (e) {
    console.error("[Ticket Notifier] Error during ticket notification summary:", e);
    res.json({ success: true, warning: "Fallback notification triggered" });
  }
});

app.post("/api/notify-quote", async (req, res) => {
  try {
    const { quoteId, customerName, customerEmail, customerPhone, productName, productDescription, priceUSD, collaborators } = req.body;
    
    const prompt = `Crie um e-mail de notificação profissional em português de aviso de nova solicitação de orçamento de importação.
Este e-mail deve ser direcionado especificamente aos colaboradores responsáveis pelo setor de Compras e Cotações. No texto, cumprimente-os e informe que há trabalho pendente.

Detalhes da Solicitação de Orçamento:
- Código do Orçamento: ${quoteId}
- Nome do Cliente: ${customerName}
- E-mail do Cliente: ${customerEmail}
- Telefone do Cliente: ${customerPhone || 'Não informado'}
- Produto de Interesse: ${productName}
- Detalhes/Especificações: ${productDescription || 'Não informado'}
- Valor Estimado: $${priceUSD ? priceUSD.toFixed(2) : '0.00'} USD

Instruções para o comprador:
"Por favor, analise a solicitação, localize o produto em lojas dos EUA e defina o preço final em BRL (incluindo taxas alfandegárias e de envio) no Painel Administrativo para aprovação do cliente."`;

    const recipientList = collaborators && collaborators.length > 0
      ? collaborators.map((c: any) => `${c.name} <${c.email}>`).join(', ')
      : "compras@importafacil.com (Setor de Compras Geral)";

    const ai = getGeminiClient();
    if (!ai) {
      console.warn("[Quote Notifier] Can't use Gemini because client is not initialized.");
      console.log(`\n\n=== [FALLBACK] E-MAIL DE NOTIFICAÇÃO (ÁREA DE COMPRAS) ===\nDestinatários: ${recipientList}\nAssunto: Novo Orçamento Solicitado #${quoteId}\n\nOlá Equipe de Compras,\n\nUm novo orçamento foi solicitado por ${customerName} para o produto: ${productName}.\nPor favor, verifiquem o Painel Administrativo.\n=======================================================\n\n`);
      return res.json({ success: true, warning: "Fallback triggered" });
    }

    const aiResponse = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt
    });

    console.log(`\n\n=== E-MAIL DE NOTIFICAÇÃO (ÁREA DE COMPRAS) ===\nDestinatários: ${recipientList}\nAssunto: [ÁREA DE COMPRAS] Nova Solicitação de Orçamento #${quoteId}\n\n${aiResponse.text}\n================================================\n\n`);
    res.json({ success: true });
  } catch (e) {
    console.error("[Quote Notifier] Error during quote notification summary:", e);
    res.json({ success: true, warning: "Fallback trigger error" });
  }
});



// Only run the server and attach Vite middleware if this file is run directly (not just imported on Vercel)
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  async function startServer() {
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  startServer();
}

export default app;
