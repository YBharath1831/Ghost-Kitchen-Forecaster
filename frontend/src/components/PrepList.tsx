
import React from 'react';

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
  return (
    <section className="prep-card">
      <div className="card-header">
        <h2>Raw ingredient prep list</h2>
        <p>Converted directly from the forecasted menu item demand.</p>
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
