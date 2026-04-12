import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, TrendingUp, History, ArrowRight, Trash2 } from 'lucide-react';
import './SearchGlobal.css';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '../../utils/searchHistoryService';
import { apiFetch } from '../../utils/apiFetch';
import { capitalizeWords } from '../../utils/textUtils';

const SearchGlobal = () => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([
    'Sony WH-1000XM5', 
    'iPhone 15 Pro', 
    'Samsung QLED TV', 
    'Dyson V11',
    'MacBook Air M3'
  ]);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Load recent searches when component mounts
  useEffect(() => {
    const loadedSearches = getRecentSearches();
    setRecentSearches(loadedSearches);
  }, []);
  
  // Fetch trending searches from API
  useEffect(() => {
    const fetchTrendingSearches = async () => {
      try {
        const data = await apiFetch('/products/trending/searches');
        if (data && data.trendingSearches && data.trendingSearches.length > 0) {
          const capitalizedSearches = data.trendingSearches
            .slice(0, 5)
            .map(term => capitalizeWords(term));
          setTrendingSearches(capitalizedSearches);
        }
      } catch (error) {
        console.error('Error fetching trending searches:', error);
        // Keep default trending searches on error
      }
    };
    
    fetchTrendingSearches();
  }, []);
  
  // Reset search input when returning to home page
  useEffect(() => {
    if (location.pathname === '/') {
      setQuery('');
      setSearchResults([]);
      setIsExpanded(false);
    }
  }, [location.pathname]);

  // Handle click outside to close expanded search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 2) {
      setIsLoading(true);
      clearTimeout(handleInputChange._timer);
      handleInputChange._timer = setTimeout(async () => {
        try {
          const data = await apiFetch(`/products/search?q=${encodeURIComponent(value)}&page=1&sort=relevance&filterOnServer=0`);
          setSearchResults((data.products || []).slice(0, 5));
        } catch {
          setSearchResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 500);
    } else {
      setSearchResults([]);
    }
  };

  // Clear search query
  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
  };

  // Handle search submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // Save the search term to recent searches
      addRecentSearch(query);
      
      // Refresh the recent searches list
      setRecentSearches(getRecentSearches());
      
      // Navigate to search results
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setIsExpanded(false);
    }
  };

  // Handle individual result click
  const handleResultClick = (id) => {
    // Save the search term to recent searches
    addRecentSearch(query);
    
    // Refresh the recent searches list
    setRecentSearches(getRecentSearches());
    
    // Navigate to product page or search results
    navigate(`/product/${id}`);
    setIsExpanded(false);
  };
  
  // Handle recent search term click
  const handleRecentSearchClick = (term) => {
    addRecentSearch(term);
    setRecentSearches(getRecentSearches());
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setIsExpanded(false);
  };
  
  // Clear all recent searches
  const handleClearRecentSearches = (e) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  return (
    <div className={`search-global ${isExpanded ? 'expanded' : ''}`} ref={searchRef}>
      <form onSubmit={handleSubmit} className="search-global-form">
        <div className="search-global-input-wrapper">
          <Search className="search-global-icon" size={18} />
          <input
            type="text"
            placeholder="Search for products..."
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsExpanded(true)}
            className="search-global-input"
            aria-label="Search for products"
          />
          {query && (
            <button 
              type="button" 
              className="search-global-clear" 
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {isExpanded && (
        <div className="search-global-dropdown">
          <div className="search-global-glow"></div>
          {isLoading ? (
            <div className="search-global-loading">
              <div className="search-global-spinner"></div>
              <p>Searching products...</p>
            </div>
          ) : (
            <>
              {searchResults.length > 0 ? (
                <div className="search-global-results">
                  <h3 className="search-global-heading">Search Results</h3>
                  {searchResults.map(result => (
                    <div 
                      className="search-global-result-item" 
                      key={result.id}
                      onClick={() => {
                        addRecentSearch(query);
                        setRecentSearches(getRecentSearches());
                        navigate(`/search?q=${encodeURIComponent(query)}`);
                        setIsExpanded(false);
                      }}
                    >
                      <div className="search-global-result-image">
                        <div className="search-global-result-image-inner" style={{ backgroundImage: `url(${result.image})` }}></div>
                      </div>
                      <div className="search-global-result-content">
                        <div className="search-global-result-meta">
                          <div className="search-global-result-store">{result.store}</div>
                        </div>
                        <h4 className="search-global-result-title">{result.title}</h4>
                        <div className="search-global-result-price">
                          <span className="search-global-result-current">₹{result.currentPrice?.toLocaleString()}</span>
                          {result.discountPercent > 0 && (
                            <span className="search-global-result-discount">-{result.discountPercent}%</span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="search-global-result-arrow" size={16} />
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      if (query.trim()) {
                        addRecentSearch(query);
                        setRecentSearches(getRecentSearches());
                        navigate(`/search?q=${encodeURIComponent(query)}`);
                        setIsExpanded(false);
                      }
                    }}
                    className="search-global-view-all"
                  >
                    View all results <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="search-global-suggestions">
                  {/* Trending searches */}
                  <div className="search-global-section">
                    <h3 className="search-global-heading">
                      <TrendingUp size={16} />
                      Trending Searches
                    </h3>
                    <div className="search-global-tags">
                      {trendingSearches.map((term, index) => (
                        <button 
                          key={index} 
                          className="search-global-tag" 
                          onClick={() => {
                            setQuery(term);
                            addRecentSearch(term);
                            setRecentSearches(getRecentSearches());
                            navigate(`/search?q=${encodeURIComponent(term)}`);
                            setIsExpanded(false);
                          }}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Recent searches - conditionally render based on if we have any */}
                  {recentSearches.length > 0 && (
                    <div className="search-global-section">
                      <h3 className="search-global-heading">
                        <History size={16} />
                        Recent Searches
                        <button 
                          className="search-global-clear-history"
                          onClick={handleClearRecentSearches}
                          aria-label="Clear recent searches"
                          title="Clear recent searches"
                        >
                          <Trash2 size={14} />
                        </button>
                      </h3>
                      <div className="search-global-tags">
                        {recentSearches.map((term, index) => (
                          <button 
                            key={index} 
                            className="search-global-tag recent" 
                            onClick={() => handleRecentSearchClick(term)}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchGlobal;