const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// Timeout helper
function timeoutAfter(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timed out")), ms)
  );
}

// Pak'nSave scraper (sample logic using test HTML)
async function scrapePaknSave(item, suburb) {
  const query = encodeURIComponent(item);
  const url = `https://www.paknsave.co.nz/shop/search?search=${query}`;

  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const product = $(".product").first();
  const name = product.find(".product-title").text().trim();
  const price = product.find(".price-per-item").text().trim();
  const img = product.find("img").attr("src");

  if (!name || !price) throw new Error("No product found");

  return {
    store: "Pak'nSave",
    name,
    price,
    image: img || "",
    suburb
  };
}

// New World scraper (sample logic using test HTML)
async function scrapeNewWorld(item, suburb) {
  const query = encodeURIComponent(item);
  const url = `https://www.newworld.co.nz/shop/search?search=${query}`;

  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const product = $(".product").first();
  const name = product.find(".product-title").text().trim();
  const price = product.find(".price-per-item").text().trim();
  const img = product.find("img").attr("src");

  if (!name || !price) throw new Error("No product found");

  return {
    store: "New World",
    name,
    price,
    image: img || "",
    suburb
  };
}

// Search API
app.post("/api/search", async (req, res) => {
  const { item, suburb } = req.body;

  if (!item) {
    return res.status(400).json({ error: "Item name is required." });
  }

  const results = [];

  const scrapers = [
    () => Promise.race([scrapePaknSave(item, suburb), timeoutAfter(5000)]),
    () => Promise.race([scrapeNewWorld(item, suburb), timeoutAfter(5000)]),
    // Add Woolworths if needed
  ];

  for (const scraper of scrapers) {
    try {
      const data = await scraper();
      results.push(data);
    } catch (err) {
      console.log("Scraper failed:", err.message);
    }
  }

  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
