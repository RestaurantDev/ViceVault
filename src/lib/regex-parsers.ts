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
 * Skip patterns - lines matching these are NOT transactions
 */
const SKIP_KEYWORDS = [
  /^balance$/i,
  /ending bal/i,
  /beginning bal/i,
  /^available$/i,
  /^statement$/i,
  /page \d/i,
  /account.*number/i,
  /^total$/i,
  /^pending$/i,
  /as of \d/i,
  /^summary$/i,
  /^interest$/i,
  /fee waived/i,
  /^direct deposit$/i,
  /^payroll$/i,
  /^zelle$/i,
  /^wire transfer$/i,
];

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
 * Uses greedy matching for descriptions since they contain spaces
 */
const GENERIC_PATTERNS = [
  // INLINE CONCATENATED FORMAT (no line breaks): Date MM/DD/YY followed by text until $amount
  // Pattern: "10/21/25PURCHASE AUTHORIZED ON 10/21 7-ELEVEN 30126...$46.86"
  // Matches date, then any text (non-greedy) until we hit $XX.XX
  /(\d{1,2}\/\d{1,2}\/\d{2})([A-Za-z].+?)\$([\d,]+\.\d{2})/g,
  
  // INLINE CONCATENATED FORMAT: Date MM/DD/YYYY followed by text until $amount
  /(\d{1,2}\/\d{1,2}\/\d{4})([A-Za-z].+?)\$([\d,]+\.\d{2})/g,
  
  // SPACED FORMAT: Date (MM/DD/YYYY) followed by description followed by amount at line end
  /^(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)\s+\$?([\d,]+\.\d{2})\s*$/gm,
  
  // SPACED FORMAT: Date (MM/DD/YY) followed by description followed by amount at line end
  /^(\d{1,2}\/\d{1,2}\/\d{2})\s+(.+)\s+\$?([\d,]+\.\d{2})\s*$/gm,
  
  // SPACED FORMAT: Date (MM-DD-YYYY) followed by description followed by amount at line end
  /^(\d{1,2}-\d{1,2}-\d{4})\s+(.+)\s+\$?([\d,]+\.\d{2})\s*$/gm,
  
  // SPACED FORMAT: Date without year (MM/DD format) at line start
  /^(\d{1,2}\/\d{1,2})\s+(.+)\s+\$?([\d,]+\.\d{2})\s*$/gm,
  
  // Tab-separated format
  /^(\d{1,2}[-\/]\d{1,2}(?:[-\/]\d{2,4})?)\t+(.+)\t+\$?([\d,]+\.\d{2})\s*$/gm,
  
  // CSV-like comma separated (from exported statements)
  /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}),\s*"?([^",]+)"?,\s*\$?([\d,]+\.\d{2})/g,
];

/**
 * Validate that an ISO date string creates a valid Date object
 */
function isValidISODate(isoString: string): boolean {
  const testDate = new Date(isoString);
  return !isNaN(testDate.getTime());
}

/**
 * Normalize various date formats to ISO (YYYY-MM-DD)
 */
function normalizeDate(dateStr: string): string {
  const currentYear = new Date().getFullYear();
  const todayFallback = new Date().toISOString().split("T")[0];
  
  // Remove any leading/trailing whitespace
  dateStr = dateStr.trim();
  
  let isoString: string;
  
  // Handle MM/DD or M/D format (no year)
  if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
    const [month, day] = dateStr.split("/");
    isoString = `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidISODate(isoString) ? isoString : todayFallback;
  }
  
  // Handle MM/DD/YY format
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
    const [month, day, year] = dateStr.split("/");
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    isoString = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidISODate(isoString) ? isoString : todayFallback;
  }
  
  // Handle MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [month, day, year] = dateStr.split("/");
    isoString = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidISODate(isoString) ? isoString : todayFallback;
  }
  
  // Handle MM-DD-YYYY format
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
    const [month, day, year] = dateStr.split("-");
    isoString = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidISODate(isoString) ? isoString : todayFallback;
  }
  
  // Handle MM-DD-YY format
  if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(dateStr)) {
    const [month, day, year] = dateStr.split("-");
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    isoString = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidISODate(isoString) ? isoString : todayFallback;
  }
  
  // Fallback: return today's date
  return todayFallback;
}

/**
 * Clean up description text
 */
function cleanDescription(desc: string | undefined | null): string {
  if (!desc) return "";
  
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
 * Create a normalized deduplication key
 * Uses fuzzy matching to catch similar descriptions from different patterns
 */
function createDedupeKey(t: ParsedTransaction): string {
  if (!t?.description) return `${t?.date || ""}||${t?.amount?.toFixed(2) || "0"}`;
  
  // Normalize description: lowercase, remove all non-alphanumeric, take first 20 chars
  const normalizedDesc = t.description
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  
  // Use date + normalized description + amount (rounded to avoid float issues)
  return `${t.date}|${normalizedDesc}|${t.amount.toFixed(2)}`;
}

/**
 * Check if a range overlaps with any existing matched ranges
 */
function isOverlapping(
  matchedRanges: Array<{ start: number; end: number }>,
  start: number,
  end: number
): boolean {
  return matchedRanges.some(range => {
    // Check for any overlap
    return start < range.end && end > range.start;
  });
}

/**
 * Deduplicate transactions using fuzzy matching
 */
function deduplicateTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  const seen = new Set<string>();
  return transactions.filter((t) => {
    if (!t?.description) return false; // Guard against null/undefined
    
    const key = createDedupeKey(t);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Main parser function - tries each bank format in order
 * Uses range-based overlap detection to prevent duplicate matches
 */
export function parseStatementText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const matchedRanges: Array<{ start: number; end: number }> = [];
  
  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Process bank-specific patterns first (more accurate), then generic
  const orderedPatterns = [
    ...CHASE_PATTERNS,
    ...WELLS_FARGO_PATTERNS,
    ...BOA_PATTERNS,
    // Generic patterns LAST (fallback only)
    ...GENERIC_PATTERNS,
  ];
  
  // Try each pattern
  for (const pattern of orderedPatterns) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(normalizedText)) !== null) {
      const [rawMatch, dateStr, descriptionRaw, amountStr] = match;
      const matchStart = match.index;
      const matchEnd = match.index + rawMatch.length;
      
      // Skip if this text region overlaps with a previous match
      if (isOverlapping(matchedRanges, matchStart, matchEnd)) {
        continue;
      }
      
      // Skip lines that match non-transaction patterns
      if (SKIP_KEYWORDS.some(p => p.test(rawMatch))) {
        continue;
      }
      
      // Clean and validate description
      const description = cleanDescription(descriptionRaw);
      if (!description || description.length < 3) continue;
      
      // Skip if description looks like headers
      if (/^(date|description|amount|balance|transaction)/i.test(description)) continue;
      
      // Parse and validate amount
      const amount = parseAmount(amountStr);
      if (isNaN(amount) || amount <= 0 || amount > 100000) continue; // Sanity check
      
      // Normalize and validate date
      const normalizedDate = normalizeDate(dateStr);
      const testDate = new Date(normalizedDate);
      if (isNaN(testDate.getTime())) continue; // Skip invalid dates
      
      // Record this match range to prevent overlapping matches
      matchedRanges.push({ start: matchStart, end: matchEnd });
      
      transactions.push({
        date: normalizedDate,
        description,
        amount,
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
    "peacock", "espn", "showtime", "discovery+", "acorns"
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
    if (!t?.description) return false; // Guard against null/undefined
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
      if (!t?.description) return false; // Guard against null/undefined
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
  if (!transactions || transactions.length === 0) {
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
