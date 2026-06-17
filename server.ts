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

// Resilient wrapper with automatic retry and model fallback for transient high-demand API issues (like 503 UNAVAILABLE or 429 RESOURCE_EXHAUSTED)
async function generateContentWithRetry(ai: GoogleGenAI, params: any, retries = 3, delayMs = 500): Promise<any> {
  const requestedModel = params.model || "gemini-1.5-flash";
  
  // List of valid models from current skill guidelines
  const fallbackList = [
    requestedModel,
    "gemini-1.5-flash",
    "gemini-2.0-flash"
  ];
  
  // Filter out duplicates and maintain order
  const modelsToTry: string[] = [];
  const seen = new Set<string>();
  for (const m of fallbackList) {
    if (!seen.has(m)) {
      modelsToTry.push(m);
      seen.add(m);
    }
  }
  
  // Re-sort to prioritize non-overloaded models
  const sortedModels = modelsToTry.sort((a, b) => {
    const aOverloaded = isModelOverloaded(a) ? 1 : 0;
    const bOverloaded = isModelOverloaded(b) ? 1 : 0;
    return aOverloaded - bOverloaded;
  });

  let lastError: any = null;

  for (const modelName of sortedModels) {
    // If the model is marked overloaded but it's the very last one we have, still try it
    if (isModelOverloaded(modelName) && modelName !== sortedModels[sortedModels.length - 1]) {
      console.log(`[Gemini SDK] Skipping overloaded model '${modelName}'...`);
      continue;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[Gemini SDK] Calling ${modelName} (attempt ${attempt}/${retries})...`);
        
        // Prepare contents: handle both string prompt and multi-turn message array
        let finalContents = params.contents;
        if (typeof params.contents === 'string' || !params.contents) {
          finalContents = params.contents || params.prompt || "";
        }
        
        // CORRECT SDK USAGE: ai.models.generateContent
        const result = await ai.models.generateContent({
          model: modelName,
          contents: finalContents,
          config: params.config // Pass config as a property, not spread
        });
        
        return result;
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const status = err?.status;
        console.warn(`[Gemini SDK] Error ${modelName} [${status}] attempt ${attempt}:`, msg);

        const isQuotaExhausted = 
          status === 429 || 
          msg.includes("429") || 
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.includes("quota") ||
          msg.includes("rate limit") ||
          msg.includes("limit exceeded");

        const isTemporary = 
          isQuotaExhausted ||
          status === 503 || 
          msg.includes("503") || 
          msg.includes("UNAVAILABLE") || 
          msg.includes("high demand") ||
          msg.includes("temporary");

        if (isTemporary) {
          markModelOverloaded(modelName);
        }

        if (isQuotaExhausted) {
          break; // Move to next model
        }

        if (!isTemporary) {
          break; // Stop retrying this model
        }

        if (attempt < retries) {
          await new Promise(r => setTimeout(r, delayMs * attempt));
        }
      }
    }
  }

  throw lastError || new Error("All Gemini models failed.");
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
          model: "gemini-1.5-flash",
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
      } catch (geminiError: any) {
        const errorMsg = String(geminiError).toLowerCase();
        if (errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("resource_exhausted") || errorMsg.includes("limit")) {
          console.log("[Scraper] Gemini search-grounded extraction rate limit or quota reached. Falling back to scraped metadata elegantly.");
        } else {
          console.error("[Scraper] Gemini search-grounded extraction failed, falling back to scraped metadata:", geminiError);
        }
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
  const { query: searchQuery, userLocation } = req.body;
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
    // Determine context based on userLocation if provided
    const locationContext = userLocation ? `O usuário está atualmente em: ${JSON.stringify(userLocation)}.` : "Localização do usuário não fornecida, assuma um contexto global (entre Brasil e Estados Unidos).";

    const prompt = `Você é um Personal Shopper Global especializado em economizar o tempo do cliente e aumentar sua produtividade.
    
    TAREFA: Realize uma pesquisa ativa na internet via Google Search para encontrar o produto: "${searchQuery}".
    
    DIRETRIZES GLOBAIS:
    1. Pesquise em lojas oficiais e confiáveis nos ESTADOS UNIDOS (ex: Amazon.com, eBay.com, Walmart, Apple, Nike US, Sephora US, etc.) E no BRASIL (ex: Amazon.com.br, Mercado Livre, Magalu, lojas oficiais locais).
    2. Identifique onde o produto está disponível de forma mais vantajosa (menor preço, disponibilidade ou conveniência).
    3. Se o usuário estiver nos EUA, prioritize resultados de lojas nos EUA para compra local OU no Brasil se ele desejar enviar para lá (vice-versa se estiver no Brasil).
    4. ${locationContext}
    
    OBJETIVO: Facilitar a vida do cliente. Ele não quer perder tempo viajando apenas para comprar. Mostre que através do seu serviço, ele pode focar na produtividade dele enquanto nós cuidamos da logística.

    Identifique até 6 itens reais e disponíveis que correspondam à pesquisa do usuário.
    
    Retorne um JSON array de objetos com este formato exato:
    {
      "name": "Nome real e completo do produto",
      "description": "Explicação em português de por que esta é uma ótima opção para o cliente (inclua se é nos EUA ou Brasil e o benefício de conveniência/tempo).",
      "priceUSD": 0.0, // Preço aproximado em DÓLAR (converta se for no BR, assuma 1 USD = 5 BRL aprox para fins informativos se necessário)
      "priceBRL": 0.0, // Preço aproximado em REAIS
      "imageUrl": "URL real de imagem do produto ou Unsplash correspondente",
      "storeName": "Nome da Loja (País)", // ex: "Amazon (EUA)", "Apple (Brasil)", "Nike (FL, EUA)"
      "url": "Link real oficial para o produto",
      "currency": "USD" // Moeda original da loja ("USD" ou "BRL")
    }
    
    CRÍTICO: 
    - O campo "url" deve ser o link real do site da loja.
    - O campo "description" deve reforçar a economia de tempo e praticidade.
    - Siga o formato JSON rigorosamente. Não adicione texto conversacional.`;

    const aiResponse = await generateContentWithRetry(ai, {
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json" 
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
    const arrayMatch = textResult.match(/\[\s*\{?[\s\S]*\}?\s*\]/);
    if (arrayMatch) {
      textResult = arrayMatch[0];
    }

    let results = [];
    try {
      results = JSON.parse(textResult);
    } catch (e) {
      console.error("[Search Internet] Failed to parse JSON:", textResult.substring(0, 500));
      // Try to find any array if the previous match was too loose
      const secondMatch = textResult.match(/\[[\s\S]*\]/);
      if (secondMatch) {
        try {
          results = JSON.parse(secondMatch[0]);
        } catch (e2) {
          throw new Error("JSON parsing failed twice.");
        }
      } else {
        throw new Error("Could not find JSON array in response.");
      }
    }

    if (Array.isArray(results)) {
      if (results.length === 0) {
        console.warn("[Search Internet] Gemini returned an empty array for query:", searchQuery);
      }
      
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
      throw new Error("Parsed results was not an array");
    }

  } catch (error: any) {
    const errorMsg = String(error).toLowerCase();
    const isQuotaError = errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("resource_exhausted") || errorMsg.includes("limit") || (error?.status === 429);
    if (isQuotaError) {
      console.log("[Search Internet] Error searching internet with Gemini due to quota/rate limit.");
    } else {
      console.error("[Search Internet] Error searching internet with Gemini:", error);
    }
    res.status(isQuotaError ? 429 : 500).json({ 
      results: [], 
      isFallback: false, 
      errorReason: isQuotaError ? "QUOTA_LIMIT" : "GENERAL_ERROR" 
    });
  }
});

app.post("/api/chat", async (req, res) => {
  const { messages, orders, products, protocol, customerName, systemKnowledge } = req.body;
  try {
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

    const learnedRulesText = systemKnowledge && systemKnowledge.length > 0
       ? `\n\nCONHECIMENTOS REGENERADOS APRENDIDOS (AUTONOMIA DO ASSISTENTE COM O PASSAR DO TEMPO):\nSiga rigorosamente as diretrizes e regras que você aprendeu com resoluções humanas passadas para solucionar estes cenários no sistema:\n${systemKnowledge.map((k: any, idx: number) => `Regra Extra #${idx + 1} (${k.category}): ${k.title}\n- Diretriz de Resolução: ${k.description}`).join('\n\n')}`
       : '';

    const systemInstruction = `Você é um assistente virtual de suporte inteligente, autônomo e regenerativo da loja Dicas by Alê.
Sua missão é ajudar o cliente de forma empática, profissional e direta sobre dúvidas de prazos, cancelamentos, estoque, valores e status de seus pedidos.

${clientHeader}
${learnedRulesText}

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
      model: "gemini-1.5-flash",
      contents,
      config: {
        systemInstruction: systemInstruction
      }
    });
    res.json({ text: aiResponse.text });
  } catch (e: any) {
    const errorMsg = String(e).toLowerCase();
    const isQuotaError = errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("resource_exhausted") || errorMsg.includes("limit") || (e?.status === 429);
    if (isQuotaError) {
      console.log("[Chat API Error] Rate limit or Quota exceeded on Gemini API. Activating conversational fallback list...");
    } else {
      console.error("[Chat API Error]:", e);
    }
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.text || "";
    const lowerMsg = lastUserMsg.toLowerCase().trim();
    
    let fallbackText = "";
    if (lowerMsg.includes("humano") || lowerMsg.includes("atendente") || lowerMsg.includes("suporte") || lowerMsg.includes("falar com") || lowerMsg.includes("pessoa") || lowerMsg.includes("gerente") || lowerMsg.includes("atendimento")) {
      fallbackText = "Estou transferindo o seu atendimento diretamente para um especialista do nosso suporte humano agora para que possamos analisar seu caso detalhadamente. Você pode aguardar aqui no chat ou se preferir, entrar em contato conosco diretamente pelo WhatsApp (+55 11 93323-2319). [TRANSFER_TO_HUMAN]";
    } else if (lowerMsg.includes("cancel") || lowerMsg.includes("estorn") || lowerMsg.includes("excluir")) {
      const pendingOrder = orders?.find((o: any) => o.status === 'PENDING_PAYMENT');
      if (pendingOrder) {
        fallbackText = `Percebi que você gostaria de cancelar a sua compra do pedido #${pendingOrder.id}. Como este pedido encontra-se com o status "Aguardando Pagamento", efetuei o cancelamento automático dele conforme solicitado! \n\n[CANCEL_ORDER_ID: ${pendingOrder.id}]`;
      } else {
        const paidOrder = orders?.find((o: any) => o.status !== 'PENDING_PAYMENT' && o.status !== 'CANCELLED');
        if (paidOrder) {
          fallbackText = `Identifiquei o seu pedido #${paidOrder.id} com o status atual "${paidOrder.status}". Como o pagamento já foi recebido ou o pedido já está em rota de entrega, o cancelamento automático não é possível por aqui. Estou transferindo seu atendimento diretamente para um especialista do nosso suporte humano agora para que possamos analisar seu caso detalhadamente. Você pode aguardar aqui no chat ou se preferir, entrar em contato conosco diretamente pelo WhatsApp (+55 11 93323-2319). [TRANSFER_TO_HUMAN]`;
        } else {
          fallbackText = "Não encontrei nenhum pedido ativo ou pendente de pagamento em seu cadastro para cancelamento automático. Se precisar de ajuda para cancelar uma compra já paga, por favor chame no WhatsApp (+5511933232319) ou fale com nossa equipe de suporte. [TRANSFER_TO_HUMAN]";
        }
      }
    } else if (lowerMsg.includes("rastre") || lowerMsg.includes("prazo") || lowerMsg.includes("entrega") || lowerMsg.includes("cheg") || lowerMsg.includes("envi") || lowerMsg.includes("pedido") || lowerMsg.includes("status")) {
      if (orders && orders.length > 0) {
        const lastOrder = orders[orders.length - 1];
        const itemsList = lastOrder.items?.map((i: any) => `- ${i.name || i.product?.name} (Qtd: ${i.quantity})`).join('\n') || '';
        const trackingInfoText = (lastOrder.trackingId && lastOrder.trackingId !== "Sem código de rastreio cadastrado no momento")
          ? `O código de rastreamento do seu envio é: ${lastOrder.trackingId}.`
          : "O código de rastreamento ainda está sendo finalizado pelas equipes de logística internacional e será atualizado em breve.";
        
        fallbackText = `Olá! Busquei seus registros e identifiquei seu pedido mais recente #${lastOrder.id}.\n\n` +
               `Status do Pedido: ${lastOrder.status === 'PENDING_PAYMENT' ? 'Aguardando Pagamento' : lastOrder.status}\n` +
               `Itens do Pedido:\n${itemsList}\n\n` +
               `Prazo e Envio: Os prazos variam de acordo com o método de envio contratado (geralmente de 15 a 25 dias úteis para despacho direto dos EUA). ${trackingInfoText}\n\n` +
               `Caso reste qualquer dúvida, por favor responda com "falar com suporte humano".`;
      } else {
        fallbackText = "Não encontrei nenhum pedido ativo ou histórico de compras em nosso banco de dados associado ao seu cadastro. Se você realizou uma compra sob outro e-mail, por favor me informe! De qualquer forma, posso te transferir para nossa equipe de suporte para analisar seu caso. [TRANSFER_TO_HUMAN]";
      }
    } else if (products && products.length > 0) {
      const matchedProducts = products.filter((p: any) => lowerMsg.includes(p.name?.toLowerCase()) || (p.brand && lowerMsg.includes(p.brand?.toLowerCase())));
      if (matchedProducts.length > 0) {
        const prodText = matchedProducts.map((p: any) => {
          const inStockText = p.inventory > 0 ? `disponível em estoque de vitrina (Estoque: ${p.inventory})` : 'sob encomenda dos EUA';
          return `- **${p.name}** (${p.brand || 'Marca importada'}): Preço aproximado de R$ ${p.priceBRL || (p.priceUSD * 5.5)} (${inStockText})`;
        }).join('\n');
        fallbackText = `Encontrei informações de produtos relacionados à sua busca em nosso catálogo:\n\n${prodText}\n\nSe quiser realizar uma cotação personalizada para importarmos qualquer modelo específico direto dos EUA para você, basta clicar em "Pedir um Orçamento"!`;
      }
    }

    if (!fallbackText) {
      const errStr = JSON.stringify(e).toLowerCase() + " " + String(e).toLowerCase();
      const isQuotaError = errStr.includes("quota") || errStr.includes("429") || errStr.includes("limit") || errStr.includes("exhausted");
      fallbackText = isQuotaError 
        ? "Olá! No momento nosso assistente virtual inteligente está sob altíssima demanda, mas estou aqui para te conduzir:\n\n• **Prazos:** Nossos prazos dependem do método de envio contratado (geralmente de 15 a 25 dias úteis).\n• **Cancelamento:** Digite 'cancelar pedido' para cancelamentos automáticos de compras pendentes.\n• **Falar com Humano:** Se precisar tirar qualquer dúvida urgente ou interagir com nosso suporte, digite 'falar com suporte humano' ou fale no WhatsApp: (+55 11 93323-2319)."
        : "Desculpe-me, ocorreu uma falha de comunicação temporária. Caso precise de ajuda imediata, por favor fale conosco no WhatsApp (+5511933232319) ou digite 'falar com suporte humano' para eu te transferir!";
    }

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
    
    let summaryText = "";
    
    // Get the last 4 messages to show as a fallback chronological context
    const fallbackMessageLog = Array.isArray(messages) && messages.length > 0
      ? messages.slice(-4).map((m: any) => `[${m.role === 'bot' ? 'Suporte' : 'Cliente'}]: ${m.text}`).join('\n')
      : "Sem histórico de mensagens disponível.";

    const ai = getGeminiClient();
    if (!ai) {
      console.warn("[Ticket Notifier] Can't use Gemini because client is not initialized.");
      summaryText = `[Incapaz de gerar resumo automático por chave de API ou conexão indisponível]\n\nÚltimas mensagens registradas:\n${fallbackMessageLog}`;
    } else {
      try {
        const aiResponse = await generateContentWithRetry(ai, {
          model: "gemini-1.5-flash",
          contents: prompt
        });
        summaryText = aiResponse.text;
      } catch (geminiErr: any) {
        const errorMsg = String(geminiErr).toLowerCase();
        const isQuotaError = errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("resource_exhausted") || errorMsg.includes("limit") || (geminiErr?.status === 429);
        if (isQuotaError) {
          console.log("[Ticket Notifier] Gemini summarization failed due to quota/rate limit.");
        } else {
          console.error("[Ticket Notifier] Gemini summarization failed:", geminiErr);
        }
        summaryText = `[Incapaz de gerar resumo automático por limite de cota de IA atingido temporariamente]\n\nÚltimas mensagens registradas:\n${fallbackMessageLog}`;
      }
    }
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

    let quoteEmailText = "";
    const fallbackTemplate = `Olá Equipe de Compras,\n\nUm novo orçamento foi solicitado no sistema!\n• Código do Orçamento: ${quoteId}\n• Cliente: ${customerName} (${customerEmail})\n• Telefone: ${customerPhone || 'Não informado'}\n• Produto de Interesse: ${productName}\n• Detalhes: ${productDescription || 'Não informado'}\n• Valor Estimado: $${priceUSD ? priceUSD.toFixed(2) : '0.00'} USD\n\nPor favor, analise a solicitação, localize o produto em lojas dos EUA e defina o preço final em BRL (incluindo taxas alfandegárias e de envio) no Painel Administrativo para aprovação do cliente.`;

    const ai = getGeminiClient();
    if (!ai) {
      console.warn("[Quote Notifier] Can't use Gemini because client is not initialized.");
      quoteEmailText = fallbackTemplate;
    } else {
      try {
        const aiResponse = await generateContentWithRetry(ai, {
          model: "gemini-3.5-flash",
          contents: prompt
        });
        quoteEmailText = aiResponse.text;
      } catch (geminiErr: any) {
        const errorMsg = String(geminiErr).toLowerCase();
        const isQuotaError = errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("resource_exhausted") || errorMsg.includes("limit") || (geminiErr?.status === 429);
        if (isQuotaError) {
          console.log("[Quote Notifier] Gemini quote notification summarization failed due to quota/rate limit, placing fallback template.");
        } else {
          console.error("[Quote Notifier] Gemini quote notification summarization failed, placing fallback template:", geminiErr);
        }
        quoteEmailText = fallbackTemplate;
      }
    }

    console.log(`\n\n=== E-MAIL DE NOTIFICAÇÃO (ÁREA DE COMPRAS) ===\nDestinatários: ${recipientList}\nAssunto: [ÁREA DE COMPRAS] Nova Solicitação de Orçamento #${quoteId}\n\n${quoteEmailText}\n================================================\n\n`);
    res.json({ success: true });
  } catch (e) {
    console.error("[Quote Notifier] Error during quote notification summary:", e);
    res.json({ success: true, warning: "Fallback trigger error" });
  }
});

