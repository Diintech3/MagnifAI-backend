const { env } = require("../config/env");

const NEWS_BASE = "https://newsapi.org/v2";

async function fetchNewsArticles(query, pageSize = 20) {
  const apiKey = env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      language: "en",
      sortBy: "publishedAt",
      pageSize: String(pageSize),
      apiKey,
    });
    const res = await fetch(`${NEWS_BASE}/everything?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[newsapi]", err.message || res.status);
      return [];
    }
    const d = await res.json();
    return d.articles || [];
  } catch (e) {
    console.error("[newsapi]", e.message);
    return [];
  }
}

/**
 * Multi-level fallback query strategy:
 * 1. Exact seat name + state + election
 * 2. Seat name + state (no "election")
 * 3. Broader: winner candidate name + state (passed from route)
 * 4. Fallback: just state + election (always returns results)
 */
async function fetchWithFallback(seatName, state, winnerName) {
  const queries = [
    `"${seatName}" "${state}" election`,
    `"${seatName}" ${state}`,
    `${seatName} constituency ${state}`,
  ];

  // Add winner name query if provided
  if (winnerName) queries.push(`"${winnerName}" ${state} politician`);

  // Always-results fallback
  queries.push(`${state} election constituency MLA`);
  queries.push(`${state} vidhan sabha politics`);

  for (const q of queries) {
    const articles = await fetchNewsArticles(q, 30);
    if (articles.length > 0) {
      console.log(`[newsapi] query matched: "${q}" → ${articles.length} results`);
      return { articles, queryUsed: q };
    }
  }
  return { articles: [], queryUsed: null };
}

function classifySentiment(text) {
  const t = (text || "").toLowerCase();
  const pos = ["win", "develop", "progress", "success", "improve", "award", "achiev", "growth", "inaugurat", "launch", "complet", "help", "resolv", "build", "invest"];
  const neg = ["arrest", "corrupt", "scam", "contro", "accus", "fail", "crime", "crisis", "protest", "agitat", "victim", "violence", "loss", "murder", "riot", "tension", "clash"];
  const posScore = pos.filter((w) => t.includes(w)).length;
  const negScore = neg.filter((w) => t.includes(w)).length;
  if (posScore > negScore) return "positive";
  if (negScore > posScore) return "negative";
  return "neutral";
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function categoriseArticle(article) {
  const url = (article.url || "").toLowerCase();
  const src = (article.source?.name || "").toLowerCase();
  const combined = url + " " + src;

  if (/quora|reddit|stackexchange|yahoo.answers/i.test(combined)) return "qa";
  if (/blogspot|medium\.com|wordpress|substack|blogger/i.test(combined)) return "blogs";
  if (/scroll\.in|thewire\.in|livemint|theprint|frontline|newslaundry/i.test(combined)) return "articles";
  if (/tripadvisor|trustpilot|yelp|g2\.com/i.test(combined)) return "reviews";
  if (/\.gov\.in|nic\.in|uplegis|eci\.gov/i.test(combined)) return "websites";
  if (/forum|community|discuss|boards\./i.test(combined)) return "forum";
  if (/testimonial|mypolitician|janadesh/i.test(combined)) return "testimonials";
  if (/timesofindia|hindustantimes|ndtv|thehindu|indianexpress|aajtak|abp|zee|bbc|reuters|ani|pti|jagran|ujala|navbharat|livehindustan|aljazeera|wion/i.test(combined)) return "news";
  return "others";
}

function articleToMention(article) {
  const text = `${article.title || ""} ${article.description || ""} ${article.content || ""}`;
  let sourceHost = "";
  try { sourceHost = new URL(article.url || "https://unknown").hostname; } catch (_) { sourceHost = "unknown"; }
  return {
    title: article.title || "(No title)",
    source: article.source?.name || sourceHost,
    url: article.url || null,
    date: formatDate(article.publishedAt),
    snippet: article.description || (article.content || "").slice(0, 200) || "(No description)",
    sentiment: classifySentiment(text),
    category: categoriseArticle(article),
  };
}

async function getDigitalMentions(seatName, state = "Uttar Pradesh", winnerName = "") {
  const { articles, queryUsed } = await fetchWithFallback(seatName, state, winnerName);

  const byCategory = {
    news: [], blogs: [], articles: [], qa: [],
    reviews: [], websites: [], forum: [], testimonials: [], others: [],
  };

  let positive = 0, negative = 0, neutral = 0;

  for (const article of articles) {
    const mention = articleToMention(article);
    (byCategory[mention.category] || byCategory.others).push(mention);
    if (mention.sentiment === "positive") positive++;
    else if (mention.sentiment === "negative") negative++;
    else neutral++;
  }

  return {
    summary: { total: articles.length, positive, negative, neutral },
    queryUsed,
    isFallback: queryUsed ? !queryUsed.includes(seatName) : false,
    byCategory,
    categoryMeta: Object.entries(byCategory).map(([id, items]) => ({
      id,
      label: CATEGORY_LABELS[id],
      count: items.length,
    })),
  };
}

const CATEGORY_LABELS = {
  news: "News", blogs: "Blogs", articles: "Articles", qa: "Q&A",
  reviews: "Reviews", websites: "Websites", forum: "Forums",
  testimonials: "Testimonials", others: "Other Pages",
};

module.exports = { getDigitalMentions };
