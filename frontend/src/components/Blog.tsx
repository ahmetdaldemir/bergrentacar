import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import type { Blog } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiAssetUrl } from '@/config/api';

const Blog = () => {
  const { currentLanguage, t } = useTranslation();
  const [blog, setBlog] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlog = async () => {
      if (!currentLanguage?.id) return;

      try {
        setLoading(true);
        setError(null);
        const data = await api.getBlog(currentLanguage.id);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Blog API response:', data);
        }
        
        // Handle different response formats
        let blogList: any[] = [];
        if (Array.isArray(data)) {
          blogList = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          blogList = data.data;
        } else if (data && typeof data === 'object' && Array.isArray(data.blog)) {
          blogList = data.blog;
        } else {
          blogList = [];
        }

        // Transform new API response format to Blog interface
        const transformedBlogs: Blog[] = blogList
          .filter((item: any) => item.status === 'published') // Only show published blogs
          .map((item: any) => {
            // Find translation for current language
            const translation = item.translations?.find(
              (t: any) => t.language?.code === currentLanguage.code || t.language?.id === currentLanguage.id
            ) || item.translations?.[0]; // Fallback to first translation

            if (!translation) {
              return null;
            }

            // Parse value JSON string
            let parsedValue: { content?: string; slug?: string } = {};
            try {
              parsedValue = JSON.parse(translation.value || '{}');
            } catch (e) {
              console.warn('Failed to parse blog value:', e);
            }

            // Extract short description from content (first paragraph or first 150 chars)
            const content = parsedValue.content || '';
            const shortDescription = content
              ? content.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
              : '';

            return {
              id: item.id,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              tenantId: item.tenantId,
              locationId: item.locationId,
              status: item.status,
              publishedAt: item.publishedAt,
              image: item.image,
              location: item.location,
              translations: item.translations,
              title: translation.name || '',
              content: parsedValue.content || '',
              slug: parsedValue.slug || translation.slug || '',
              short_description: shortDescription,
            };
          })
          .filter((item): item is Blog => item !== null);

        setBlog(transformedBlogs);
      } catch (err) {
        // Error already handled in API, just set empty state
        setBlog([]);
        setError(null); // Don't show error to user, just show empty state
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error fetching blog:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [currentLanguage?.id, currentLanguage?.code]);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-black mb-2">What's new?</h2>
          <p className="text-gray-600 mb-8">
            Find all the latest and interesting news about Bergrentacar here!
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gray-300 w-full h-40 sm:h-44"></div>
                <div className="p-6">
                  <div className="bg-gray-200 h-4 w-32 mb-2 rounded"></div>
                  <div className="bg-gray-200 h-6 w-3/4 mb-3 rounded"></div>
                  <div className="bg-gray-200 h-4 w-full mb-2 rounded"></div>
                  <div className="bg-gray-200 h-4 w-24 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-black mb-2">What's new?</h2>
          <p className="text-gray-600 mb-8">
            Find all the latest and interesting news about Bergrentacar here!
          </p>
          <div className="text-center text-red-600">
            <p>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  // Helper function to strip HTML tags and get plain text
  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Helper function to get image URL
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    return getApiAssetUrl(imagePath);
  };

  if (blog.length === 0 && !loading) {
    return null; // Don't show section if no blogs
  }

  return (
    <section className="py-8 sm:py-12 md:py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-2">
          {t('blog.title') || "What's new?"}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
          {t('blog.subtitle') || "Find all the latest and interesting news about Bergrentacar here!"}
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {blog.slice(0, 4).map((item) => (
            <Link 
              key={item.id} 
              to={`/blog/${item.slug}`}
              className="relative group cursor-pointer overflow-hidden rounded-lg bg-white shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              {/* Image Container */}
              <div className="relative h-36 sm:h-40 md:h-44 overflow-hidden">
                {item.image ? (
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.title || 'Blog post'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-lg sm:text-xl font-bold text-center px-3">
                      {item.title || 'Blog Post'}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
              </div>
              
              <div className="p-3 sm:p-4">
                {item.short_description && (
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide line-clamp-1">
                    {stripHtml(item.short_description).substring(0, 50)}
                    {stripHtml(item.short_description).length > 50 ? '...' : ''}
                  </p>
                )}
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-black mb-2 line-clamp-2">
                  {stripHtml(item.title)}
                </h3>
                <span className="text-green-600 font-semibold hover:text-green-700 transition-colors inline-flex items-center text-sm">
                  {t('blog.readMore') || 'Read +'}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Blog;