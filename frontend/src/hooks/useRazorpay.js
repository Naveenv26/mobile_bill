// frontend/src/hooks/useRazorpay.js
import { useState } from 'react';

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise = null;

// Loads Razorpay script ONCE, only when called — not on component mount
const loadRazorpayScript = () => {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptPromise = null; // allow retry on failure
      reject(new Error('Failed to load Razorpay script'));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
};

const useRazorpay = () => {
  const [isLoaded, setIsLoaded] = useState(
    () => !!window.Razorpay // true if already loaded from a previous call
  );

  // Returns a function to trigger loading on demand
  const load = async () => {
    if (isLoaded) return true;
    try {
      await loadRazorpayScript();
      setIsLoaded(true);
      return true;
    } catch {
      return false;
    }
  };

  return { isLoaded, load };
};

export default useRazorpay;