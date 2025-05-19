import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', picked: 120, shipped: 100, delivered: 90 },
  { name: 'Feb', picked: 140, shipped: 110, delivered: 95 },
  { name: 'Mar', picked: 160, shipped: 130, delivered: 100 },
];

const topProducts = [
  { name: 'Product A', stock: 120 },
  { name: 'Product B', stock: 90 },
  { name: 'Product C', stock: 70 },
  { name: 'Product D', stock: 50 },
];

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[
          { label: 'Picked', value: 120, color: 'bg-blue-500' },
          { label: 'Shipped', value: 100, color: 'bg-yellow-500' },
          { label: 'Delivered', value: 90, color: 'bg-green-500' },
          { label: 'Invoice', value: 80, color: 'bg-purple-500' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl p-6 text-white shadow-md ${card.color}`}>
            <h2 className="text-xl font-semibold">{card.label}</h2>
            <p className="text-3xl font-bold mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts and Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="col-span-2 bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Monthly Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="picked" fill="#3B82F6" />
              <Bar dataKey="shipped" fill="#FBBF24" />
              <Bar dataKey="delivered" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Products</h2>
          <ul className="space-y-3">
            {topProducts.map((product, index) => (
              <li key={index} className="flex justify-between text-gray-700">
                <span>{product.name}</span>
                <span className="font-semibold">{product.stock}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;
