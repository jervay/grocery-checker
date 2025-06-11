const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));

function formatPrice(str) {
  const match = str.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

// Real-time Countdown scraper (Woolworths NZ)
async function scrapeCountdown(query) {
  const url = `https://www.woolworths.co.nz/shop/search/products?search=${encodeURIComponent(query)}`;
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const results = [];

  $(".product-tile").each((i, el) => {
    const name = $(el).find(".title").text().trim();
    const price = formatPrice($(el).find(".price-dollars").text() + $(el).find(".price-cents").text());
    const image = $(el).find("img").attr("src");
    if (name && price && image) {
      results.push({
        name,
        price,
        image: `https://www.woolworths.co.nz${image}`,
        store: "Countdown",
        inStock: true
      });
    }
  });

  return results;
}

app.get("/api/search", async (req, res) => {
  const query = (req.query.q || "").trim().toLowerCase();
  if (!query) return res.status(400).json({ error: "Missing search term" });

  try {
    const countdownResults = await scrapeCountdown(query);
    const sorted = countdownResults.sort((a, b) => a.price - b.price);
    res.json(sorted);
  } catch (e) {
    console.error("Scraping error:", e.message);
    res.status(500).json({ error: "Scraping failed" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
