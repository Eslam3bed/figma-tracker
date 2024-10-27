import { useState } from 'react';

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

interface UXInsightPopupProps {
  interactions: Interaction[];
  urlChanges: UrlChange[];
}

export default function UXInsightPopup({ interactions, urlChanges }: UXInsightPopupProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null); // Track expanded interaction row

  const toggleExpand = () => setExpanded((prev) => !prev);

  const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleString();

  const totalClicks = interactions.filter((i) => i.type === 'click').length;
  const startTime = interactions.length > 0 ? formatTimestamp(interactions[0].timestamp) : 'N/A';

  return (
    <div style={popupStyle}>
      <div style={headerStyle} onClick={toggleExpand}>
        <img
          src="https://via.placeholder.com/30"
          alt="UX Insight Logo"
          style={logoStyle}
        />
        <div>
          <h3 style={{ margin: 0 }}>UX Insight</h3>
          {!expanded && (
            <div style={summaryStyle}>
              <p>{`Total Clicks: ${totalClicks}`}</p>
              <p>{`URL Changes: ${urlChanges.length}`}</p>
              <small>{`Session Start: ${startTime}`}</small>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <strong>URL Changes:</strong>
          <pre style={preStyle}>{JSON.stringify(urlChanges, null, 2)}</pre>

          <strong>Interactions:</strong>
          {interactions.map((interaction, index) => (
            <div key={index} style={rowStyle}>
              <div
                style={rowHeaderStyle}
                onClick={() =>
                  setExpandedRow((prev) => (prev === index ? null : index))
                }
              >
                <span>{`Interaction ${index + 1}: ${interaction.type}`}</span>
                <small>{formatTimestamp(interaction.timestamp)}</small>
              </div>

              {expandedRow === index && (
                <pre style={preStyle}>
                  {JSON.stringify(interaction.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Styles
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
  cursor: 'pointer',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '10px',
};

const logoStyle: React.CSSProperties = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
};

const summaryStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'lightgray',
};

const rowStyle: React.CSSProperties = {
  margin: '10px 0',
  padding: '5px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
};

const rowHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  cursor: 'pointer',
};

const preStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  padding: '5px',
  borderRadius: '4px',
  overflowX: 'auto',
};