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

        const aiResponse = await ai.models.generateContent({
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

    const aiResponse = await ai.models.generateContent({
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
    const { messages, orders, products } = req.body;
    const ordersInfo = orders && orders.length > 0 
      ? `\n\nPedidos do cliente:\n${JSON.stringify(orders.map((o: any) => ({
          id: o.id,
          status: o.status,
          trackingId: o.trackingId,
          items: o.items.map((i: any) => i.product.name).join(", ")
        })), null, 2)}` 
      : `\n\nO cliente não possui pedidos.`;

    const productsInfo = products && products.length > 0
      ? `\n\nPRODUTOS ATUALMENTE EM ESTOQUE (PRODUTOS DE VITRINE DISPONÍVEIS):\n${JSON.stringify(products, null, 2)}`
      : `\n\nNenhum produto em estoque de vitrine no momento.`;
    
    const systemInstruction = `Você é um assistente virtual de suporte da loja Dicas by Alê. 
Seja empático, humano e ajude o cliente com dúvidas sobre prazos, cancelamentos, estoque, especificações ou qualquer outra dúvida. Mantenha as respostas curtas e objetivas.

REGRAS DE ESTOQUE, LANÇAMENTOS E PRODUTOS:
- DATA ATUAL: Considere que o dia de hoje é 05 de Junho de 2026. Lembre-se, o ano atual é 2026!
- Se o usuário perguntar se temos um determinado produto em estoque (ex: iPhone, relógio, etc.) e quais configurações estão disponíveis (cores, capacidades, tamanhos, etc.), você DEVE olhar minuciosamente na lista "PRODUTOS ATUALMENTE EM ESTOQUE" fornecida abaixo.
- Informe ao cliente de forma clara e objetiva se o produto está em estoque, as configurações disponíveis (variantes de cores/capacidades cadastrados com estoque > 0), e as respectivas quantidades em estoque.
- Se o produto não estiver cadastrado com estoque, ou se o estoque total/variante estiver zerado, responda educadamente informando o cliente que não temos esse item específico em nosso estoque físico de pronta entrega no momento. IMPORTANTE: Explique que podemos comprá-lo diretamente nas lojas recomendadas dos Estados Unidos sob encomenda para ele! Informe que ele pode solicitar uma cotação e orçamento personalizado clicando no botão "Pedir um Orçamento" ou usando nossa barra de busca para solicitar um orçamento automatizado na página inicial.
- IMPORTANTE SOBRE PRODUTOS FUTUROS E LANÇAMENTOS (EX: iPhone 17): Como estamos em Junho de 2026, lembre-se que o iPhone 16 Pro Max já foi lançado há muito tempo (em 2024), e no momento o modelo topo de linha mais recente disponível no mercado é o iPhone 16 Pro Max. O iPhone 17 Pro Max ainda não foi lançado oficialmente pela Apple (pois a Apple costuma lançar novos modelos em setembro de cada ano, ou seja, o iPhone 17 será lançado apenas em Setembro de 2026). Explique essa distinção temporal com precisão se perguntado sobre o iPhone 17 Pro Max, dizendo que ainda não foi lançado pela Apple, mas que podemos cotar ou encomendar assim que for lançado, ou cotar o excelente iPhone 16 Pro Max hoje mesmo!

REGRAS DE CANCELAMENTO:
- Você PODE cancelar pedidos que ainda não foram pagos (status PENDING_PAYMENT).
- Para cancelar um pedido, responda com a mensagem ao cliente informando o cancelamento, e IMPRIMA EXATAMENTE no final da sua resposta a tag [CANCEL_ORDER_ID: <id do pedido>] para que o sistema cancele automaticamente.
- Se o pedido JÁ FOI PAGO (status diferente de PENDING_PAYMENT), VOCÊ NÃO PODE CANCELAR. Neste caso, encaminhe o usuário para o nosso WhatsApp (+5511933232319) ou email (jallanluiz@gmail.com).

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

    const aiResponse = await ai.models.generateContent({
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

app.post("/api/notify-ticket", async (req, res) => {
  try {
    const { protocol, messages, customerName } = req.body;
    const prompt = `Resuma o problema do cliente no chamado ${protocol} \n\nNome: ${customerName}\nMensagens:\n${JSON.stringify(messages)}`;
    
    const ai = getGeminiClient();
    if (!ai) {
      console.warn("[Ticket Notifier] Can't use Gemini because client is not initialized.");
      return res.json({ success: true, warning: "Gemini not initialized" });
    }

    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    console.log(`\n\n=== E-MAIL DE NOTIFICAÇÃO ===\nPara: Admin\nAssunto: Novo Ticket ${protocol}\n${aiResponse.text}\n=============================\n\n`);
    res.json({ success: true });
  } catch (e) {
    console.error("[Ticket Notifier] Error during ticket notification summary:", e);
    // Return success true with warning so it doesn't break user flow
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

    const aiResponse = await ai.models.generateContent({
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
