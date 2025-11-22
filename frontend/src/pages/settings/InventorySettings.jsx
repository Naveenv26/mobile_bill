import React, { useState } from "react";

export default function InventorySettings({ settings, onUpdate }) {
  const [lowStockLimit, setLowStockLimit] = useState(settings?.lowStockLimit ?? 5);
  const [allowNegative, setAllowNegative] = useState(settings?.allowNegative ?? false);
  const [units, setUnits] = useState(settings?.units || ["Pcs", "Kg", "Ltr", "Box", "Pack"]);
  const [newUnit, setNewUnit] = useState("");
  const [isAddingUnit, setIsAddingUnit] = useState(false);

  const handleSave = () => {
    onUpdate({
      lowStockLimit: Number(lowStockLimit),
      allowNegative,
      units
    });
  };

  const addUnit = () => {
    if (newUnit && !units.includes(newUnit)) {
      setUnits([...units, newUnit]);
      setNewUnit("");
      setIsAddingUnit(false);
    }
  };

  const removeUnit = (unitToRemove) => {
    setUnits(units.filter(u => u !== unitToRemove));
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Global Low Stock Threshold</h3>
          <p className="text-sm text-slate-500">Default value for new products alert</p>
        </div>
        <div className="w-24">
            <input 
              type="number" 
              value={lowStockLimit} 
              onChange={(e) => setLowStockLimit(e.target.value)}
              className="w-full text-center border-slate-200 rounded-lg p-2 bg-slate-50 focus:ring-sky-400" 
            />
        </div>
      </div>
      <hr className="border-slate-100" />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Negative Stock Billing</h3>
          <p className="text-sm text-slate-500">Allow billing items even if quantity is 0?</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={allowNegative} 
            onChange={() => setAllowNegative(!allowNegative)} 
            className="sr-only peer" 
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-sky-500 transition-all"></div>
        </label>
      </div>
      <hr className="border-slate-100" />
      <div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Unit Management</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {units.map(u => (
                <span key={u} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm border border-slate-200 flex items-center gap-2">
                    {u} <button onClick={() => removeUnit(u)} className="text-slate-400 hover:text-rose-500">×</button>
                </span>
            ))}
            {!isAddingUnit ? (
              <button onClick={() => setIsAddingUnit(true)} className="px-3 py-1 bg-sky-50 text-sky-600 rounded-lg text-sm border border-sky-200 hover:bg-sky-100">+ Add</button>
            ) : (
              <div className="flex items-center gap-2">
                <input type="text" autoFocus value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="w-20 px-2 py-1 text-sm border border-sky-300 rounded-lg outline-none" placeholder="Unit"/>
                <button onClick={addUnit} className="text-xs bg-sky-500 text-white px-2 py-1 rounded">OK</button>
                <button onClick={() => setIsAddingUnit(false)} className="text-xs text-slate-400 px-1">Cancel</button>
              </div>
            )}
          </div>
      </div>
      <div className="flex justify-end pt-4 border-t border-slate-50">
        <button onClick={handleSave} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">Update Rules</button>
      </div>
    </div>
  );
}