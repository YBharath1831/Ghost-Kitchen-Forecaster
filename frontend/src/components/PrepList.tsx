import React, { useState } from 'react';

const ingredientPalette = ['#f97316', '#eab308', '#14b8a6', '#60a5fa', '#f43f5e', '#a78bfa'];

function formatQuantity(quantity: number) {
  return quantity % 1 === 0 ? quantity.toFixed(0) : quantity.toFixed(2);
}

interface PrepListProps {
  ingredientRows: {
    ingredient: string;
    quantity: number;
    unit: string;
  }[];
}

const PrepList: React.FC<PrepListProps> = ({ ingredientRows }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (ingredientRows.length === 0) return;

    const textToCopy = "Ghost Kitchen Prep Sheet:\n" +
      ingredientRows.map(row => `- ${row.ingredient}: ${formatQuantity(row.quantity)} ${row.unit}`).join('\n');

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy prep list: ', err);
      });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="prep-card">
      <div className="card-header prep-header">
        <div>
          <h2>Raw ingredient prep list</h2>
          <p>Converted directly from the forecasted menu item demand.</p>
        </div>
        {ingredientRows.length > 0 && (
          <div className="prep-actions">
            <button className="action-button" onClick={handleCopy}>
              {copied ? '✓ Copied' : '📋 Copy list'}
            </button>
            <button className="action-button" onClick={handlePrint}>
              🖨️ Print sheet
            </button>
          </div>
        )}
      </div>

      {ingredientRows.length > 0 ? (
        <div className="prep-grid">
          {ingredientRows.map((item, index) => (
            <article key={item.ingredient} className="prep-item">
              <span
                className="prep-dot"
                style={{ backgroundColor: ingredientPalette[index % ingredientPalette.length] }}
              />
              <div>
                <h3>{item.ingredient}</h3>
                <p>
                  {formatQuantity(item.quantity)} {item.unit}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="prep-empty">
          <p>The backend will populate ingredient prep here. Start the API to see live totals.</p>
        </div>
      )}
    </section>
  );
};

export default PrepList;
