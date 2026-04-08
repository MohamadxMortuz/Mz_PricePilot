const axios = require('axios');
const config = require('../config/config');
const { ApiError } = require('../middleware/errorHandler');
const RateLimit = require('bottleneck');

class ScrapingService {
  constructor() {
    this.apiKey = config.scraperApi.apiKey;
    this.baseUrl = 'https://api.scraperapi.com/';
    
    // Rate limiter for scraping
    this.limiter = new RateLimit({
      minTime: 2000, // Minimum time between requests (2 seconds)
      maxConcurrent: 1, // Only one request at a time
      reservoir: 100, // Number of requests per hour
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 60 * 60 * 1000 // 1 hour
    });
  }

  /**
   * Search for products using Google Shopping
   * @param {string} query - Search query
   * @param {object} options - Search options (page, sort, filters)
   * @returns {Promise<Array>} - Array of product results
   */
  async searchProducts(query, options = {}) {
    // Use the limiter for scraping requests
    return this.limiter.schedule(() => this._searchProducts(query, options));
  }

  // Rename existing searchProducts to _searchProducts and make it private
  async _searchProducts(query, options = {}) {
    try {
      const { page = 1, sort = 'relevance', priceMin, priceMax } = options;
      
      // Construct Google Shopping URL
      let googleShoppingUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop&hl=en&gl=in`;
      
      // Add sorting
      if (sort === 'price_low') {
        googleShoppingUrl += '&tbs=p_ord:p';
      } else if (sort === 'price_high') {
        googleShoppingUrl += '&tbs=p_ord:pd';
      } else if (sort === 'rating') {
        googleShoppingUrl += '&tbs=p_ord:rv';
      }
      
      // Add price filtering if provided
      if (priceMin && priceMax) {
        googleShoppingUrl += `&tbs=mr:1,price:1,ppr_min:${priceMin},ppr_max:${priceMax}`;
      } else if (priceMin) {
        googleShoppingUrl += `&tbs=mr:1,price:1,ppr_min:${priceMin}`;
      } else if (priceMax) {
        googleShoppingUrl += `&tbs=mr:1,price:1,ppr_max:${priceMax}`;
      }
      
      // Add pagination
      if (page > 1) {
        googleShoppingUrl += `&start=${(page - 1) * 10}`;
      }

      console.log(`Scraping URL: ${googleShoppingUrl}`);

      try {
        const scraperUrl = `${this.baseUrl}?api_key=${this.apiKey}&url=${encodeURIComponent(googleShoppingUrl)}&country_code=in&device_type=desktop&output_format=json&autoparse=true`;
        
        console.log(`Using ScraperAPI URL: ${scraperUrl}`);
        
        const response = await axios.get(scraperUrl, { timeout: 30000 });
        
        if (response.status !== 200) {
          console.error('ScraperAPI returned non-200 status:', response.status);
          throw new ApiError('Failed to fetch product data from Google Shopping', 502);
        }

        console.log('ScraperAPI returned JSON response');
        const data = response.data;
        const products = this.transformShoppingResults(data, query).slice(0, 12);
        
        // Extract pagination info
        const totalResults = this.extractTotalResults(data);
        
        return {
          products,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalResults / 10),
            totalResults
          }
        };
      } catch (error) {
        console.error('ScraperAPI Error:', error.message);
        throw new ApiError('ScraperAPI failed to fetch data: ' + error.message, 502);
      }
    } catch (error) {
      console.error('Error in searchProducts:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(`Failed to search products: ${error.message}`, 500);
    }
  }

  /**
   * Transform ScraperAPI JSON results into our product format
   * @param {Object} data - ScraperAPI response data
   * @param {string} query - Search query
   * @returns {Array} - Array of formatted products
   */
  transformShoppingResults(data, query) {
    try {
      if (!data.shopping_results || !Array.isArray(data.shopping_results)) {
        console.error('No shopping results in the response:', data);
        return [];
      }

      const products = data.shopping_results.map((item, index) => {
        // ScraperAPI returns Indian prices in European format e.g. "65.900 ₹" = ₹65,900
        // extracted_price is also wrong (659 instead of 65900), so parse from string
        const currentPrice = this.parseIndianPrice(item.price || '');

        return {
          id: `gshop-${index}-${Date.now()}`,
          title: item.title || `Product for ${query}`,
          productUrl: null, // ScraperAPI Google Shopping doesn't return product URLs
          image: item.thumbnail || null,
          currentPrice,
          originalPrice: null,
          discountPercent: 0,
          store: item.source || 'Online Store',
          badge: item.badge || null,
          rating: null,
          reviewCount: 0,
          inStock: true,
          currency: 'INR',
          searchQuery: query,
          delivery: null
        };
      });

      return products;
    } catch (error) {
      console.error('Error transforming shopping results:', error);
      return [];
    }
  }
  
  /**
   * Extract total results count from response data
   */
  extractTotalResults(data) {
    try {
      if (data.shopping_results && Array.isArray(data.shopping_results)) {
        // If we have more pages, estimate a reasonable number
        if (data.pagination && data.pagination.pages_count > 1) {
          return data.shopping_results.length * data.pagination.pages_count;
        }
        
        // Otherwise just return the length of current results
        return data.shopping_results.length;
      }
      return 0;
    } catch (error) {
      console.error('Error extracting total results:', error);
      return 10; // Default fallback
    }
  }
  
  /**
   * Extract numeric price from string
   * @param {string} priceText - Price text (e.g. "₹19,540")
   * @returns {number} - Numeric price
   */
  // Parse Indian price string e.g. "₹65,900" => 65900
  parseIndianPrice(priceText) {
    if (!priceText) return 0;
    // Remove everything except digits and dots
    // Indian format: "₹65,900" or "₹1,23,456"
    const digitsOnly = priceText.replace(/[^\d]/g, '');
    const price = parseInt(digitsOnly, 10);
    return isNaN(price) ? 0 : price;
  }
}

module.exports = new ScrapingService();