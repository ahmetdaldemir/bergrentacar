import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import { Blog } from "@/types";
import { useTranslation } from "@/contexts/TranslationContext";
import { getApiAssetUrl, localUploadHtml } from "@/config/api";
import SEO from "@/components/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchForm from "@/components/SearchForm";
import { Link } from "react-router-dom";

const BlogDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentLanguage, t } = useTranslation();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      if (!slug || !currentLanguage?.id) return;

      try {
        setLoading(true);
        const data = await api.getBlog(currentLanguage.id);
        
        // Handle different response formats
        let blogList: any[] = [];
        if (Array.isArray(data)) {
          blogList = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
          blogList = data.data;
        } else if (data && typeof data === 'object' && Array.isArray(data.blog)) {
          blogList = data.blog;
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
              description: parsedValue.content || '', // Full content as description
            };
          })
          .filter((item): item is Blog => item !== null);
        
        const foundBlog = transformedBlogs.find((item: Blog) => item.slug === slug);
        
        if (foundBlog) {
          setBlog(foundBlog);
        } else {
          navigate("/", { replace: true });
          return;
        }
      } catch (err) {
        console.error("Error fetching blog:", err);
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug, currentLanguage?.id, currentLanguage?.code, navigate]);

  // Helper function to strip HTML tags
  const stripHtml = useCallback((html: string) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }, []);

  // Get image URL
  const getBlogImage = useCallback((blog: Blog): string => {
    if (blog.image) return getApiAssetUrl(blog.image);
    return '/rentacar.jpeg';
  }, []);

  if (loading || !blog) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('blog.loading') || 'Loading...'}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const blogImage = getBlogImage(blog);
  const shortDescription = stripHtml(blog.short_description || '');
  const description = localUploadHtml(blog.content || blog.description || blog.short_description || '');

  // Prepare SEO data
  const seoTitle = `${blog.title || 'Blog Post'} | Berg Rent a Car`;
  const seoDescription = shortDescription 
    ? `${shortDescription.substring(0, 150)}${shortDescription.length > 150 ? '...' : ''}`
    : `Read about ${blog.title || 'blog post'} on Berg Rent a Car blog.`;
  const seoImage = blogImage;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        image={seoImage}
        type="article"
        keywords={`${blog.title}, car rental, berg rent a car, blog`}
      />
      <Header />

      {/* Hero Section with Blog Image and Search Form */}
      <section className="relative bg-gray-900 text-white py-12 md:py-20 min-h-[600px] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${blogImage}')`,
          }}
        >
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        <div className="relative container mx-auto px-4 z-10">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm">
            <ol className="flex items-center gap-2 text-white/80">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  {t('footer.home') || 'Anasayfa'}
                </Link>
              </li>
              <li className="text-white/50">/</li>
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  {t('blog.title') || 'Blog'}
                </Link>
              </li>
              <li className="text-white/50">/</li>
              <li className="text-white truncate max-w-xs sm:max-w-md md:max-w-lg">{blog.title}</li>
            </ol>
          </nav>

          {/* Title and Subtitle */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white drop-shadow-lg">
              {blog.title}
            </h1>
            {shortDescription && (
              <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl leading-relaxed drop-shadow-md">
                {shortDescription}
              </p>
            )}
          </div>

          {/* Search Form - White Card on Top */}
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-4xl container mx-auto">
            <SearchForm variant="detailPage" />
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Blog Meta Information */}
          <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {blog.publishedAt && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{t('blog.published') || 'Published'}: {new Date(blog.publishedAt).toLocaleDateString(String(currentLanguage?.code || 'en'), { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            )}
            {blog.createdAt && !blog.publishedAt && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{t('blog.published') || 'Published'}: {new Date(blog.createdAt).toLocaleDateString(String(currentLanguage?.code || 'en'), { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            )}
          </div>

          {/* Blog Content */}
          {description && (
            <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 md:p-10">
              <div 
                className="blog-content prose prose-lg max-w-none 
                  prose-headings:text-gray-900 prose-headings:font-bold
                  prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-0
                  prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:text-gray-800
                  prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-6
                  prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                  prose-a:text-blue-600 prose-a:no-underline prose-a:hover:underline
                  prose-strong:text-gray-900 prose-strong:font-semibold
                  prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4
                  prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4
                  prose-li:text-gray-700 prose-li:mb-2
                  prose-img:rounded-lg prose-img:shadow-md prose-img:my-6
                  prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600
                  prose-hr:border-gray-200 prose-hr:my-8
                  prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </article>
          )}

          {/* Back to Blog Button */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link 
              to="/"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>{t('blog.backToHome') || 'Back to Home'}</span>
            </Link>
          </div>

          {/* Call to Action Section */}
          <div className="mt-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-8 text-white text-center shadow-lg">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {t('cta.title') || 'Make a Reservation Now'}
            </h2>
            <p className="text-lg mb-6 opacity-90">
              {t('cta.description') || "Don't miss out on exclusive offers. Make a reservation now and take advantage of competitive prices."}
            </p>
            <Link to="/">
              <button className="bg-white text-orange-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors shadow-md">
                {t('cta.button') || 'Make Reservation'}
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogDetail;

