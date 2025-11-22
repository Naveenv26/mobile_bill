import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import { toast } from "react-hot-toast";

// --- Sub-Components ---
import ProfileSettings from "./settings/ProfileSettings";
import InvoiceSettings from "./settings/InvoiceSettings";
import InventorySettings from "./settings/InventorySettings";
// Removed UserSettings import
import TaxSettings from "./settings/TaxSettings";
import NotificationSettings from "./settings/NotificationSettings";
import CustomerSettings from "./settings/CustomerSettings";
import FeedbackSettings from "./settings/FeedbackSettings";

// --- ICONS ---
const Icons = {
  Profile: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Invoice: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Inventory: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  // Removed Users Icon
  Tax: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Report: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Customer: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Feedback: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  ChevronRight: () => <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
  ArrowLeft: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState(null);
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const fetchShopData = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/me/");
      setShopData(res.data.shop);
      localStorage.setItem("shop", JSON.stringify(res.data.shop));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile && !activeTab) setActiveTab("profile");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab]);

  // --- UPDATE FUNCTION ---
  const updateSettings = async (category, newData) => {
    if (!shopData) return;

    const currentConfig = shopData.config || {};
    const updatedConfig = { 
        ...currentConfig, 
        [category]: { ...(currentConfig[category] || {}), ...newData } 
    };

    try {
      await axios.patch(`/shops/${shopData.id}/`, { config: updatedConfig });
      const newShopData = { ...shopData, config: updatedConfig };
      setShopData(newShopData);
      localStorage.setItem("shop", JSON.stringify(newShopData));
      toast.success("Settings saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings.");
    }
  };

  const renderContent = () => {
    if (loading && !shopData) return <div className="p-10 text-center">Loading settings...</div>;
    
    const config = shopData?.config || {};

    switch (activeTab) {
      case "profile": 
        return <ProfileSettings shop={shopData} />;
      case "invoice": 
        return <InvoiceSettings settings={config.invoice || {}} onUpdate={(d) => updateSettings('invoice', d)} />;
      case "inventory": 
        return <InventorySettings settings={config.inventory || {}} onUpdate={(d) => updateSettings('inventory', d)} />;
      // Removed case "users"
      case "tax": 
        return <TaxSettings settings={config.tax || {}} onUpdate={(d) => updateSettings('tax', d)} />;
      case "reports": 
        return <NotificationSettings settings={config.notifications || {}} onUpdate={(d) => updateSettings('notifications', d)} />;
      case "customers": 
        return <CustomerSettings settings={config.customer || {}} onUpdate={(d) => updateSettings('customer', d)} />;
      case "feedback": 
        return <FeedbackSettings />;
      default: return null;
    }
  };

  const tabs = [
    { id: "profile", label: "Shop Profile", desc: "Name, Address, Logo", icon: <Icons.Profile /> },
    { id: "invoice", label: "Invoice & Billing", desc: "Print size, Prefixes", icon: <Icons.Invoice /> },
    { id: "inventory", label: "Inventory Rules", desc: "Units, Thresholds", icon: <Icons.Inventory /> },
    // Removed Users Tab
    { id: "tax", label: "Tax & Currency", desc: "GST, Symbols", icon: <Icons.Tax /> },
    { id: "reports", label: "Daily Reports", desc: "Email summaries", icon: <Icons.Report /> },
    { id: "customers", label: "Customers", desc: "Defaults, Credits", icon: <Icons.Customer /> },
    { id: "feedback", label: "Feedback", desc: "Rate us", icon: <Icons.Feedback /> },
  ];

  if (isMobile && !activeTab) {
     return (
        <div className="min-h-screen bg-slate-50">
          <div className="bg-white px-4 py-4 border-b border-slate-200 sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          </div>
          <div className="divide-y divide-slate-100 bg-white mt-2 border-t border-b border-slate-200">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 text-left">
                <div className="flex items-center gap-4">
                  <div className="text-slate-500">{tab.icon}</div>
                  <div>
                    <div className="text-base font-medium text-slate-900">{tab.label}</div>
                    <div className="text-xs text-slate-500">{tab.desc}</div>
                  </div>
                </div>
                <Icons.ChevronRight />
              </button>
            ))}
          </div>
        </div>
     );
  }

  if (isMobile && activeTab) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="bg-white px-4 py-3 border-b border-slate-200 sticky top-0 z-20 flex items-center gap-3 shadow-sm">
              <button onClick={() => setActiveTab(null)} className="p-1 -ml-2 rounded-full hover:bg-slate-100 text-slate-600"><Icons.ArrowLeft /></button>
              <h2 className="text-lg font-bold text-slate-900 truncate">{tabs.find(t => t.id === activeTab)?.label}</h2>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">{renderContent()}</div>
          </div>
      );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 font-sans text-slate-800">
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h2>
            <p className="text-xs text-slate-500 mt-1">Manage your workspace</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-sky-50 text-sky-700 border border-sky-100 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={`mr-3 ${activeTab === tab.id ? "text-sky-500" : "text-slate-400"}`}>
                {tab.icon}
              </span>
              <div className="text-left">
                <div>{tab.label}</div>
              </div>
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-10">
        <div className="max-w-3xl mx-auto">
            <div className="mb-8 pb-4 border-b border-slate-200">
                <h1 className="text-3xl font-bold text-slate-900">{tabs.find(t => t.id === activeTab)?.label}</h1>
                <p className="text-slate-500 mt-1">{tabs.find(t => t.id === activeTab)?.desc}</p>
            </div>
            {renderContent()}
        </div>
      </main>
    </div>
  );
}