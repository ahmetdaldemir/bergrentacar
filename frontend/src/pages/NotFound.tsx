import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SEO
        title="404 - Page Not Found | Berg Rent a Car"
        description="The page you are looking for could not be found."
        noindex={true}
      />
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-8xl font-bold text-gray-300 mb-2">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Sayfa Bulunamadı</h2>
        <p className="text-lg text-gray-600 mb-6">
          Aradığınız sayfa mevcut değil.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-lg"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
