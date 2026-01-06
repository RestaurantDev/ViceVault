/**
 * Multi-Bank Statement Parser
 * 
 * Robust regex patterns to extract transactions from various bank statement formats.
 * Supports: Chase, Wells Fargo, Bank of America, and generic fallback.
 */

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  rawMatch: string;
}

/**
 * Chase Bank Format
 * Example: "01/15/2024  STARBUCKS #12345 SEATTLE WA  -$5.75"
 * Example: "01/15/2024  PURCHASE AUTHORIZED ON 01/14 STARBUCKS CARD 1234  $5.75"
 */
const CHASE_PATTERNS = [
  // Standard format with negative amounts
  /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\$[\d,]+\.\d{2})/g,
  // Purchase authorized format
  /(\d{2}\/\d{2}\/\d{4})\s+(?:PURCHASE AUTHORIZED ON \d{2}\/\d{2}\s+)?(.+?)\s+(?:CARD \d+\s+)?\$?([\d,]+\.\d{2})/gi,
];

/**
 * Wells Fargo Format
 * Example: "01/15  DEBIT CARD PURCHASE STARBUCKS #12345  5.75"
 * Example: "1/15  POS DEBIT - VISA CHECK CARD 1234 - STARBUCKS  $5.75"
 */
const WELLS_FARGO_PATTERNS = [
  // Standard debit card format (no year in date)
  /(\d{1,2}\/\d{1,2})\s+(?:DEBIT CARD PURCHASE\s+)?(.+?)\s+([\d,]+\.\d{2})\s*$/gm,
  // POS debit format
  /(\d{1,2}\/\d{1,2})\s+(?:POS DEBIT\s+-\s+VISA CHECK CARD \d+\s+-\s+)?(.+?)\s+\$?([\d,]+\.\d{2})/gi,
  // Full date format
  /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})/g,
];

/**
 * Bank of America Format
 * Example: "01/15/24  Starbucks Coffee  $5.75  Debit"
 * Example: "01/15/2024  CHECKCARD 0115 STARBUCKS #12345  5.75"
 */
const BOA_PATTERNS = [
  // Standard format with Debit/Credit suffix
  /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+\$?([\d,]+\.\d{2})\s+(?:Debit|Credit)?/gi,
  // Checkcard format
  /(\d{2}\/\d{2}\/\d{2,4})\s+(?:CHECKCARD \d{4}\s+)?(.+?)\s+([\d,]+\.\d{2})/gi,
];

/**
 * Generic Fallback Patterns
 * Catches most common formats across banks
 */
const GENERIC_PATTERNS = [
  // Date followed by description followed by amount with dollar sign
  /(\d{1,2}[-\/]\d{1,2}[-\/]?\d{0,4})\s+(.{3,50}?)\s+\$?([\d,]+\.\d{2})/g,
  // Tab or multi-space separated
  /(\d{1,2}[-\/]\d{1,2}(?:[-\/]\d{2,4})?)\t+(.+?)\t+\$?([\d,]+\.\d{2})/g,
  // CSV-like comma separated (from exported statements)
  /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}),\s*"?([^",]+)"?,\s*\$?([\d,]+\.\d{2})/g,
];

/**
 * Normalize various date formats to ISO (YYYY-MM-DD)
 */
function normalizeDate(dateStr: string): string {
  const currentYear = new Date().getFullYear();
  
  // Remove any leading/trailing whitespace
  dateStr = dateStr.trim();
  
  // Handle MM/DD or M/D format (no year)
  if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
    const [month, day] = dateStr.split("/");
    return `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  // Handle MM/DD/YY format
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
    const [month, day, year] = dateStr.split("/");
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  // Handle MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [month, day, year] = dateStr.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  // Handle MM-DD-YYYY format
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
    const [month, day, year] = dateStr.split("-");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  // Fallback: return as-is with current year prefix
  return `${currentYear}-01-01`;
}

/**
 * Clean up description text
 */
function cleanDescription(desc: string): string {
  return desc
    .replace(/\s+/g, " ")           // Normalize whitespace
    .replace(/\s*#\d+\s*/g, " ")    // Remove store numbers
    .replace(/\s*\d{4}$/, "")       // Remove trailing card numbers
    .replace(/CARD \d+/gi, "")      // Remove "CARD 1234" patterns
    .replace(/\s{2,}/g, " ")        // Clean up double spaces
    .trim();
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number {
  // Remove dollar signs and commas
  const cleaned = amountStr.replace(/[$,]/g, "");
  // Handle negative amounts (with minus sign)
  return Math.abs(parseFloat(cleaned));
}

/**
 * Deduplicate transactions by date + description + amount
 */
function deduplicateTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  const seen = new Set<string>();
  return transactions.filter((t) => {
    const key = `${t.date}|${t.description.toLowerCase()}|${t.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Main parser function - tries each bank format in order
 */
export function parseStatementText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // All patterns grouped by bank
  const allPatterns = [
    ...CHASE_PATTERNS,
    ...WELLS_FARGO_PATTERNS,
    ...BOA_PATTERNS,
    ...GENERIC_PATTERNS,
  ];
  
  // Try each pattern
  for (const pattern of allPatterns) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(normalizedText)) !== null) {
      const [rawMatch, dateStr, description, amountStr] = match;
      
      // Skip if description is too short or looks like headers
      if (!description || description.length < 3) continue;
      if (/^(date|description|amount|balance|transaction)/i.test(description)) continue;
      
      transactions.push({
        date: normalizeDate(dateStr),
        description: cleanDescription(description),
        amount: parseAmount(amountStr),
        rawMatch,
      });
    }
  }
  
  // Deduplicate and sort by date
  return deduplicateTransactions(transactions).sort(
    (a, b) => a.date.localeCompare(b.date)
  );
}