app.post("/api/learn-from-ticket", async (req, res) => {
  try {
    const { messages, ticketId, protocol, customerName } = req.body;
    
    if (!messages || messages.length < 2) {
      return res.json({ result: [] });
    }

    const conversationText = messages.map((m: any) => {
      const actor = m.role === 'bot' ? (m.isAgent ? 'Atendente Humano' : 'Assistente Virtual') : 'Cliente';
      return `[${actor} - ${m.timestamp}]: ${m.text}`;
    }).join('\n');

    const prompt = `Você é um especialista em Inteligência Artificial e Engenharia de Conhecimento para suporte de e-commerce da loja Dicas by Alê.
Analise a seguinte conversa de suporte entre um Cliente e nossa equipe (que inclui o Assistente Virtual e, possivelmente, um Atendente Humano).

Seu objetivo é extrair qualquer novo aprendizado, regra do sistema, política atualizada da loja (ex: fretes, taxas, prazos, formas de devolução, cancelamentos especiais) ou resoluções práticas usadas para sanar o problema do cliente.

Regras importantes:
1. NÃO inclua dados pessoais como o nome do cliente "${customerName || 'Cliente'}", código de rastreamento do cliente, CPF ou valores exclusivos desta compra. Generalize-os em diretrizes de sistema (Ex: "Casos de cancelamento após envio requerem retenção de R$50 de taxa postal" ou "Se a transportadora X atrasar, oferecemos cupom de 5%").
2. Foque especialmente em soluções dadas pelo "Atendente Humano", pois estas mostram como a IA deve proceder em casos similares no futuro para aumentar sua autonomia.
3. Se a conversa for muito simples e não contiver nenhum conhecimento novo relevante (apenas saudações ou perguntas básicas já cobertas), retorne um array vazio [].
4. Crie títulos concisos e descrições ricas, em português. Emita o resultado obedecendo estritamente o formato JSON abaixo.
5. Retorne os aprendizados estritamente como um array de objetos JSON formatado exatamente como este exemplo:
[
  {
    "title": "Regra de Cancelamento para Encomendas Especiais",
    "category": "CANCELAMENTO",
    "description": "Se o cliente solicitar o cancelamento de uma encomenda internacional que já foi adquirida nas lojas dos EUA, deve-se cobrar 15% de taxa de reestocagem.",
    "confidence": 0.9,
    "type": "HUMAN_REPLY"
  }
]

Categorias permitidas: "ESTOQUE" | "FRETE" | "IMPOSTOS" | "CANCELAMENTO" | "POLÍTICAS" | "OUTROS"
Tipos permitidos: "HUMAN_REPLY" (se envolveu Atendente Humano) | "BOT_INTERACTION" (se resolvido satisfatoriamente pelo bot)

Conversa de suporte (Protocolo #${protocol || 'N/A'}):
${conversationText}`;

    const ai = getGeminiClient();
    if (!ai) {
      console.warn("[Register Knowledge] Can't parse with Gemini because client is not initialized.");
      return res.json({ result: [] });
    }

    try {
      const aiResponse = await generateContentWithRetry(ai, {
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = aiResponse.text;
      let parsedKnowledge = [];
      try {
        parsedKnowledge = JSON.parse(responseText);
      } catch (err) {
        console.warn("[Register Knowledge] Failed to parse JSON reply from Gemini:", err);
      }

      return res.json({ result: Array.isArray(parsedKnowledge) ? parsedKnowledge : [] });
    } catch (geminiError: any) {
      console.log("[Register Knowledge] Gemini rate limit or quota reached when analyzing knowledge.");
      return res.json({ result: [] });
    }
  } catch (err) {
    console.error("[Register Knowledge Error]:", err);
    res.json({ result: [] });
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
