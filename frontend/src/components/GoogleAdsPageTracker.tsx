import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackSpaPageView } from '@/lib/googleAds';

const GoogleAdsPageTracker = () => {
  const location = useLocation();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    trackSpaPageView();
  }, [location.pathname, location.search]);

  return null;
};

export default GoogleAdsPageTracker;
