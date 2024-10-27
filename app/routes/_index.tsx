import { useEffect, useState, useRef } from 'react';
import UXInsightPopup from '~/components/UXInsightPopup';

interface Interaction {
  type: string;
  timestamp: number;
  details?: any;
}

interface UrlChange {
  from: string;
  to: string;
  timestamp: number;
}

export default function Index() {
  const [iframeSrc, setIframeSrc] = useState('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [urlChanges, setUrlChanges] = useState<UrlChange[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get('url');

    if (targetUrl) {
      const proxiedUrl = `/proxy?url=${encodeURIComponent(targetUrl)}`;
      setIframeSrc(proxiedUrl);
    } else {
      console.warn('No URL parameter provided!');
    }

    // Set up event listener to receive messages from the iframe
    window.addEventListener('message', handleIframeMessage);

    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, []);

  const handleIframeMessage = (event: MessageEvent) => {
    const { type, data } = event.data;

    if (type === 'interaction') {
      setInteractions((prev) => [...prev, data]);
    } else if (type === 'url-change') {
      setUrlChanges((prev) => [...prev, data]);
    } else if (type === 'log-ready') {
      console.log('Initial URL log received:', data);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {iframeSrc ? (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            overflow: 'hidden',
          }}
        />
      ) : (
        <p>Loading...</p>
      )}

      {/* Use the UXInsightPopup component */}
      <UXInsightPopup interactions={interactions} urlChanges={urlChanges} />
    </div>
  );
}

// Styles for the popup and preformatted text
const popupStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '10px',
  right: '10px',
  width: '300px',
  maxHeight: '300px',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: 'white',
  borderRadius: '8px',
  padding: '10px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
  zIndex: 1000,
};

const preStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  padding: '5px',
  borderRadius: '4px',
  overflowX: 'auto',
};