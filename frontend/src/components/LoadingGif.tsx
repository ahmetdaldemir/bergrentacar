import { useState } from "react";

interface LoadingGifProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingGif = ({ className = "", size = 'md' }: LoadingGifProps) => {
  const [imgError, setImgError] = useState(true); // Start with error state since GIF doesn't exist

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  // Always show spinner for now (GIF doesn't exist)
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-orange-600 border-t-transparent ${sizeClasses[size]}`} />
    </div>
  );
};

export default LoadingGif;

