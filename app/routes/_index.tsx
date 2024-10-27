import { useEffect, useState } from 'react';

export default function Index() {
  const [iframeSrc, setIframeSrc] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get('url');

    if (targetUrl) {
      const proxiedUrl = `/proxy?url=${encodeURIComponent(targetUrl)}`;
      setIframeSrc(proxiedUrl);
    } else {
      console.warn('No URL parameter provided!');
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {iframeSrc ? (
        <iframe
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
    </div>
  );
}