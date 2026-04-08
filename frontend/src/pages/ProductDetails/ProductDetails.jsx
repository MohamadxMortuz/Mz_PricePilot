import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { ExternalLink, Star, ArrowLeft, ShoppingCart } from 'lucide-react';
import Loader from '../../components/UI/Loader/Loader';
import './ProductDetails.css';

const ProductDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [product, setProduct] = useState(location.state?.product || null);
  const [loading, setLoading] = useState(!product);

  useEffect(() => {
    if (!product) {
      // No state passed — nothing to show, go back
      setLoading(false);
    }
  }, [product]);

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);

  if (loading) return <div className="product-details-loading"><Loader /></div>;

  if (!product) {
    return (
      <div className="product-details-error">
        <h2>Product not found</h2>
        <p>We couldn't load the product details.</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="product-details-page">
      <div className="container">
        <div className="product-details-back">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back to results
          </button>
        </div>

        <div className="product-details-card">
          <div className="product-details-image">
            <img src={product.image} alt={product.title} />
          </div>

          <div className="product-details-info">
            <div className="product-details-store">{product.store}</div>
            <h1 className="product-details-title">{product.title}</h1>

            {product.rating && (
              <div className="product-details-rating">
                <Star size={16} fill="currentColor" strokeWidth={0} />
                <span>{product.rating}</span>
                {product.reviewCount > 0 && (
                  <span className="product-details-reviews">({product.reviewCount} reviews)</span>
                )}
              </div>
            )}

            <div className="product-details-pricing">
              <div className="product-details-price">{formatPrice(product.currentPrice)}</div>
              {product.originalPrice && (
                <>
                  <div className="product-details-original">{formatPrice(product.originalPrice)}</div>
                  {product.discountPercent > 0 && (
                    <div className="product-details-discount">-{product.discountPercent}% OFF</div>
                  )}
                </>
              )}
            </div>

            {product.delivery && (
              <div className="product-details-delivery">{product.delivery}</div>
            )}

            <div className="product-details-stock">
              {product.inStock
                ? <span className="in-stock">✓ In Stock</span>
                : <span className="out-of-stock">✗ Out of Stock</span>}
            </div>

            <div className="product-details-actions">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(product.title + ' ' + product.store)}&tbm=shop`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <ShoppingCart size={16} /> Buy on {product.store}
                <ExternalLink size={14} />
              </a>
              <Link to={`/search?q=${encodeURIComponent(product.searchQuery || product.title)}`} className="btn btn-secondary">
                Compare Prices
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
