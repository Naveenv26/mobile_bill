// frontend/src/components/Layout.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  ReceiptText, 
  BarChart3, 
  Package, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Star,
  Zap
} from "lucide-react";
import api from "../api/axios";
import { logout as authLogout } from "../api/auth";
import { useSubscription } from "../context/SubscriptionContext";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shopName, setShopName] = useState("Loading...");

  // --- Access Subscription Modal controls ---
  const {
    isSubscribed,
    openModal,
    subscription,
    loading: isSubscriptionLoading,
  } = useSubscription();

  // --- Logout Function ---
  const logout = () => {
    authLogout();
  };

  // --- Fetch User and Shop Info ---
  useEffect(() => {
    api
      .get("/me/")
      .then((res) => {
        const { user, shop } = res.data;
        if (shop) {
          setShopName(shop.name);
          localStorage.setItem("shop", JSON.stringify(shop));
        } else if (user.role === "SHOP_OWNER" || user.role === "SHOPKEEPER") {
          navigate("/setup-shop");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch user data:", err);
        if (err.response && err.response.status === 401) {
          logout();
        }
      });
  }, [navigate]);

  // --- Sidebar Links ---
  const links = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Billing", path: "/billing", icon: ReceiptText },
    { name: "Reports", path: "/reports", icon: BarChart3 },
    { name: "Stock", path: "/stock", icon: Package },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  // --- Navbar Badge ---
  const getTrialBadgeForNav = () => {
    if (isSubscriptionLoading) return null;
    let text, icon, style;
    
    const baseStyle = "ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1";

    if (subscription?.is_trial && subscription?.days_remaining > 0) {
      text = `${subscription.days_remaining} Day Trial`;
      icon = <Star className="w-3 h-3" />;
      style = "bg-green-100 text-green-800";
    } else if (isSubscribed) {
      text = subscription?.plan_type || "Active";
      icon = <Zap className="w-3 h-3" />;
      style = "bg-white/20 text-white";
    } else {
      text = "Trial Expired";
      icon = <X className="w-3 h-3" />;
      style = "bg-red-200 text-red-800";
    }
    
    return <span className={`${baseStyle} ${style}`}>{icon}{text}</span>;
  };

  // --- NavLink Component ---
  const NavItem = ({ link }) => {
    const Icon = link.icon;
    return (
      <NavLink
        to={link.path}
        end={link.path === "/dashboard"} // Exact match for Dashboard
        className={({ isActive }) =>
          `flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition rounded-lg ${
            isActive
              ? "bg-indigo-600 text-white shadow-inner"
              : ""
          }`
        }
        onClick={() => setSidebarOpen(false)}
      >
        <Icon className="w-5 h-5 mr-3" />
        {link.name}
      </NavLink>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* --- Sidebar Overlay (Mobile) --- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* --- Sidebar --- */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-gray-300 z-40 transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 flex flex-col`}
      >
        {/* --- Header / Shop Name --- */}
        <div className="px-5 py-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <span
              className="font-bold text-lg text-white truncate"
              title={shopName}
            >
              {shopName}
            </span>
            {/* Close on mobile */}
            <button
              className="lg:hidden text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* --- Navigation Links --- */}
        <nav className="flex-1 mt-4 space-y-1 px-4">
          {links.map((link) => (
            <NavItem key={link.path} link={link} />
          ))}
        </nav>

        {/* --- Footer --- */}
        <div className="px-4 py-4 border-t border-gray-700/50">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-red-400 hover:bg-red-900/50 hover:text-red-300 rounded-lg transition"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col transition-all duration-300 lg:ml-64">
        {/* --- Top Navbar --- */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* --- Hamburger Menu --- */}
            <button
              className="text-gray-600 lg:hidden focus:outline-none"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
              SmartBill
            </h1>
          </div>

          {/* --- Subscription Button --- */}
          <div>
            <button
              onClick={openModal}
              className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-all shadow-md
                ${
                  isSubscribed && !subscription?.is_trial
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                    : "bg-gray-700 text-white hover:bg-gray-800"
                }
              `}
            >
              <Star className="w-4 h-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">
                {!isSubscribed && !subscription?.is_trial
                  ? "Upgrade Plan"
                  : "Subscription"}
              </span>
              {getTrialBadgeForNav()}
            </button>
          </div>
        </header>

        {/* --- Page Content --- */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}