/**
 * Vice category keywords for auto-detection
 */
export const VICE_KEYWORDS: Record<string, string[]> = {
  smoking: [
    "tobacco", "cigarette", "cigarettes", "vape", "vaping", "juul", 
    "marlboro", "camel", "newport", "smoke shop", "smokeshop",
    "cigar", "e-cig", "nicotine", "puff bar", "blu cigs"
  ],
  alcohol: [
    "liquor", "bar", "pub", "brewery", "wine", "beer", "spirits",
    "total wine", "bevmo", "spec's", "abc store", "tavern", "saloon",
    "nightclub", "club", "lounge", "cocktail", "whiskey", "vodka"
  ],
  gambling: [
    "casino", "draftkings", "fanduel", "bet365", "betmgm", "poker",
    "lottery", "lotto", "slots", "wager", "sportsbook", "bovada",
    "gambling", "bet ", "betting", "stake", "pokerstars"
  ],
  coffee: [
    "starbucks", "dunkin", "coffee", "cafe", "espresso", "latte",
    "peets", "dutch bros", "caribou", "tim horton", "blue bottle",
    "philz", "intelligentsia", "counter culture", "roasters"
  ],
  fastFood: [
    "mcdonald", "burger king", "wendy", "taco bell", "chick-fil-a",
    "kfc", "popeyes", "arby", "sonic", "jack in the box", "subway",
    "chipotle", "five guys", "in-n-out", "whataburger", "carl's jr",
    "hardee", "panda express", "del taco", "white castle"
  ],
  cannabis: [
    "dispensary", "cannabis", "marijuana", "weed", "pot shop",
    "420", "leafly", "weedmaps", "greenleaf", "herbal", "medmen"
  ],
  shopping: [
    "amazon", "target", "walmart", "costco", "best buy", "macys",
    "nordstrom", "sephora", "ulta", "apple store", "nike", "adidas",
    "zara", "h&m", "forever 21", "urban outfitters"
  ],
  subscriptions: [
    "netflix", "spotify", "hulu", "disney+", "hbo max", "paramount",
    "apple tv", "youtube premium", "amazon prime", "audible", "crunchyroll",
    "peacock", "espn", "showtime", "discovery+"
  ],
  delivery: [
    "doordash", "uber eats", "grubhub", "postmates", "instacart",
    "seamless", "caviar", "delivery.com", "favor", "gopuff"
  ],
};

/**
 * Categorize transactions based on vice keywords
 */
export function categorizeTransactions(
  transactions: ParsedTransaction[],
  viceType: string
): ParsedTransaction[] {
  const keywords = VICE_KEYWORDS[viceType.toLowerCase()];
  
  if (!keywords || keywords.length === 0) {
    return [];
  }
  
  return transactions.filter((t) => {
    const descLower = t.description.toLowerCase();
    return keywords.some((kw) => descLower.includes(kw.toLowerCase()));
  });
}

/**
 * Auto-detect the likely vice category from transactions
 */
export function detectViceCategory(transactions: ParsedTransaction[]): {
  category: string;
  matchCount: number;
  totalAmount: number;
}[] {
  const results: { category: string; matchCount: number; totalAmount: number }[] = [];
  
  for (const [category, keywords] of Object.entries(VICE_KEYWORDS)) {
    const matches = transactions.filter((t) => {
      const descLower = t.description.toLowerCase();
      return keywords.some((kw) => descLower.includes(kw.toLowerCase()));
    });
    
    if (matches.length > 0) {
      results.push({
        category,
        matchCount: matches.length,
        totalAmount: matches.reduce((sum, t) => sum + t.amount, 0),
      });
    }
  }
  
  // Sort by total amount descending
  return results.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Calculate summary statistics from transactions
 */
export function calculateTransactionSummary(transactions: ParsedTransaction[]) {
  if (transactions.length === 0) {
    return {
      count: 0,
      total: 0,
      average: 0,
      min: 0,
      max: 0,
      dateRange: { start: "", end: "" },
    };
  }
  
  const amounts = transactions.map((t) => t.amount);
  const dates = transactions.map((t) => t.date).sort();
  
  return {
    count: transactions.length,
    total: amounts.reduce((sum, a) => sum + a, 0),
    average: amounts.reduce((sum, a) => sum + a, 0) / amounts.length,
    min: Math.min(...amounts),
    max: Math.max(...amounts),
    dateRange: {
      start: dates[0],
      end: dates[dates.length - 1],
    },
  };
}

