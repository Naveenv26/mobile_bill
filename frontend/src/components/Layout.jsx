// frontend/src/components/Layout.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { 
    LayoutDashboard, 
    ReceiptText, 
    BarChart3, 
    Package, 
    Settings, 
    LogOut, 
    Star,
    Zap
} from "lucide-react";
import api from "../api/axios";
import { logout as authLogout } from "../api/auth";
import { useSubscription } from "../context/SubscriptionContext";

export default function Layout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [shopData, setShopData] = useState(null);
    const [shopName, setShopName] = useState("Loading...");

    // --- Access Subscription & Feature Flags ---
    const {
        isSubscribed,
        openModal,
        subscription,
        loading: isSubscriptionLoading,
        // hasFeature is no longer needed for the menu logic
    } = useSubscription();

    const logout = () => {
        authLogout();
        navigate("/login");
    };

    // --- Centralized Shop Data Fetching ---
    const fetchShopData = () => {
        const cached = localStorage.getItem("shop");
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setShopData(parsed);
                setShopName(parsed.name || "My Shop");
            } catch (e) {
                console.error("Error parsing shop data", e);
            }
        }

        api.get("/me/")
            .then((res) => {
                const { user, shop } = res.data;
                if (shop) {
                    setShopData(shop);
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
    };

    useEffect(() => {
        fetchShopData();
        const handleShopUpdate = () => fetchShopData();
        window.addEventListener('shop-updated', handleShopUpdate);
        return () => window.removeEventListener('shop-updated', handleShopUpdate);
    }, [navigate]);

    // --- Navigation Configuration ---
    // FIX: Removed 'feature' keys so they are treated as public links
    const links = [
        { name: "Home", path: "/dashboard", icon: LayoutDashboard },
        { name: "Bill", path: "/billing", icon: ReceiptText },
        { name: "Reports", path: "/reports", icon: BarChart3 },
        { name: "Stock", path: "/stock", icon: Package },
        { name: "Settings", path: "/settings", icon: Settings },
    ];

    // --- Navbar Badge ---
    const getSubscriptionStatusButton = () => {
        if (isSubscriptionLoading) return null;
        
        let text, icon, style;
        const baseStyle = "ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wide cursor-pointer transition-all duration-200";

        if (subscription?.is_trial && subscription?.days_remaining > 0) {
            text = `${subscription.days_remaining} Days Left`;
            icon = <Star className="w-3 h-3" />;
            style = "bg-amber-100 text-amber-700 hover:bg-amber-200";
        } else if (isSubscribed) {
            text = "Active";
            icon = <Zap className="w-3 h-3" />;
            style = "bg-indigo-100 text-indigo-700 hover:bg-indigo-200";
        } else {
            text = "Expired / Upgrade";
            icon = <Zap className="w-3 h-3" />;
            style = "bg-rose-100 text-rose-700 hover:bg-rose-200 animate-pulse";
        }
        
        return (
            <button onClick={openModal} className={`${baseStyle} ${style}`}>
                {icon}{text}
            </button>
        );
    };

    // --- Desktop Sidebar Nav Item ---
    const DesktopNavItem = ({ link }) => {
        const Icon = link.icon;
        return (
            <NavLink
                to={link.path}
                end={link.path === "/dashboard"}
                className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`
                }
            >
                <Icon className="w-5 h-5 mr-3" />
                {link.name}
            </NavLink>
        );
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            
            {/* --- Top Bar (Mobile Fix) --- */}
            <div className="fixed top-0 left-0 right-0 h-[0.5cm] bg-black z-[100] lg:hidden"></div>

            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-72 bg-slate-900 text-white border-r border-slate-800">
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg overflow-hidden">
                            {shopData?.logo ? (
                                <img src={shopData.logo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-lg font-bold text-white">{shopName.charAt(0)}</span>
                            )}
                        </div>
                        <div className="overflow-hidden">
                            <h1 className="font-bold text-lg truncate leading-tight">{shopName}</h1>
                            <p className="text-xs text-slate-400">Business Account</p>
                        </div>
                    </div>
                </div>

                {/* FIX: Removed .filter() here so links always render */}
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {links.map((link) => (
                        <DesktopNavItem key={link.path} link={link} />
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={logout} className="flex items-center w-full px-4 py-3 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-colors text-sm font-medium">
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout Session
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full relative">
                
                <header className="bg-white border-b border-slate-200 h-16 px-4 sm:px-8 flex items-center justify-between shrink-0 z-20 mt-[0.5cm] lg:mt-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            SmartBill
                        </h2>
                        {getSubscriptionStatusButton()}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-slate-800 max-w-[120px] truncate">{shopName}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Owner</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden">
                                {shopData?.logo ? (
                                    <img src={shopData.logo} alt={shopName} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <span className="text-sm font-bold text-indigo-600">{shopName.charAt(0)}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Scrollable Area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 pb-24 lg:pb-6 p-4 sm:p-6">
                    {children}
                </main>

                {/* Bottom Navigation (Mobile Only) */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 z-50 pb-safe">
                    <div className="flex items-center justify-between">
                        {/* FIX: Removed .filter() here as well */}
                        {links.map((link) => {
                                const Icon = link.icon;
                                const isActive = location.pathname === link.path || (link.path !== "/dashboard" && location.pathname.startsWith(link.path));
                                
                                return (
                                    <NavLink
                                        key={link.path}
                                        to={link.path}
                                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ${
                                            isActive ? "text-indigo-600 -translate-y-1" : "text-slate-400 hover:text-slate-600"
                                        }`}
                                    >
                                        <div className={`relative ${isActive ? "bg-indigo-50 p-1.5 rounded-xl" : ""}`}>
                                            <Icon strokeWidth={isActive ? 2.5 : 2} className="w-6 h-6 transition-all" />
                                            {isActive && <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white -mt-0.5 -mr-0.5"></span>}
                                        </div>
                                        <span className={`text-[10px] font-medium ${isActive ? "text-indigo-600" : "text-slate-400"}`}>
                                            {link.name}
                                        </span>
                                    </NavLink>
                                );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
